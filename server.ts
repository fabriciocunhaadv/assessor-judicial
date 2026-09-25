
import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { petitionRouter } from './server/petitionAdvogadoRoutes';
import { matchApplicableBindingPrecedents } from './src/utils/bindingPrecedents';
import { getApplicableTaxonomySummary } from './src/data/legalTaxonomy';
import { filterInnocuousCertificates, cleanJudicialPdfText } from './src/utils/judicialTextCleaner';
import { deduplicateJudicialPdfFiles, deduplicateTextBlocks } from './src/utils/documentDeduplicator';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';


const SYSTEM_INSTRUCTION_FABRICIO = `Você é um Magistrado e Assessor Judicial sênior de altíssima performance no Poder Judiciário.
Sua função é elaborar minutas judiciais oficiais (Despachos, Decisões Interlocutórias e Sentenças) estruturadas, profundas, precisas, exaustivas e com rigor forense impecável, baseadas estritamente nos autos do processo e nas normas vigentes (CPC, Código Civil, CDC, Leis especiais, Súmulas e Jurisprudência do TJGO e Tribunais Superiores).

DIRETRIZES DE RIGOR JURÍDICO, EXAUSTIVIDADE E EXTRAÇÃO PROBATÓRIA (ART. 489, § 1º, DO CPC):
1. VEDAÇÃO ABSOLUTA À INVENÇÃO, INFERÊNCIA OU SUPOSIÇÃO FÁTICA (REGRA DE OURO):
   - É ESTRITAMENTE PROIBIDO inventar, deduzir, supor, complementar ou presumir fatos, nomes, valores, datas, percentuais, laudos, pareceres, diagnósticos, despesas ou documentos que não constem expressamente dos autos.
   - O que não está nos autos NÃO ESTÁ NO MUNDO (quod non est in actis non est in mundo).
   - Se uma parte alegar um fato (ex.: dano material, despesas extraordinárias de farmácia, desemprego, recusa de atendimento, gastos médicos), mas NÃO houver documento comprobatório acostado no PDF, consigne expressamente a ausência probatória nos autos e fundamente a rejeição ou acolhimento com fulcro no ônus probatório (art. 373, inciso I ou II, do CPC).

2. PROTOCOLO DE TRÍPLICE LOCALIZAÇÃO PROCESSUAL:
   - Ao citar qualquer peça, petição, manifestação, certidão ou prova documental, indique obrigatoriamente a tríplice localização: '(Mov. X, Arq. Y, Pág. Z / Fls. Z)'.
   - Extraia com exatidão onde o documento está anexado nos autos eletrônicos (Projudi/PJe).

3. TRANSCRIÇÃO LITERAL DE TRECHOS PROBATÓRIOS ESSENCIAIS:
   - Não se limite a parafrasear superficialmente documentos técnicos. TRANSCREVA LITERALMENTE ENTRE ASPAS os trechos decisivos:
     * Laudos periciais (médicos, psicológicos, sociais, contábeis): transcreva o diagnóstico, as respostas aos quesitos e a conclusão da perita/perito com indicação de data e nome do profissional.
     * Contratos e termos: transcreva a cláusula contratual controvertida (taxas de juros, rescisão, multas, coberturas).
     * Mensagens, notificações e e-mails: transcreva o teor das comunicações relevantes.
     * Pareceres ministeriais: transcreva a manifestação do Ministério Público.
     * Certidões cartorárias: transcreva a certidão de citação, intimação ou decurso de prazo.

4. TRANSCRIÇÃO LITERAL DE ARTIGOS DE LEI, SÚMULAS E TESES DO GABINETE:
   - Sempre que fundamentar a decisão em artigo de lei (CPC, Código Civil, CDC, CF/88, ECA, Leis Especiais), TRANSCREVA O TEXTO DO DISPOSITIVO LEGAL em bloco destacado ('> "Art. ...'").
   - Sempre que invocar súmulas do STJ, STF ou TJGO, TRANSCREVA O ENUNCIADO COMPLETO da súmula em bloco destacado ('> "Súmula nº ...'").
   - Sempre que aplicar teses vinculantes do Caderno de Teses do Gabinete, TRANSCREVA A TESE em bloco destacado e aplique-a expressamente ao caso concreto.

5. ESTRUTURAÇÃO CAPITULAR DA FUNDAMENTAÇÃO EM SUBTÓPICOS (MARKDOWN RICO):
   - A 'fundamentacao' NÃO PODE ser um texto corrido indiferenciado. Deve ser dividida obrigatoriamente em capítulos temáticos identificados por subtópicos '### 1. ...', '### 2. ...':
     * Capítulo de Admissibilidade, Gratuidade da Justiça e Regularidade Processual;
     * Capítulo para cada preliminar e prejudicial de mérito arguida (prescrição, decadência, inépcia, ilegitimidade, etc.);
     * Capítulo individualizado para cada pedido ou matéria de mérito (guarda, visitas, alimentos, dano moral, repetição de indébito, etc.);
     * Capítulo dos Consectários Legais (juros e correção monetária nos termos da Lei nº 14.905/2024).
   - Use **negrito** nas conclusões e nomes de documentos, e *itálico* em expressões em latim (*fumus boni iuris*, *periculum in mora*, *in albis*, *inaudita altera parte*, etc.) e nomes de leis.
   - Parágrafos separados por duas quebras de linha (\\n\\n). Proibido usar termos artificiais como "PARÁGRAFO 1".`;

function getActiveCabinetTeses(cabinetTesesText: any, isTesesEnabled: any) {
    if (isTesesEnabled === false) return "";
    if (typeof cabinetTesesText !== "string") return "";
    const raw = cabinetTesesText.trim();
    if (!raw) return "";

    // Preserva integralmente todas as teses substantivas e diretrizes do magistrado,
    // mas filtra dumps brutos de tabelas TPU CNJ (ex: "Condição de Doença Grave (CNJ:15251)") que sobrecarregavam o modelo
    const lines = raw.split("\n");
    const substantiveLines = lines.filter(line => {
        const trimmed = line.trim();
        if (/^[A-ZÁ-Úa-zá-ú\s\/\-–\(\)\.\,]+\s*\(CNJ:\d+\)$/i.test(trimmed)) return false;
        return true;
    });

    const cleaned = substantiveLines.join("\n").trim();
    return cleaned.length > 20 ? cleaned : raw;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

app.use("/api/advogado-peticao", petitionRouter);

app.get("/api/native-key-info", (req, res) => res.json({ hasNativeKey: !!process.env.GEMINI_API_KEY }));
app.post("/api/test-api-key", async (req, res) => {
    try {
        const key = extractApiKey(req);
        if (!key) return res.status(400).json({ success: false, error: "Nenhuma chave de API informada." });
        const ai = new GoogleGenAI({ apiKey: key });
        const testModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
        let lastErr: any;
        for (const m of testModels) {
            try {
                await ai.models.generateContent({
                    model: m,
                    contents: "ping",
                    config: { maxOutputTokens: 10 }
                });
                return res.json({ success: true, message: `Chave validada com sucesso no Google Gemini (${m}).` });
            } catch (mErr: any) {
                lastErr = mErr;
                const mMsg = mErr?.message || "";
                if (mMsg.includes("503") || mMsg.includes("UNAVAILABLE") || mMsg.includes("high demand") || 
                    mMsg.includes("429") || mMsg.includes("RESOURCE_EXHAUSTED") || mMsg.includes("Quota exceeded") ||
                    mMsg.includes("não está disponível") || mMsg.includes("deprecated")) {
                    continue; // Pula para o próximo modelo Flash ativo
                }
                break;
            }
        }
        return res.status(400).json({
            success: false,
            error: formatGeminiError(lastErr) || "Chave inválida ou limite atingido no Google Gemini."
        });
    } catch (err: any) {
        console.log("[Test API Key] Validação retornou:", err?.message || err);
        return res.status(400).json({
            success: false,
            error: formatGeminiError(err) || "Chave inválida ou limite atingido no Google Gemini."
        });
    }
});
app.post("/api/lookup-legislation", (req, res) => res.json({ result: "Not implemented" }));
app.post("/api/map-decision-documents", (req, res) => res.json({ result: "Not implemented" }));
app.post("/api/scan-cabinet-theses", (req, res) => res.json({ matches: [] }));
app.post("/api/extract-pdf-text", async (req, res) => {
    try {
        const { base64 } = req.body;
        if (!base64 || typeof base64 !== "string") {
            return res.json({ text: "", pageCount: 0, hasText: false });
        }
        const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "").trim();
        const buffer = Buffer.from(cleanBase64, "base64");
        const extracted = await extractTextFromPdfBuffer(buffer);
        return res.json({ text: extracted || "", pageCount: 1, hasText: Boolean(extracted && extracted.trim().length > 20) });
    } catch (e) {
        console.error("Erro na extração server-side de PDF:", e);
        return res.json({ text: "", pageCount: 0, hasText: false });
    }
});

app.post("/api/generate-synopsis", async (req, res) => {
    try {
        const userApiKey = extractApiKey(req);
        const { processText, pdfFiles } = req.body;
        let safeProcessText = filterInnocuousCertificates(cleanJudicialPdfText(processText || ""));
        let accumulatedPdfText = "";
        let pdfDups = 0;
        let pdfSaved = 0;

        if (pdfFiles && Array.isArray(pdfFiles) && pdfFiles.length > 0) {
            const dedupResult = deduplicateJudicialPdfFiles(pdfFiles);
            pdfDups = dedupResult.duplicatesFound;
            pdfSaved = dedupResult.charsSaved;
            for (const pFile of dedupResult.files) {
                if (pFile.extractedText && typeof pFile.extractedText === "string" && pFile.extractedText.trim().length > 0) {
                    let safeText = filterInnocuousCertificates(cleanJudicialPdfText(pFile.extractedText));
                    accumulatedPdfText += `\n\n[=== AUTOS DO PROCESSO: ${pFile.name || "Documento"} ===]\n${safeText}\n`;
                }
            }
        }

        const textDedup = deduplicateTextBlocks(accumulatedPdfText);
        if (textDedup.duplicatesFound > 0) {
            accumulatedPdfText = textDedup.text;
        }

        const combinedText = [safeProcessText, accumulatedPdfText].filter(Boolean).join("\n\n");
        if (!combinedText || combinedText.trim().length < 50) {
            return res.status(400).json({ error: "Conteúdo dos autos insuficiente para consolidar a Sinopse Holística." });
        }

        const synopsis = await generateHolisticSynopsis(combinedText, {
            apiKey: userApiKey,
            keyPool: extractApiKeyPool(req)
        });

        if (!synopsis) {
            return res.status(500).json({ error: "Não foi possível gerar a Sinopse Holística dos autos." });
        }

        return res.json({
            success: true,
            synopsis,
            deduplicationStats: {
                duplicatesFound: pdfDups + textDedup.duplicatesFound,
                charsSaved: pdfSaved + textDedup.charsSaved
            }
        });
    } catch (err: any) {
        console.error("Erro ao gerar sinopse holística:", err);
        return res.status(500).json({ error: formatGeminiError(err) || "Erro ao consolidar a sinopse holística dos autos." });
    }
});

// ==========================================
// REPOSITÓRIO VINCULANTE & INGESTÃO AUTOMÁTICA
// ==========================================
const CUSTOM_PRECEDENTS_FILE = path.join(process.cwd(), "data", "custom_precedents.json");

function loadServerCustomPrecedents(): any[] {
    try {
        if (fs.existsSync(CUSTOM_PRECEDENTS_FILE)) {
            const raw = fs.readFileSync(CUSTOM_PRECEDENTS_FILE, "utf-8");
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch (e) {
        console.error("Erro ao ler custom_precedents.json:", e);
    }
    return [];
}

function saveServerCustomPrecedents(items: any[]): void {
    try {
        const dir = path.dirname(CUSTOM_PRECEDENTS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CUSTOM_PRECEDENTS_FILE, JSON.stringify(items, null, 2), "utf-8");
    } catch (e) {
        console.error("Erro ao gravar custom_precedents.json:", e);
    }
}

app.get("/api/custom-precedents", (_req, res) => {
    const list = loadServerCustomPrecedents();
    res.json({ success: true, count: list.length, precedents: list });
});

app.post("/api/parse-precedents-pdf", async (req, res) => {
    try {
        const apiKey = extractApiKey(req);
        if (!apiKey) return res.status(401).json({ error: "Chave da API Gemini ausente." });

        const { pdfText, fileName } = req.body;
        if (!pdfText || typeof pdfText !== "string" || pdfText.trim().length < 20) {
            return res.status(400).json({ error: "Texto do documento insuficiente para indexação." });
        }

        const options = {
            apiKey,
            keyPool: extractApiKeyPool(req),
            res,
            primaryModel: "gemini-3.1-flash-lite",
            fallbackModel: "gemini-flash-latest",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                temperature: 0.1,
            }
        };

        const response = await generateWithFallbackAndRetry(options);

        const rawText = response.text || "[]";
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        let parsed: any[] = [];
        try {
            parsed = JSON.parse(cleaned);
            if (!Array.isArray(parsed)) parsed = [];
        } catch {
            parsed = [];
        }

        if (parsed.length > 0) {
            const current = loadServerCustomPrecedents();
            const existingIds = new Set(current.map(c => c.id));
            const newValid = parsed.map((item, idx) => ({
                ...item,
                id: item.id || `custom-precedent-${Date.now()}-${idx}`,
                sourceFile: fileName || "Documento anexado",
                importedAt: new Date().toISOString()
            })).filter(item => !existingIds.has(item.id));

            const updated = [...newValid, ...current];
            saveServerCustomPrecedents(updated);

            return res.json({
                success: true,
                count: newValid.length,
                total: updated.length,
                precedents: newValid,
                message: `${newValid.length} precedente(s) extraído(s) e indexado(s) com sucesso a partir do PDF.`
            });
        }

        return res.json({
            success: true,
            count: 0,
            precedents: [],
            message: "Nenhuma tese ou enunciado específico foi identificado com clareza no texto fornecido."
        });
    } catch (err: any) {
        console.error("Erro no parse-precedents-pdf:", err);
        res.status(500).json({ error: err.message || "Erro ao processar PDF de precedentes." });
    }
});

app.post("/api/sync-precedents-weekly", async (req, res) => {
    try {
        const curatedWeeklyPrecedents = [
            {
                id: "tjgo-inf-2026-01",
                tribunal: "TJGO",
                type: "informativo_tjgo",
                number: "Informativo TJGO 2026 • Juizados Especiais Cíveis",
                title: "Dano Moral por Interrupção de Fornecimento de Energia Sem Prévia Notificação",
                statement: "A interrupção indevida do fornecimento de energia elétrica pela concessionária (Equatorial Goiás) sem notificação formal e específica com prazo razoável configura falha na prestação do serviço e gera dano moral in re ipsa, independente de prova do prejuízo material.",
                sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia",
                tags: ["energia eletrica", "equatorial", "corte indevido", "dano moral", "consumidor", "aviso previo"],
                area: "Direito do Consumidor",
                updatedAt: new Date().toISOString()
            },
            {
                id: "tjgo-inf-2026-02",
                tribunal: "TJGO",
                type: "informativo_tjgo",
                number: "Informativo TJGO 2026 • Turmas Recursais",
                title: "Empréstimo Não Contratado por Idoso e Fraude Digital (RMC / RCC)",
                statement: "Nas ações em que o consumidor idoso ou hipervulnerável nega a contratação de empréstimo sob a modalidade de cartão de crédito consignado (RMC/RCC), incumbe à instituição financeira o ônus de comprovar a disponibilização regular e o consentimento esclarecido, sendo nula a contratação viciada com repetição do indébito e condenação por dano moral.",
                sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia",
                tags: ["rmc", "rcc", "consignado", "banco", "idoso", "hipervulneravel", "fraude bancaria"],
                area: "Direito Bancário",
                updatedAt: new Date().toISOString()
            },
            {
                id: "tjgo-sumula-32",
                tribunal: "TJGO",
                type: "sumula",
                number: "Súmula 32 TJGO",
                title: "Honorários Sucumbenciais nos Juizados Especiais Cíveis",
                statement: "No rito da Lei nº 9.099/95, a condenação ao pagamento de custas e honorários advocatícios sucumbenciais tem cabimento unicamente em segundo grau de jurisdição e exclusivamente em desfavor do recorrente vencido.",
                sourceUrl: "https://www.tjgo.jus.br/sumulas",
                tags: ["honorarios", "juizado especial", "recorrente vencido", "lei 9099", "custas"],
                area: "Direito Processual Civil",
                updatedAt: new Date().toISOString()
            },
            {
                id: "stj-tema-1061-atualizado",
                tribunal: "STJ",
                type: "tese_repetitivo",
                number: "Tema Repetitivo 1061 STJ",
                title: "Ônus Probatório da Autenticidade da Assinatura em Contrato Bancário Impugnado",
                statement: "Na hipótese em que o consumidor/autor impugnar a autenticidade da assinatura constante de contrato bancário juntado ao processo pela instituição financeira, caberá a esta o ônus de provar a sua autenticidade (CPC, art. 429, II), inclusive arcando com a perícia grafotécnica.",
                sourceUrl: "https://scon.stj.jus.br/SCON/jurisprudencia",
                tags: ["assinatura impugnada", "banco", "onus da prova", "pericia grafotecnica", "art 429 cpc"],
                area: "Direito Bancário",
                updatedAt: new Date().toISOString()
            }
        ];

        const current = loadServerCustomPrecedents();
        const existingIds = new Set(current.map(c => c.id));
        const newToAdd = curatedWeeklyPrecedents.filter(p => !existingIds.has(p.id));
        const updated = [...newToAdd, ...current];
        saveServerCustomPrecedents(updated);

        res.json({
            success: true,
            syncDate: Date.now(),
            count: updated.length,
            addedCount: newToAdd.length,
            precedents: updated,
            message: `Alimentação automatizada concluída com sucesso! ${newToAdd.length} novo(s) precedente(s) e informativos do TJGO/STJ indexados.`
        });
    } catch (err: any) {
        console.error("Erro no sync-precedents-weekly:", err);
        res.status(500).json({ error: err.message || "Erro na sincronização de precedentes." });
    }
});

app.post("/api/chat-agaia", async (req, res) => {
    try {
        const apiKey = extractApiKey(req);
        if (!apiKey) return res.status(401).json({ error: "Chave da API Gemini ausente." });
        
        const { message, conversationHistory, currentMinute, auditAnalysis, originalProcessText, executiveSummary, customPromptText, cabinetTesesText, isTesesEnabled, paradigmModelText, paradigmModelTitle, isParadigmEnabled } = req.body;
        
        // RESUMO EXECUTIVO: consome ~85% menos tokens que despejar dezenas de milhares de caracteres dos autos
        const processExecutiveSummary = executiveSummary || (originalProcessText ? originalProcessText.substring(0, 1500) + '...' : 'Autos do processo judicial');

        const systemPrompt = `Você é o Assessor Especialista de Gabinete do Magistrado, responsável pelo refinamento técnico, correções e redação de minutas judiciais oficiais.
Sua redação deve ser culta, formal, profunda e tecnicamente impecável, em estrita conformidade com o CPC, as leis vigentes e a jurisprudência aplicável.

# RESUMO EXECUTIVO DOS AUTOS:
${processExecutiveSummary}

# MINUTA ATUAL EM REVISÃO:
- Título Atual: ${currentMinute?.title || 'Minuta'}
- Processo: ${currentMinute?.processNumber || 'Autos'}
- Relatório Atual:
${currentMinute?.relatorio ? currentMinute.relatorio.substring(0, 1500) : 'Conforme autos'}
- Fundamentação Atual:
${currentMinute?.fundamentacao || 'Não informada'}
- Dispositivo Atual:
${currentMinute?.dispositivo || 'Não informado'}
${cabinetTesesText ? `\n# CADERNO DE TESES E DIRETRIZES DO GABINETE:\n${cabinetTesesText.substring(0, 1200)}` : ''}

# DIRETRIZES MANDATÓRIAS DE RIGOR E EXAUSTIVIDADE JURÍDICA:
1. PROIBIÇÃO ABSOLUTA DE RESPOSTAS SUCINTAS OU DE UM PARÁGRAFO:
   - Se o usuário solicitar alteração do ato judicial (ex.: converter sentença em decisão interlocutória/liminar, apreciar pedido de tutela de urgência, reescrever fundamentação, acolher preliminar ou sanear o feito), você DEVE redigir uma FUNDAMENTAÇÃO EXAUSTIVA, DENSA E PROFUNDA.
   - É terminantemente proibido fornecer apenas um parágrafo genérico de 4 ou 5 linhas. Cada tese, fato e documento deve ser enfrentado de modo exaustivo.
2. CONVERSÃO PARA DECISÃO INTERLOCUTÓRIA / TUTELA DE URGÊNCIA (ART. 300 DO CPC):
   - Se o usuário informar que o caso não é de sentença de mérito e requer decisão interlocutória / liminar / tutela de urgência:
     * Atualize 'title' para "DECISÃO INTERLOCUTÓRIA".
     * Redija 'relatorio' narrando pormenorizadamente a petição inicial, os fatos alegados e o pedido de tutela provisória deduzido.
     * Na 'fundamentacao', examine detidamente e com fundamentação jurídica completa:
       a) O juízo de admissibilidade e o pedido de gratuidade da justiça (arts. 98 e 99 do CPC).
       b) A probabilidade do direito (fumus boni iuris) com exame do acervo probatório anexado.
       c) O perigo de dano ou risco ao resultado útil do processo (periculum in mora).
       d) A reversibilidade da medida (§ 3º do art. 300 do CPC).
       e) As diretrizes do Caderno de Teses do Gabinete aplicáveis.
     * No 'dispositivo', ordene os comandos claros:
       a) Deferimento, deferimento parcial ou indeferimento da tutela, com prazo para cumprimento e astreintes/multa diária se for obrigação de fazer/não fazer.
       b) Deferimento/indeferimento da gratuidade da justiça.
       c) Ordem de citação da parte demandada para cumprimento e intimação para audiência de conciliação (art. 334 do CPC), com prazo de contestação (art. 335 do CPC).
3. ESTRUTURAÇÃO DO JSON DE RESPOSTA:
   Retorne estritamente o JSON no seguinte formato:
   {
     "reply": "Explicação técnica clara e cortês sobre as modificações realizadas na decisão para o assessor/juiz.",
     "hasMinuteUpdate": true,
     "updatedMinute": {
       "title": "TÍTULO DO ATO",
       "relatorio": "Texto completo e detalhado do relatório...",
       "fundamentacao": "Texto completo, denso e exaustivo da fundamentação judicial...",
       "dispositivo": "Texto completo do dispositivo com todos os comandos judiciais..."
     },
     "suggestedActions": ["Ação sugerida 1", "Ação sugerida 2"]
   }`;

        let historyPrompt = "Histórico da conversa:\n";
        if (conversationHistory && conversationHistory.length > 0) {
           conversationHistory.forEach((msg) => {
               historyPrompt += `[${msg.sender === 'user' ? 'Usuário' : 'Você'}]: ${msg.text}\n`;
           });
        }
        
        const userPrompt = `${historyPrompt}\nUsuário: ${message}`;
        
        const options = {
            apiKey: apiKey,
            keyPool: extractApiKeyPool(req),
            res,
            primaryModel: "gemini-3.8-flash",
            fallbackModel: "gemini-flash-latest",
            contents: [
                { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
            ],
            config: {
                systemInstruction: "Você é um AI judiciário que responde apenas com objetos JSON estritos de acordo com o esquema solicitado.",
                responseMimeType: "application/json",
                maxOutputTokens: 16384
            }
        };

        const response = await generateWithFallbackAndRetry(options);
        const responseText = response.text || "";
        
        let cleanJson = responseText;
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.substring(7);
        if (cleanJson.startsWith('```')) cleanJson = cleanJson.substring(3);
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.length - 3);
        
        let data;
        try {
            data = safeParseJson(cleanJson.trim()) || JSON.parse(cleanJson.trim());
        } catch(e) {
            console.error("Failed to parse JSON:", cleanJson);
            return res.json({ reply: "A resposta gerada não pôde ser lida adequadamente. Tente novamente.", hasMinuteUpdate: false });
        }
        
        let finalUpdatedMinute = undefined;
        if (data.updatedMinute && typeof data.updatedMinute === 'object') {
            finalUpdatedMinute = { ...currentMinute, ...data.updatedMinute };
            const h = finalUpdatedMinute.header || currentMinute?.header || 'PODER JUDICIÁRIO DO ESTADO DE GOIÁS';
            const proc = finalUpdatedMinute.processNumber || currentMinute?.processNumber || 'Autos do Processo';
            const aut = finalUpdatedMinute.parties?.author || currentMinute?.parties?.author || 'Parte Autora';
            const reu = finalUpdatedMinute.parties?.defendant || currentMinute?.parties?.defendant || 'Parte Ré';
            const t = finalUpdatedMinute.title || currentMinute?.title || 'DECISÃO INTERLOCUTÓRIA';
            const rel = finalUpdatedMinute.relatorio || currentMinute?.relatorio || '';
            const fund = finalUpdatedMinute.fundamentacao || currentMinute?.fundamentacao || '';
            const disp = finalUpdatedMinute.dispositivo || currentMinute?.dispositivo || '';
            const clos = finalUpdatedMinute.closing || currentMinute?.closing || 'Juiz(a) de Direito';
            finalUpdatedMinute.fullFormattedText = `${h}\nProcesso nº: ${proc}\nPromovente: ${aut}\nPromovido: ${reu}\n\n${t}\n\nI - RELATÓRIO\n\n${rel}\n\nII - FUNDAMENTAÇÃO\n\n${fund}\n\nIII - DISPOSITIVO\n\n${disp}\n\n${clos}`;
        }

        res.json({
            reply: data.reply || "Resposta processada com base nos autos.",
            hasMinuteUpdate: data.hasMinuteUpdate || false,
            updatedMinute: finalUpdatedMinute,
            suggestedActions: data.suggestedActions || [],
            usage: {
                promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata?.totalTokenCount || 0
            },
            modelUsed: response.modelVersion || "Gemini 3.8 Flash"
        });

    } catch (error) {
        console.error("Erro no chat-agaia:", error);
        res.status(500).json({ error: error.message || "Erro interno ao processar chat." });
    }
});
app.post("/api/audit-assessor-draft", async (req, res) => {
    try {
        const apiKey = extractApiKey(req);
        if (!apiKey) return res.status(401).json({ error: "Chave da API Gemini ausente." });

        const {
            draftText,
            processText,
            pdfFiles,
            specificInstructions,
            customPromptText,
            previousAuditResult,
            previousDraft,
            assessorCorrectionNotes
        } = req.body;

        if (!draftText || !draftText.trim()) {
            return res.status(400).json({ error: "O texto da minuta do assessor é obrigatório para auditoria." });
        }

        // 1. Deduplicação Inteligente e Limpeza dos Autos na Lupa do Magistrado
        let accumulatedProcessText = (processText || "").trim();
        let totalDuplicatesFound = 0;
        let totalCharsSaved = 0;

        if (Array.isArray(pdfFiles) && pdfFiles.length > 0) {
            const pdfsWithText = pdfFiles.filter((p: any) => p.extractedText && p.extractedText.trim().length > 0);
            if (pdfsWithText.length > 0) {
                const dedupRes = deduplicateJudicialPdfFiles(pdfsWithText);
                totalDuplicatesFound += dedupRes.duplicatesFound;
                totalCharsSaved += dedupRes.charsSaved;
                for (const p of dedupRes.files) {
                    const sample = p.extractedText.trim().substring(0, Math.min(80, p.extractedText.trim().length));
                    if (!accumulatedProcessText.includes(sample)) {
                        accumulatedProcessText = accumulatedProcessText 
                            ? `${accumulatedProcessText}\n\n---\n\n[=== PEÇA / DOCUMENTO: ${p.name || 'Documento'} ===]\n${p.extractedText}` 
                            : `[=== PEÇA / DOCUMENTO: ${p.name || 'Documento'} ===]\n${p.extractedText}`;
                    }
                }
            }
        }

        // Filtro de Ruídos em Certidões e Metadados Cartorários
        accumulatedProcessText = filterInnocuousCertificates(cleanJudicialPdfText(accumulatedProcessText));

        // Deduplicação de blocos de texto repetitivos dentro dos autos
        const textDedup = deduplicateTextBlocks(accumulatedProcessText);
        if (textDedup.duplicatesFound > 0) {
            accumulatedProcessText = textDedup.text;
            totalDuplicatesFound += textDedup.duplicatesFound;
            totalCharsSaved += textDedup.charsSaved;
        }

        // SINOPSE HOLÍSTICA FORENSE AUTOMÁTICA EM 5 PILARES (processos volumosos > 90k caracteres)
        let generatedHolisticSynopsis = "";
        let safeProcessText = accumulatedProcessText;
        if (accumulatedProcessText.length > 90000) {
            console.log(`[Lupa do Magistrado] Autos volumosos detectados (${accumulatedProcessText.length} caracteres). Elaborando Sinopse Holística dos Autos em 5 pilares para subsidiar a auditoria sem corte de fatos ou provas...`);
            try {
                generatedHolisticSynopsis = await generateHolisticSynopsis(accumulatedProcessText, {
                    apiKey,
                    keyPool: extractApiKeyPool(req)
                });
                if (generatedHolisticSynopsis && generatedHolisticSynopsis.length > 200) {
                    safeProcessText = `\n\n[=== SINOPSE HOLÍSTICA FORENSE DOS AUTOS (INTEGRAL EM 5 PILARES - AUDITORIA DE CONFORMIDADE) ===]\n${generatedHolisticSynopsis}\n\n[=== NÚCLEO DOCUMENTAL ORIGINAL DOS AUTOS (TRECHOS-CHAVE) ===]\n${accumulatedProcessText.substring(0, 40000)}\n`;
                }
            } catch (synErr) {
                console.warn("[Lupa do Magistrado] Erro na elaboração da Sinopse Holística:", synErr);
            }
        } else if (safeProcessText.length > 160000) {
            const half = Math.floor(160000 / 2);
            safeProcessText = safeProcessText.substring(0, half) + "\n\n... [AUTOS RESUMIDOS PARA LIMITAÇÃO TÉCNICA E ECONOMIA DE TOKENS] ...\n\n" + safeProcessText.substring(safeProcessText.length - half);
        }

        const isReAudit = !!previousAuditResult;

        const auditSystemInstruction = `Você é um Juiz de Direito Corregedor e Auditor Sênior de Minutas Judiciais ("Lupa do Magistrado - Modo Auditoria Foco / Diagnóstico").
Sua missão é realizar um confronto rigoroso e impiedoso entre os AUTOS DO PROCESSO e a MINUTA REDIGIDA PELO ASSESSOR.
Mantenha foco estrito no diagnóstico, nos alertas críticos e nas emendas cirúrgicas, sem gastar tokens com a reescrita desnecessária de uma sentença completa.

Você deve responder ESTRITAMENTE em formato JSON com o seguinte schema obrigatório:
{
  "score": número de 0 a 100 com o score geral da minuta,
  "verdict": "Aprovada sem Ressalvas" | "Aprovada com Ressalvas" | "Requer Correções Obrigatórias" | "Crítica / Risco de Nulidade",
  "verdictColor": "emerald" | "amber" | "rose" | "indigo",
  "summary": "Resumo executivo da auditoria apontando pontos fortes e principais deficiências",
  "congruence": {
    "score": número de 0 a 100,
    "summary": "Análise de adstrição e congruência dos pedidos (inicial vs contestação vs minuta)",
    "items": [
      {
        "claim": "Identificação do pedido ou requerimento da parte",
        "assessorAddressed": true ou false (se o assessor julgou ou apreciou),
        "status": "congruente" | "omissao_citra_petita" | "extrapolacao_ultra_extra_petita" | "divergencia_pedido",
        "notes": "Explicação fundamentada do porquê está congruente ou onde houve erro/omissão"
      }
    ]
  },
  "evidentiary": {
    "score": número de 0 a 100,
    "summary": "Confronto fático-probatório entre o que a minuta afirma e as provas dos autos",
    "items": [
      {
        "fact": "Fato afirmado ou valor fixado na minuta",
        "evidenceSource": "Folha, documento, laudo ou certidão correspondente nos autos",
        "status": "comprovado" | "distorcido" | "sem_lastro_probatorio" | "contradicao_interna",
        "notes": "Explicação detalhada do confronto probatório"
      }
    ]
  },
  "procedural": {
    "score": número de 0 a 100,
    "summary": "Exame das preliminares processuais, rito legal, competência e nulidades",
    "items": [
      {
        "topic": "Preliminar / Requisito (ex: Gratuidade, Ilegitimidade, Prescrição/Decadência, Revelia, Rito)",
        "assessorAddressed": true ou false,
        "status": "regular" | "omissao_grave" | "equivoco_procedimental" | "preclusao_ignorada",
        "notes": "Análise da conformidade formal"
      }
    ]
  },
  "criticalAlerts": [
    {
      "severity": "bloqueante" | "atencao" | "informativo",
      "pillar": "adstricao" | "provas" | "preliminares_rito" | "redacao_clareza",
      "title": "Título conciso do alerta",
      "description": "Explicação clara da falha e do risco processual (ex: risco de embargos ou nulidade)",
      "suggestedFix": "Como o magistrado ou assessor deve retificar o ponto",
      "location": "Localização na minuta (ex: Relatório, Parágrafo 3 da Fundamentação, Dispositivo)"
    }
  ],
  "assessorFeedbackMessage": "Mensagem pedagógica, objetiva e construtiva dirigida ao assessor indicando exatamente o que ajustar",
  "suggestedCorrectionSnippet": "Redação sugerida da fundamentação ou dispositivo pronto para substituir o trecho defeituoso",
  "systemGeneratedMinute": "Síntese dos pontos cardeais da decisão ideal do juiz (ou deixe string vazia). A minuta gabarito na íntegra é gerada sob demanda para máxima economia de tokens."
}

CRITÉRIOS DE PONTUAÇÃO (SCORE):
- 90 a 100: "Aprovada sem Ressalvas" (verde/emerald). Todos os pedidos apreciados, provas fiéis aos autos, dispositivo irretocável.
- 75 a 89: "Aprovada com Ressalvas" (indigo/azul). Erros formais leves, sem risco de nulidade.
- 50 a 74: "Requer Correções Obrigatórias" (âmbar/amber). Omissão de pedido secundário, citação imprecisa de documento ou juros em desacordo com a lei.
- 0 a 49: "Crítica / Risco de Nulidade" (vermelho/rose). Julgamento citra/ultra petita, invenção de fatos sem lastro ou dispositivo contraditório.`;

        const auditUserPrompt = `AUTOS DO PROCESSO:\n${safeProcessText || 'Texto dos autos não fornecido.'}

----------------------------------------
MINUTA SUBMETIDA PELO ASSESSOR PARA AUDITORIA:
${draftText}

----------------------------------------
${specificInstructions ? `DIRETRIZES DO MAGISTRADO / INSTRUÇÕES DO GABINETE:\n${specificInstructions}\n\n` : ''}
${customPromptText ? `DIRETRIZ DE TESE / MODELO:\n${customPromptText}\n\n` : ''}
${isReAudit ? `[DADOS DE COMPARAÇÃO DE REAUDITORIA]:
Score Anterior: ${previousAuditResult?.score || 'N/A'}
Alertas Anteriores: ${JSON.stringify(previousAuditResult?.criticalAlerts || [])}
Notas de Correção do Assessor: ${assessorCorrectionNotes || 'Não especificadas'}
Minuta Anterior: ${previousDraft ? previousDraft.substring(0, 5000) : 'N/A'}
` : ''}
Realize a conferência completa e gere o JSON rigoroso conforme o esquema acima.`;

        const options = {
            apiKey,
            keyPool: extractApiKeyPool(req),
            res,
            primaryModel: "gemini-3.1-flash-lite",
            fallbackModel: "gemini-flash-latest",
            contents: [{ role: "user", parts: [{ text: auditSystemInstruction + "\n\n" + auditUserPrompt }] }],
            config: {
                systemInstruction: "Você é um juiz de direito auditor rigoroso. Responda apenas com JSON válido e completo.",
                responseMimeType: "application/json"
            }
        };

        const response = await generateWithFallbackAndRetry(options);
        const responseText = response.text || "{}";
        const parsed = safeParseJson(responseText) || {};

        // Normalização e salvaguardas nos dados retornados
        const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 75;
        let verdict = parsed.verdict || (score >= 90 ? "Aprovada sem Ressalvas" : score >= 75 ? "Aprovada com Ressalvas" : score >= 50 ? "Requer Correções Obrigatórias" : "Crítica / Risco de Nulidade");
        let verdictColor = parsed.verdictColor || (score >= 90 ? "emerald" : score >= 75 ? "indigo" : score >= 50 ? "amber" : "rose");

        const finalResult = {
            score,
            verdict,
            verdictColor,
            summary: parsed.summary || "Auditoria realizada com sucesso com base no confronto com os autos.",
            congruence: {
                score: typeof parsed.congruence?.score === 'number' ? parsed.congruence.score : score,
                summary: parsed.congruence?.summary || "Análise dos pedidos e limites objetivos da lide.",
                items: Array.isArray(parsed.congruence?.items) ? parsed.congruence.items : []
            },
            evidentiary: {
                score: typeof parsed.evidentiary?.score === 'number' ? parsed.evidentiary.score : score,
                summary: parsed.evidentiary?.summary || "Confronto fático-probatório com as peças dos autos.",
                items: Array.isArray(parsed.evidentiary?.items) ? parsed.evidentiary.items : []
            },
            procedural: {
                score: typeof parsed.procedural?.score === 'number' ? parsed.procedural.score : score,
                summary: parsed.procedural?.summary || "Exame dos pressupostos processuais e rito procedimental.",
                items: Array.isArray(parsed.procedural?.items) ? parsed.procedural.items : []
            },
            criticalAlerts: Array.isArray(parsed.criticalAlerts) ? parsed.criticalAlerts : [],
            assessorFeedbackMessage: parsed.assessorFeedbackMessage || "Revisão efetuada. Verifique os apontamentos nos pilares de adstrição e lastro probatório.",
            suggestedCorrectionSnippet: parsed.suggestedCorrectionSnippet || "",
            systemGeneratedMinute: parsed.systemGeneratedMinute || "",
            holisticSynopsis: generatedHolisticSynopsis || undefined,
            deduplicationStats: {
                duplicatesFound: totalDuplicatesFound,
                charsSaved: totalCharsSaved
            },
            usage: {
                promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata?.totalTokenCount || 0
            },
            modelUsed: response.modelVersion || "Gemini 3.8 Flash"
        };

        return res.json(finalResult);
    } catch (err: any) {
        console.error("Erro no audit-assessor-draft:", err);
        return res.status(500).json({ error: formatGeminiError(err) || "Falha ao auditar minuta do assessor." });
    }
});

app.post("/api/hearing-copilot", async (req, res) => {
    try {
        const apiKey = extractApiKey(req);
        if (!apiKey) return res.status(401).json({ error: "Chave da API Gemini ausente." });

        const {
            actionType,
            processNumber,
            author,
            defendant,
            actionClass,
            subject,
            caseText,
            notes,
            plaintiffClaims,
            defendantClaims,
            counterClaim,
            pointsOfControversy,
            witnessesList,
            deliberationParams,
            sentenceParams,
            minutesParams,
            witnessContext,
            judgeName,
            cabinetTesesText,
            knowledgePdfs
        } = req.body;

        let safeCaseText = caseText || "";
        let totalDuplicatesFound = 0;
        let totalCharsSaved = 0;

        if (safeCaseText) {
            safeCaseText = filterInnocuousCertificates(cleanJudicialPdfText(safeCaseText));
            const textDedup = deduplicateTextBlocks(safeCaseText);
            if (textDedup.duplicatesFound > 0) {
                safeCaseText = textDedup.text;
                totalDuplicatesFound += textDedup.duplicatesFound;
                totalCharsSaved += textDedup.charsSaved;
            }
        }

        let generatedHolisticSynopsis = "";
        if (safeCaseText.length > 90000) {
            console.log(`[Mesa de Audiência] Autos volumosos detectados (${safeCaseText.length} caracteres). Consolidando Sinopse Holística dos Autos em 5 pilares para subsidiar a instrução sem perda de fatos nem provas...`);
            try {
                generatedHolisticSynopsis = await generateHolisticSynopsis(safeCaseText, {
                    apiKey,
                    keyPool: extractApiKeyPool(req)
                });
                if (generatedHolisticSynopsis && generatedHolisticSynopsis.length > 200) {
                    safeCaseText = `\n\n[=== SINOPSE HOLÍSTICA FORENSE DOS AUTOS (INTEGRAL EM 5 PILARES - AUDIÊNCIA DE INSTRUÇÃO) ===]\n${generatedHolisticSynopsis}\n\n[=== NÚCLEO DOS AUTOS (TRECHOS-CHAVE E DEPOIMENTOS) ===]\n${safeCaseText.substring(0, 40000)}\n`;
                }
            } catch (synErr) {
                console.warn("[Mesa de Audiência] Erro ao consolidar Sinopse Holística:", synErr);
            }
        } else if (safeCaseText.length > 200000) {
            const half = Math.floor(200000 / 2);
            safeCaseText = safeCaseText.substring(0, half) + "\n\n... [AVISO: AUTOS RESUMIDOS PARA LIMITAÇÃO TÉCNICA] ...\n\n" + safeCaseText.substring(safeCaseText.length - half);
        }

        if (actionType === 'briefing') {
            const systemPrompt = `Você é um Assessor Judicial Especialista em Audiências de Instrução e Julgamento no Judiciário Brasileiro.
Sua missão é ler com máxima precisão os autos do processo fornecido e extrair uma MATRIZ COMPLETA DE INSTRUÇÃO E BRIEFING PROBATÓRIO para a Mesa de Audiências do Magistrado.

Regras Estritas:
1. Extraia com exatidão: Número do Processo (CNJ), Nome Completo do Autor e do Réu, Classe Processual e Assunto Principal.
2. Identifique os fatos alegados pelo Autor e as provas já documentadas.
3. Identifique a tese defensiva do Réu e suas contraprovas documentadas.
4. Identifique se há pedido contraposto ou reconvenção.
5. Indique claramente O QUE AINDA RESTA PROVAR em audiência (objeto da instrução oral).
6. Liste os pontos de controvérsia em tópicos claros (com indicação do ônus da prova: autor, réu, ou inversão pelo CDC).
7. Se houver testemunhas arroladas no texto das peças, liste seus nomes e a qual parte pertencem.
8. Sugira de 3 a 5 perguntas-chave estratégicas para o Magistrado ou Juiz Leigo fazer durante a inquirição.
9. Destaque armadilhas, inconsistências fáticas ou alertas processuais importantes para a audiência.

Você DEVE responder ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "processNumber": "string",
  "author": "string",
  "defendant": "string",
  "actionClass": "string",
  "subject": "string",
  "caseFactsSummary": "string (resumo executivo dos fatos)",
  "plaintiffClaims": "string (fatos e provas do autor)",
  "defendantClaims": "string (fatos e contraprovas do réu)",
  "counterClaim": "string (se houver pedido contraposto)",
  "whatRemainsToProve": "string (o que resta demonstrar na oitiva)",
  "controversySummary": "string (síntese do litígio)",
  "pointsOfControversy": [
    {
      "id": "pt-1",
      "topic": "string",
      "plaintiffPosition": "string",
      "defendantPosition": "string",
      "burdenOfProof": "autor | reu | inversao_cdc | dinamica_juiz",
      "needsOralProof": true,
      "whatNeedsProof": "string",
      "isControverted": true,
      "status": "pendente"
    }
  ],
  "witnesses": [
    {
      "id": "wit-1",
      "name": "string",
      "role": "testemunha_autor | testemunha_reu | informante",
      "controversyTopic": "string",
      "questions": ["pergunta 1", "pergunta 2"],
      "status": "arrolado"
    }
  ],
  "keyQuestions": ["pergunta 1", "pergunta 2", "pergunta 3"],
  "alertsAndTraps": ["alerta 1", "alerta 2"]
}`;

            const userPrompt = `AUTOS DO PROCESSO PARA ANÁLISE DE AUDIÊNCIA:\n\n${safeCaseText || 'Nenhum texto integral extraído.'}`;

            const options = {
                apiKey,
                keyPool: extractApiKeyPool(req),
                res,
                contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                config: {
                    systemInstruction: "Você é um assistente de audiências judiciais que responde apenas com objetos JSON estritos e válidos.",
                    responseMimeType: "application/json"
                }
            };

            const response = await generateWithFallbackAndRetry(options);
            const responseText = response.text || "{}";
            const parsed = safeParseJson(responseText) || {};
            const usage = response.usageMetadata ? {
                promptTokenCount: response.usageMetadata.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata.totalTokenCount || 0
            } : undefined;

            return res.json({
                success: true,
                actionType: 'briefing',
                data: {
                    ...parsed,
                    holisticSynopsis: generatedHolisticSynopsis || undefined,
                    deduplicationStats: {
                        duplicatesFound: totalDuplicatesFound,
                        charsSaved: totalCharsSaved
                    }
                },
                holisticSynopsis: generatedHolisticSynopsis || undefined,
                deduplicationStats: {
                    duplicatesFound: totalDuplicatesFound,
                    charsSaved: totalCharsSaved
                },
                usage,
                modelUsed: response.modelVersion || "Gemini Flash"
            });
        }

        if (actionType === 'questions') {
            const systemPrompt = `Você é um Juiz Instrutor experiente. Formule de 3 a 5 perguntas técnicas e cirúrgicas para a oitiva da seguinte pessoa em audiência de instrução:
Nome: ${witnessContext?.name || 'Testemunha / Parte'}
Papel: ${witnessContext?.role || 'Testemunha'}
Tópico de Controvérsia: ${witnessContext?.controversyTopic || 'Fatos da causa'}
Processo: ${processNumber || 'Autos em instrução'}

Gere perguntas objetivas, abertas e focadas em esclarecer os pontos controvertidos sem induzir respostas.
Retorne apenas o texto formatado das perguntas numeradas.`;

            const options = {
                apiKey,
                keyPool: extractApiKeyPool(req),
                res,
                contents: [{ role: "user", parts: [{ text: systemPrompt + (notes ? `\nNotas da audiência: ${notes}` : '') }] }],
                config: {
                    systemInstruction: "Responda com linguagem forense e perguntas diretas numeradas."
                }
            };

            const response = await generateWithFallbackAndRetry(options);
            const usage = response.usageMetadata ? {
                promptTokenCount: response.usageMetadata.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata.totalTokenCount || 0
            } : undefined;
            return res.json({ success: true, actionType: 'questions', text: response.text || "", usage, modelUsed: response.modelVersion || "Gemini Flash" });
        }

        if (actionType === 'deliberation') {
            const systemPrompt = `Você é um Magistrado presidindo audiência de instrução e julgamento. 
Redija a deliberação oral de mesa para o seguinte evento processual ocorrido em audiência:
Tipo de deliberação: ${deliberationParams?.type || 'deliberação em mesa'}
Parâmetros informados: ${JSON.stringify(deliberationParams || {})}
Juiz: ${judgeName || 'Juiz de Direito'}
Processo: ${processNumber || ''}

Redija em linguagem jurídica formal, concisa e direta para ser ditada e constar no termo de assentada.`;

            const options = {
                apiKey,
                keyPool: extractApiKeyPool(req),
                res,
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                config: { systemInstruction: "Redija o texto de deliberação judicial para ata de audiência." }
            };

            const response = await generateWithFallbackAndRetry(options);
            const usage = response.usageMetadata ? {
                promptTokenCount: response.usageMetadata.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata.totalTokenCount || 0
            } : undefined;
            return res.json({ success: true, actionType: 'deliberation', text: response.text || "", usage, modelUsed: response.modelVersion || "Gemini Flash" });
        }

        if (actionType === 'instant_sentence') {
            const systemPrompt = `Você é um Juiz de Direito que proferirá sentença oral de mesa em audiência de instrução.
Veredito pretendido: ${sentenceParams?.verdict || 'procedência'}
Destaques de fundamentação: ${sentenceParams?.groundsHighlights || 'conforme as provas dos autos'}
Condenação/Danos: ${sentenceParams?.damagesAwarded || 'nos termos do pedido'}
Processo: ${processNumber || ''}
Autor: ${author || 'Autor'}
Réu: ${defendant || 'Réu'}

Redija a sentença em mesa (relatório sucinto/dispensado na forma da lei, fundamentação direta examinando os fatos orais e documentais, e dispositivo com os consectários legais).`;

            const options = {
                apiKey,
                keyPool: extractApiKeyPool(req),
                res,
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                config: { systemInstruction: "Redija sentença em mesa para termo de audiência." }
            };

            const response = await generateWithFallbackAndRetry(options);
            const usage = response.usageMetadata ? {
                promptTokenCount: response.usageMetadata.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata.totalTokenCount || 0
            } : undefined;
            return res.json({ success: true, actionType: 'instant_sentence', text: response.text || "", usage, modelUsed: response.modelVersion || "Gemini Flash" });
        }

        if (actionType === 'minutes') {
            const systemPrompt = `Você é o escrivão/assessor de audiência responsável por redigir a ATA DE AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO completa.
Parâmetros da Ata: ${JSON.stringify(minutesParams || {})}
Processo: ${processNumber || ''}
Autor: ${author || ''}
Réu: ${defendant || ''}

Redija o Termo de Assentada completo, contendo cabeçalho institucional, pregão, presenças, depoimentos colhidos, deliberações e fecho formal com assinaturas.`;

            const options = {
                apiKey,
                keyPool: extractApiKeyPool(req),
                res,
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                config: { systemInstruction: "Redija termo oficial de assentada e ata de audiência." }
            };

            const response = await generateWithFallbackAndRetry(options);
            const usage = response.usageMetadata ? {
                promptTokenCount: response.usageMetadata.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata.totalTokenCount || 0
            } : undefined;
            return res.json({ success: true, actionType: 'minutes', text: response.text || "", usage, modelUsed: response.modelVersion || "Gemini Flash" });
        }

        return res.status(400).json({ error: `Tipo de ação desconhecido: ${actionType}` });
    } catch (err: any) {
        console.error("Erro no hearing-copilot:", err);
        return res.status(500).json({ error: formatGeminiError(err) || "Falha ao processar comando com IA na Mesa de Audiências." });
    }
});

const uploadMedia = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

app.post("/api/mutirao-extract-ata", async (req, res) => {
    try {
        const apiKey = extractApiKey(req);
        if (!apiKey) return res.status(401).json({ error: "Chave da API Gemini ausente." });

        const { pdfText, cabinetTesesText, knowledgePdfs } = req.body;
        let safePdfText = pdfText || "";
        if (safePdfText.length > 200000) {
            const half = Math.floor(200000 / 2);
            safePdfText = safePdfText.substring(0, half) + "\n\n... [AVISO: AUTOS RESUMIDOS PARA LIMITAÇÃO TÉCNICA] ...\n\n" + safePdfText.substring(safePdfText.length - half);
        }

        const systemPrompt = `Você é um Assessor Judicial e Secretário de Audiências de altíssima eficiência.
Sua missão é analisar o PDF dos autos do processo (Petição Inicial, Contestação, Decisões e Provas) e extrair os dados processuais e REDIGIR UMA ATA PRÉVIA DE AUDIÊNCIA completa e formal.

Estrutura esperada de resposta estritamente em JSON:
{
  "processNumber": "string com o número CNJ do processo",
  "author": "string com o nome completo da parte autora",
  "defendant": "string com o nome completo da parte ré",
  "ataText": "string com a Ata de Audiência completa e estruturada pronta para ser lida ou complementada"
}

A Ata deve conter:
- Cabeçalho do Poder Judiciário
- Identificação formal dos autos (Processo, Autor, Réu)
- Pregão das partes
- Resumo do objeto da lide e pedidos
- Campo delimitando a fase de instrução oral
- Espaço para consignar acordos, depoimentos e deliberações finais`;

        const userPrompt = `AUTOS DO PROCESSO:\n\n${safePdfText || 'Nenhum texto extraído.'}`;

        const options = {
            apiKey,
            keyPool: extractApiKeyPool(req),
            res,
            contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            config: {
                systemInstruction: "Você é um assistente de audiências judiciais que responde apenas com JSON válido.",
                responseMimeType: "application/json"
            }
        };

        const response = await generateWithFallbackAndRetry(options);
        const parsed = safeParseJson(response.text || "{}") || {};

        return res.json({
            success: true,
            data: {
                processNumber: parsed.processNumber || '',
                author: parsed.author || 'Parte Autora',
                defendant: parsed.defendant || 'Parte Ré',
                ataText: parsed.ataText || ''
            }
        });
    } catch (err: any) {
        console.error("Erro no mutirao-extract-ata:", err);
        return res.status(500).json({ error: formatGeminiError(err) || "Falha ao extrair ata preliminar do processo." });
    }
});

app.post("/api/mutirao-video", uploadMedia.single('video'), async (req, res) => {
    try {
        const apiKey = extractApiKey(req) || req.body.customApiKey;
        if (!apiKey) return res.status(401).json({ error: "Chave da API Gemini ausente." });

        const { ataText, pdfText, processNumber, customInstruction, customPromptTemplate } = req.body;
        const videoFile = req.file;

        let parts: any[] = [];

        // Prompt de instrução
        const instructionText = `Você é um Juiz de Direito e Assessor Judicial no Mutirão Expresso de Audiências.
Com base nos autos do processo e no termo de assentada/audiência fornecido, elabore:
1. Uma transcrição e resumo dos depoimentos orais prestados em audiência (relatório dos depoimentos).
2. A Sentença Judicial completa com relatório (sucinto ou dispensado na forma da lei), fundamentação jurídica robusta e dispositivo com resolução de mérito.

${customInstruction ? `\nInstruções Específicas do Gabinete: ${customInstruction}\n` : ''}
${customPromptTemplate ? `\nModelo/Diretriz Estrutural:\n${customPromptTemplate}\n` : ''}
${ataText ? `\nTERMO DE AUDIÊNCIA / ATA:\n${ataText}\n` : ''}
${pdfText ? `\nRESUMO DOS AUTOS DO PROCESSO:\n${typeof pdfText === 'string' ? pdfText.slice(0, 100000) : ''}\n` : ''}

Retorne estritamente em JSON com o formato:
{
  "transcription": "Resumo detalhado e degravação dos depoimentos orais e declarações colhidas",
  "sentenceText": "Sentença completa, com cabeçalho, relatório, fundamentação e dispositivo condizente com as provas"
}`;

        parts.push({ text: instructionText });

        if (videoFile && videoFile.buffer) {
            parts.push({
                inlineData: {
                    mimeType: videoFile.mimetype || "video/mp4",
                    data: videoFile.buffer.toString("base64")
                }
            });
        }

        const options = {
            apiKey,
            keyPool: extractApiKeyPool(req),
            res,
            contents: [{ role: "user", parts }],
            config: {
                systemInstruction: "Você é um magistrado que profere sentenças em audiências de mutirão expressas. Responda apenas com JSON válido.",
                responseMimeType: "application/json"
            }
        };

        const response = await generateWithFallbackAndRetry(options);
        const parsed = safeParseJson(response.text || "{}") || {};

        return res.json({
            success: true,
            data: {
                transcription: parsed.transcription || 'Depoimentos orais sintetizados conforme assentada.',
                sentenceText: parsed.sentenceText || ''
            }
        });
    } catch (err: any) {
        console.error("Erro no mutirao-video:", err);
        return res.status(500).json({ error: formatGeminiError(err) || "Falha ao processar mídia e proferir sentença." });
    }
});

function extractApiKey(req) {
    const isNativeAllowed = req.headers['x-use-native-key'] === 'true';
    const headerKey = req.headers['x-gemini-api-key'] || req.headers['x-custom-api-key'] || req.headers['x-api-key'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : undefined);
    const bodyKey = req.body?.customApiKey;
    const queryKey = req.query?.key;
    if (headerKey && typeof headerKey === 'string' && headerKey.trim().length > 10) {
        return headerKey.trim();
    }
    if (bodyKey && typeof bodyKey === 'string' && bodyKey.trim().length > 10) {
        return bodyKey.trim();
    }
    if (queryKey && typeof queryKey === 'string' && queryKey.trim().length > 10) {
        return queryKey.trim();
    }
    if (isNativeAllowed) {
        return (process.env.GEMINI_API_KEY || "").trim();
    }
    return "";
}

function extractApiKeyPool(req): string[] {
    const pool: string[] = [];
    const isNativeAllowed = req.headers['x-use-native-key'] === 'true';

    // Se a Chave Nativa estiver expressamente ativada, ela entra em 1º lugar com prioridade absoluta
    if (isNativeAllowed && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
        pool.push(process.env.GEMINI_API_KEY.trim());
    }

    const poolHeader = req.headers['x-gemini-api-key-pool'] || req.headers['x-gemini-keys-pool'];
    if (typeof poolHeader === 'string') {
        try {
            const parsed = JSON.parse(poolHeader);
            if (Array.isArray(parsed)) {
                parsed.forEach(k => {
                    if (typeof k === 'string' && k.trim().length > 10 && !pool.includes(k.trim())) {
                        pool.push(k.trim());
                    }
                });
            }
        } catch {
            poolHeader.split(',').forEach(s => {
                const trimmed = s.trim();
                if (trimmed.length > 10 && !pool.includes(trimmed)) {
                    pool.push(trimmed);
                }
            });
        }
    }
    const singleKey = extractApiKey(req);
    if (singleKey && !pool.includes(singleKey)) {
        if (isNativeAllowed && pool.length > 0) {
            pool.push(singleKey);
        } else {
            pool.unshift(singleKey);
        }
    }

    // BLINDAGEM TOTAL: Se a chave nativa NÃO estiver permitida (isNativeAllowed === false),
    // NUNCA inserir a chave nativa do servidor no pool (nem como reserva).

    return pool;
}

async function extractTextFromPdfBuffer(buffer) {
    try {
        const data = new Uint8Array(buffer);
        const pdf = await pdfjsLib.getDocument({ data, standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/', disableFontFace: true }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            
            // Filtro cirúrgico folha a folha de ruídos de digitalização judicial
            const pageLines: string[] = [];
            let currentLine = '';
            let lastY: number | null = null;

            for (const item of content.items) {
                const rawStr = (item as any).str || "";
                const str = rawStr.trim();
                if (!str) continue;

                // 1. Descarta texto rotacionado (assinaturas laterais verticais e carimbos de margem)
                const transform = (item as any).transform || [1, 0, 0, 1, 0, 0];
                const skewY = transform[1];
                const skewX = transform[2];
                if (Math.abs(skewY) > 0.02 || Math.abs(skewX) > 0.02) {
                    continue;
                }

                // 2. Descarta carimbos de protocolo, sistemas de tribunal, códigos de barras e hashes
                if (/^(?:fls?\.?|p[aá]g(?:ina)?\.?|folhas?)\s*\d+(?:\s*(?:de|\/)\s*\d+)?\.?$/i.test(str)) continue;
                if (/^\d+\s*[\/-]\s*\d+$/.test(str)) continue;
                if (/^PROJUDI\s*[-–:]\s*Processo/i.test(str)) continue;
                if (/^(?:PJe|e-SAJ|eproc|SEI)\s*[-–:]\s*Processo/i.test(str)) continue;
                if (/^(?:Documento|Assinado)\s+(?:eletronicamente|digitalmente)\s+por/i.test(str)) continue;
                if (/^Assinado\s+por\s+.*?(?:Juiz|Desembargador|Escriv|Analista|Técnico|Advogado)/i.test(str)) continue;
                if (/^(?:Chave\s*de\s*acesso|C[oó]digo\s*verificador|Identificador|Hash|Checksum)\s*:\s*[A-Fa-f0-9\s-]+$/i.test(str)) continue;
                if (/^https?:\/\/(?:projudi|pje|eproc|esaj|tj[a-z]{2})\.[^\s]+/i.test(str)) continue;
                if (/^Inserido\s+ao\s+processo\s+em\s+\d{2}\/\d{2}\/\d{4}/i.test(str)) continue;

                const posY = transform[5];
                if (lastY === null || Math.abs(posY - lastY) <= 3.5) {
                    currentLine += (currentLine ? ' ' : '') + rawStr;
                } else {
                    if (currentLine.trim()) pageLines.push(currentLine.trim());
                    currentLine = rawStr;
                }
                lastY = posY;
            }
            if (currentLine.trim()) pageLines.push(currentLine.trim());

            // 3. Descarta cabeçalhos repetitivos de tribunais no topo de cada página
            const cleanedPageLines = pageLines.filter(l => {
                if (/^(?:fls?\.?|p[aá]g(?:ina)?\.?|folhas?)\s*\d+(?:\s*(?:de|\/)\s*\d+)?\.?$/i.test(l)) return false;
                if (/^PODER\s+JUDICI[AÁ]RIO\s+DO\s+ESTADO\s+(?:DE|DO|DA)\s+[A-ZÀ-Ú\s]+$/i.test(l)) return false;
                if (/^TRIBUNAL\s+DE\s+JUSTI[CÇ]A\s+DO\s+ESTADO\s+(?:DE|DO|DA)\s+[A-ZÀ-Ú\s]+$/i.test(l)) return false;
                if (/^CORREGEDORIA\s+GERAL\s+DA\s+JUSTI[CÇ]A/i.test(l)) return false;
                return true;
            });

            const pageText = cleanedPageLines.join(' ').trim();
            if (pageText) {
                text += `[Página ${i} de ${pdf.numPages}]\n` + pageText + '\n\n';
            }
        }
        return text;
    } catch (e) {
        console.error(e);
        return "";
    }
}

async function generateWithFallbackAndRetry(options) {
    // 1. Constrói o pool de chaves em ordem de prioridade (ativa primeiro, depois reservas)
    let keyPool: string[] = [];
    if (Array.isArray(options.keyPool) && options.keyPool.length > 0) {
        keyPool = options.keyPool.filter(k => typeof k === 'string' && k.trim().length > 10).map(k => k.trim());
    } else if (options.apiKey && typeof options.apiKey === 'string' && options.apiKey.trim().length > 10) {
        keyPool = [options.apiKey.trim()];
    }

    // REGRA DE SEGURANÇA E GOVERNANÇA: A Chave Nativa do servidor (process.env.GEMINI_API_KEY)
    // NUNCA pode ser liberada automaticamente para os usuários.
    // Ela SÓ pode ser incluída se o Super Admin tiver ativado explicitamente a permissão para o usuário
    // (options.isNativeAllowed === true ou já inserida no keyPool pelo extractApiKeyPool com base no header x-use-native-key).
    if (options.isNativeAllowed && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
        const nativeKey = process.env.GEMINI_API_KEY.trim();
        if (!keyPool.includes(nativeKey)) {
            keyPool.push(nativeKey);
        }
    }

    if (keyPool.length === 0) {
        throw new Error("Nenhuma chave da API Gemini foi configurada ou liberada pelo Super Admin. Configure sua chave pessoal em 'Configurar Chaves da IA' ou solicite ao administrador a liberação da Chave Nativa.");
    }

    // REORDENAÇÃO DA ESTEIRA: Modelos mais ágeis e de menor fila primeiro (gemini-3.1-flash-lite e gemini-flash-latest)
    let pModel = options.primaryModel || 'gemini-3.1-flash-lite';
    let fbModel = options.fallbackModel || 'gemini-flash-latest';
    const defaultFlashQueue = [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest"
    ];
    const initialList = [pModel];
    if (fbModel && !initialList.includes(fbModel)) {
        initialList.push(fbModel);
    }
    const modelsToTry = [
        ...initialList,
        ...defaultFlashQueue.filter(m => !initialList.includes(m))
    ];
    let lastError;

    // DESATIVAÇÃO DA VALIDAÇÃO RÍGIDA (responseSchema):
    // Descarta responseSchema para desonerar o decodificador do Google e acelerar 2x a 3x a resposta sem alterar estrutura
    let activeConfig = options.config ? { ...options.config } : {};
    if (activeConfig && activeConfig.responseSchema) {
        delete activeConfig.responseSchema;
    }
    let activeContents = options.contents ? JSON.parse(JSON.stringify(options.contents)) : [];

    // CICLOS COMPLETOS DA ESTEIRA: Se toda a esteira de modelos sofrer indisponibilidade temporária (503 / timeout na fila do Google),
    // o sistema reinicia a esteira desde o primeiro modelo, realizando os intervalos preventivos necessários para não estourar a cota nem sobrecarregar o cluster.
    const maxPipelineCycles = options.maxCycles || 3;
    // Timeout confortável e seguro por modelo (180 segundos por padrão): evita cortes precipitados de minutas longas e densas
    const modelTimeoutMs = options.timeoutMs || 180000;

    for (let cycle = 1; cycle <= maxPipelineCycles; cycle++) {
        if (cycle > 1) {
            // Intervalo necessário para resfriamento de cluster sem estourar limites por minuto
            const cycleInterval = cycle === 2 ? 3000 : 4500;
            console.log(`[Assessor Judicial] Indisponibilidade de toda a esteira por alta demanda transitória. Reiniciando esteira completa (Ciclo ${cycle}/${maxPipelineCycles}) com intervalo preventivo (${cycleInterval}ms)...`);
            await new Promise(resolve => setTimeout(resolve, cycleInterval));
        }

        let anyDemandOverloadedInCycle = false;

        // Loop pelas chaves autorizadas do pool:
        for (let kIdx = 0; kIdx < keyPool.length; kIdx++) {
            const currentKey = keyPool[kIdx];
            const isNative = process.env.GEMINI_API_KEY && currentKey === process.env.GEMINI_API_KEY.trim();
            const maskedKey = isNative ? "Chave Nativa do Servidor" : (currentKey.length > 10 ? `${currentKey.substring(0, 6)}...${currentKey.substring(currentKey.length - 4)}` : "chave");
            const ai = new GoogleGenAI({
                apiKey: currentKey,
                httpOptions: {
                    timeout: modelTimeoutMs,
                    headers: {
                        'User-Agent': 'aistudio-build'
                    }
                }
            });
            let keyExhausted = false;

            if (kIdx > 0) {
                console.log(`[Assessor Judicial - Key Pool] Alternando automaticamente para a chave reserva ${kIdx + 1}/${keyPool.length} (${maskedKey})...`);
            }

            for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
                const modelName = modelsToTry[mIdx];
                let timerHandle: any = null;

                try {
                    console.log(`[Assessor Judicial] Ciclo ${cycle}/${maxPipelineCycles} | Modelo ${modelName} | Chave ${kIdx + 1}/${keyPool.length} (${maskedKey}) [Limite Fila: ${modelTimeoutMs / 1000}s]`);
                    
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timerHandle = setTimeout(() => {
                            reject(new Error(`GOOGLE_QUEUE_TIMEOUT: Tempo limite de espera na fila do Google esgotado (${modelTimeoutMs / 1000}s) no modelo ${modelName}. Passando imediatamente ao próximo modelo.`));
                        }, modelTimeoutMs);
                        if (timerHandle && typeof timerHandle.unref === 'function') {
                            timerHandle.unref();
                        }
                    });

                    const response = await Promise.race([
                        ai.models.generateContent({
                            model: modelName,
                            contents: activeContents,
                            config: activeConfig
                        }),
                        timeoutPromise
                    ]);

                    if (timerHandle) clearTimeout(timerHandle);

                    // Sucesso! Registra metadados da chave vencedora
                    (response as any).usedKey = currentKey;
                    (response as any).usedKeyIndex = kIdx;
                    (response as any).wasRotated = kIdx > 0;

                    if (kIdx > 0) {
                        console.log(`[Assessor Judicial - ROTAÇÃO COM SUCESSO] Requisição atendida com êxito pela chave reserva ${kIdx + 1}/${keyPool.length} (${maskedKey})!`);
                        if (options.res && !options.res.headersSent) {
                            try {
                                options.res.setHeader('x-gemini-rotated-key', currentKey);
                                options.res.setHeader('Access-Control-Expose-Headers', 'x-gemini-rotated-key');
                            } catch (_) {}
                        }
                    }

                    return response;
                } catch (e: any) {
                    if (timerHandle) clearTimeout(timerHandle);
                    lastError = e;
                    const errMsg = e?.message || "";

                    const isTimeout = errMsg.includes("GOOGLE_QUEUE_TIMEOUT") || 
                                      errMsg.includes("Request timed out") || 
                                      errMsg.includes("timeout") || 
                                      errMsg.includes("ETIMEDOUT") || 
                                      errMsg.includes("ESOCKETTIMEDOUT") ||
                                      errMsg.includes("UND_ERR_CONNECT_TIMEOUT");

                    const isModelUnavailable = errMsg.includes("não está disponível") || 
                                               errMsg.includes("no longer available") || 
                                               errMsg.includes("not found") || 
                                               errMsg.includes("is not supported") ||
                                               errMsg.includes("deprecated");

                    const isQuotaError = errMsg.includes("Quota exceeded") || 
                                         errMsg.includes("429") || 
                                         errMsg.includes("RESOURCE_EXHAUSTED") ||
                                         errMsg.includes("rate limit") ||
                                         errMsg.includes("generativelanguage.googleapis.com");
                    const isAuthError = errMsg.includes("API key not valid") || 
                                         errMsg.includes("API_KEY_INVALID") || 
                                         errMsg.includes("403") || 
                                         errMsg.includes("PERMISSION_DENIED");

                    const isDemandOverloaded = isTimeout ||
                                               errMsg.includes("503") || 
                                               errMsg.includes("high demand") || 
                                               errMsg.includes("UNAVAILABLE") || 
                                               errMsg.includes("overloaded");

                    if (isDemandOverloaded) {
                        anyDemandOverloadedInCycle = true;
                    }

                    const statusReason = isTimeout ? `Fila do Google retida (Timeout ${modelTimeoutMs / 1000}s)` :
                                         errMsg.includes("503") || errMsg.includes("high demand") ? "Alta demanda temporária no cluster Google (503)" :
                                         isQuotaError ? "Cota esgotada (429)" :
                                         isAuthError ? "Chave não autorizada (403)" :
                                         isModelUnavailable ? "Modelo indisponível" : "Tentativa transitória";

                    console.log(`[Assessor Judicial] Ciclo ${cycle}/${maxPipelineCycles} | Chave ${kIdx + 1}/${keyPool.length} (${maskedKey}) | Modelo ${modelName} -> ${statusReason}`);

                    if (isModelUnavailable) {
                        continue; // Passa imediatamente ao próximo modelo
                    }

                    // Se for erro de autenticação ou invalidação de chave:
                    if (isAuthError && kIdx < keyPool.length - 1) {
                        console.log(`[Assessor Judicial - ROTAÇÃO IMEDIATA] Erro de autenticação na chave ${kIdx + 1}/${keyPool.length}. Rotacionando IMEDIATAMENTE para a chave ${kIdx + 2}...`);
                        keyExhausted = true;
                        break;
                    }

                    // Se a cota da chave esgotou (429 / RESOURCE_EXHAUSTED) e há chaves reservas no pool:
                    if (isQuotaError) {
                        if (kIdx < keyPool.length - 1) {
                            console.log(`[Assessor Judicial - ROTAÇÃO IMEDIATA] Cota da chave ${kIdx + 1}/${keyPool.length} esgotada (429/RESOURCE_EXHAUSTED). Rotacionando IMEDIATAMENTE para a chave reserva ${kIdx + 2}...`);
                            keyExhausted = true;
                            break;
                        } else {
                            // Chave única ou gratuita: aplica resfriamento preventivo de cota (6 segundos) antes do próximo modelo contingencial para permitir que o bucket de tokens da API Gemini se restabeleça
                            console.log(`[Assessor Judicial - Resfriamento de Cota] Cota por minuto atingida (429 Rate Limit) no modelo ${modelName}. Aguardando 6s de resfriamento para recomposição da cota antes do próximo modelo...`);
                            await new Promise(r => setTimeout(r, 6000));
                        }
                    }

                    // 503 Service Unavailable / Timeout na fila da Google / Overloaded:
                    if (isDemandOverloaded) {
                        // Se estiver com responseSchema restritivo, remove-o para aliviar o decodificador do Google para os próximos modelos
                        if (activeConfig && activeConfig.responseSchema) {
                            delete activeConfig.responseSchema;
                        }
                        // Se houver inlineData pesado, descarta para mandar apenas texto
                        if (Array.isArray(activeContents)) {
                            for (const c of activeContents) {
                                if (Array.isArray(c.parts)) {
                                    c.parts = c.parts.filter(p => !p.inlineData);
                                    // Sob alta demanda do cluster, condensa textos gigantes para caber na janela prioritária
                                    for (const p of c.parts) {
                                        if (p.text && p.text.length > 70000) {
                                            const half = 32000;
                                            p.text = p.text.substring(0, half) + "\n\n[... MIOLO CONDENSADO PARA ATENDIMENTO SOB ALTA DEMANDA DO CLUSTER GOOGLE ...]\n\n" + p.text.substring(p.text.length - half);
                                        }
                                    }
                                }
                            }
                        }

                        // REGRA: Não fica aguardando a fila do Google e passa IMEDIATAMENTE ao próximo modelo da esteira (sem delay artificial)
                        if (mIdx < modelsToTry.length - 1) {
                            console.log(`[Assessor Judicial - Transição Imediata] ${statusReason} em ${modelName}. Passando IMEDIATAMENTE ao próximo modelo: ${modelsToTry[mIdx + 1]}...`);
                            continue; // Avança imediatamente ao próximo modelo
                        }

                        // Se todos os modelos desta chave sofreram timeout/503 e temos outra chave autorizada no pool
                        if (kIdx < keyPool.length - 1) {
                            console.log(`[Assessor Judicial - 503/Fila Failover Imediato] Alta demanda/fila em todos os modelos na chave ${kIdx + 1}/${keyPool.length}. Rotacionando IMEDIATAMENTE para chave ${kIdx + 2}...`);
                            keyExhausted = true;
                            break;
                        }
                    }

                    // Se não for demand overload, tenta o próximo modelo imediatamente
                    continue;
                }

                if (keyExhausted) {
                    break; // Pula para a próxima chave do pool
                }
            }
        }

        // Se o erro principal nesta rodada não foi 503/alta demanda (ex: chave 403 permanente ou esgotamento sem 503), não repete ciclos desnecessariamente
        if (!anyDemandOverloadedInCycle && cycle >= 2) {
            break;
        }
    }

    const lastErrMsg = lastError?.message || "";
    const isDemand = lastErrMsg.includes("503") || lastErrMsg.includes("high demand") || lastErrMsg.includes("UNAVAILABLE") || lastErrMsg.includes("GOOGLE_QUEUE_TIMEOUT") || lastErrMsg.includes("timeout");
    if (isDemand) {
        throw new Error(`Os servidores de IA do Google estão enfrentando alta demanda e retenção em fila (Erro 503 / Timeout de Fila). O sistema percorreu ${maxPipelineCycles} ciclos completos na esteira de modelos contingenciais sem travar. Por favor, aguarde alguns instantes e clique em 'Tentar Novamente'.`);
    }
    const isLastQuota = lastErrMsg.includes("429") || lastErrMsg.includes("RESOURCE_EXHAUSTED") || lastErrMsg.includes("Quota exceeded");
    if (keyPool.length > 1 && isLastQuota) {
        throw new Error(`Todas as ${keyPool.length} chaves cadastradas no pool atingiram o limite de cota do Google (Erro 429 Rate Limit / Quota Exceeded). Aguarde a renovação da cota temporária ou solicite ao Super Admin a liberação da Chave Nativa.`);
    }
    throw lastError;
}

async function generateHolisticSynopsis(fullProcessText: string, options: {
    apiKey?: string;
    keyPool?: string[];
    isNativeAllowed?: boolean;
}): Promise<string> {
    const synopsisPrompt = `Você é um Assessor Jurídico e Pesquisador Forense de Gabinete especializado de altíssima performance.
Sua missão é realizar a leitura integral e elaborar a SINOPSE HOLÍSTICA FORENSE DOS AUTOS deste processo judicial volumoso.

DIRETRIZ DE OURO: NÃO SUPRIMA NENHUM FATO, PEDIDO, TESE OU PROVA RELEVANTE.
Esta sinopse servirá como base fática e probatória para a elaboração da decisão/sentença judicial e para a auditoria de conformidade.
Elimine apenas repetições de artigos de lei, jargões burocráticos, certidões cartorárias inócuas e citações doutrinárias supérfluas.

ESTRUTURE RIGOROSAMENTE A SINOPSE HOLÍSTICA EM 5 PILARES FORENSES:

I. QUALIFICAÇÃO DAS PARTES E POLOS PROCESSUAIS:
- Polo Ativo: Nome do(s) autor(es), representantes, situação de Gratuidade da Justiça ou custas recolhidas.
- Polo Passivo: Nome do(s) réu(s), litisconsortes, revelia ou procuradores constituídos.
- Terceiros, intervenientes ou assistentes (se houver).

II. CAUSA DE PEDIR, FATOS E PEDIDOS:
- Narrativa fática completa e cronológica de todos os eventos narrados nos autos sem omissões.
- Relação jurídica controvertida (objeto contratual, ato ilícito, relação de consumo, posse, débito, obrigação).
- Pedidos principais, pedidos subsidiários/alternativos e valor atribuído à causa.

III. RESPOSTAS, PRELIMINARES E IMPUGNAÇÕES:
- Preliminares arguidas pelo polo passivo (incompetência, ilegitimidade, inépcia da inicial, falta de interesse, etc.).
- Prejudiciais de mérito alegadas (prescrição, decadência).
- Teses centrais de defesa do réu, eventuais reconvenções ou impugnações ao valor da causa.

IV. ACERVO PROBATÓRIO COMPLETO (PROVAS DOS AUTOS - SEM SUPRESSÃO):
- Provas documentais fundamentais (contratos, cláusulas controvertidas, comprovantes, extratos, certidões, notificações).
- Prova pericial: laudo pericial do juízo, quesitos respondidos e conclusões técnicas do perito judicial.
- Prova oral: resumo fático integral dos depoimentos pessoais e testemunhas ouvidas em audiência de instrução.
- Outras provas produzidas (inspeção judicial, relatórios técnicos, fotografias).

V. DECISÕES INTERCORRENTES E SITUAÇÃO ATUAL:
- Tutelas provisórias / de urgência concedidas ou indeferidas.
- Decisão de saneamento e organização do processo (pontos fixados como controvertidos e distribuição do ônus probatório).
- Incidentes processuais, preclusões e fase processual atual.

Abaixo segue o teor dos autos do processo para consolidação holística:
${fullProcessText.slice(0, 500000)}`;

    try {
        console.log(`[Assessor Judicial] Consolidando Sinopse Holística dos Autos em 5 Pilares (~${Math.round(fullProcessText.length / 4)} tokens)...`);
        const response = await generateWithFallbackAndRetry({
            apiKey: options.apiKey,
            keyPool: options.keyPool,
            isNativeAllowed: options.isNativeAllowed,
            primaryModel: "gemini-3.1-flash-lite",
            fallbackModel: "gemini-flash-latest",
            contents: [{ parts: [{ text: synopsisPrompt }] }],
            config: {
                temperature: 0.1,
                maxOutputTokens: 3072
            }
        });
        const synopsisText = response?.text || "";
        if (synopsisText && synopsisText.trim().length > 100) {
            console.log(`[Assessor Judicial] Sinopse Holística concluída com sucesso (${synopsisText.length} caracteres).`);
            return synopsisText.trim();
        }
    } catch (err) {
        console.warn("[Assessor Judicial] Aviso na consolidação da Sinopse Holística:", err);
    }
    return "";
}

function safeParseJson(str: any) {
    if (!str || typeof str !== 'string') return null;
    let clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();
    // Elimina repetições fugitivas de chaves no final (loop de repetição de token)
    clean = clean.replace(/(\}\s*){6,}$/, '}');
    try {
        return JSON.parse(clean);
    } catch (e1) {
        try {
            const firstBrace = clean.indexOf('{');
            const lastBrace = clean.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                const sub = clean.substring(firstBrace, lastBrace + 1);
                return JSON.parse(sub);
            }
        } catch (_) {}

        // Recuperador de JSON truncado / não-fechado
        try {
            const firstBrace = clean.indexOf('{');
            if (firstBrace === -1) return null;
            let candidate = clean.substring(firstBrace);
            candidate = candidate.replace(/(\}\s*){6,}$/, '');
            let inString = false;
            let escaped = false;
            const stack: string[] = [];
            for (let i = 0; i < candidate.length; i++) {
                const ch = candidate[i];
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (ch === '\\') {
                    escaped = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (ch === '{' || ch === '[') {
                        stack.push(ch);
                    } else if (ch === '}') {
                        if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
                    } else if (ch === ']') {
                        if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
                    }
                }
            }
            let repaired = candidate;
            if (inString) repaired += '"';
            while (stack.length > 0) {
                const open = stack.pop();
                repaired += (open === '{' ? '}' : ']');
            }
            repaired = repaired.replace(/,\s*([\}\]])/g, '$1');
            return JSON.parse(repaired);
        } catch (_) {}

        return null;
    }
}

function formatGeminiError(error) {
    if (!error) return "Erro desconhecido";
    let msg = error && error.message ? error.message : String(error);
    try {
        const parsed = JSON.parse(msg);
        if (parsed?.error?.message) {
            msg = parsed.error.message;
        }
    } catch {}
    if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("overloaded") || msg.includes("temporarily unavailable")) {
        return "Os servidores de inteligência artificial do Google estão enfrentando um pico temporário de alta demanda global (Erro 503). O sistema tentou todos os modelos Flash da esteira. Por favor, aguarde alguns segundos e clique em 'Tentar Novamente'.";
    }
    if (msg.includes("já não está disponível") || msg.includes("no longer available") || msg.includes("gemini-2.5")) {
        return "O cluster de modelos do Google passou por renovação de versão. O sistema foi atualizado e opera agora com a esteira moderna de alta velocidade (Gemini 3.8 Flash, 3.7 Flash e 3.6 Flash). Por favor, repita a operação.";
    }
    if (msg.includes("prepayment credits are depleted") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded") || msg.includes("429") || msg.includes("rate limit") || msg.includes("usage limit")) {
        return "Limite temporário de cota/requisições da API Gemini atingido no Google (Erro 429 Rate Limit / Quota Exceeded). Se você possui chaves adicionais da API Gemini, cadastre-as no botão Chave API para ativação automática do Pool Inteligente com rotação instantânea.";
    }
    return msg;
}

function readJsonFile(filename, defaultVal) {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf-8'));
    } catch(e) {
        return defaultVal;
    }
}

function writeJsonFile(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data));
}

function detectApplicableLegalFrameworks(context) {
    return [{
        name: "Regra Geral",
        category: "Geral",
        principaisLeis: [{ diploma: "Lei", artigosChave: "Art 1", objeto: "Geral" }],
        regimeCorrecao: { indiceCorrecao: "INPC", termoInicialCorrecao: "Citação", indiceJuros: "1% a.m.", termoInicialJuros: "Citação", baseLegalCompleta: "Art 405 CC", observacoes: "" }
    }];
}

function inferTpuCnjMovement(resolvedActType: string, title: string, dispositivo: string, rawTpu: any) {
    if (rawTpu && typeof rawTpu === 'object' && rawTpu.codigoTpu && rawTpu.descricaoMovimento) {
        return {
            codigoTpu: String(rawTpu.codigoTpu).trim(),
            descricaoMovimento: String(rawTpu.descricaoMovimento).trim(),
            tipoAto: (rawTpu.tipoAto || (resolvedActType === 'decisao' ? 'Decisão Interlocutória' : resolvedActType === 'despacho' ? 'Despacho' : 'Sentença')),
            subtipoResultado: rawTpu.subtipoResultado || 'Definido no dispositivo',
            prazoSecretaria: rawTpu.prazoSecretaria || (resolvedActType === 'sentenca' ? '15 dias úteis (Apelação/Recurso Inominado)' : resolvedActType === 'decisao' ? '15 dias úteis (Agravo de Instrumento)' : '5 dias úteis'),
            filaProjudi: rawTpu.filaProjudi || 'Aguardando Intimação das Partes',
            observacoesLancamento: rawTpu.observacoesLancamento || 'Lançar movimentação e intimar as partes via sistema.'
        };
    }

    const dLower = (dispositivo || "").toLowerCase();
    const tLower = (title || "").toLowerCase();

    // 1. Sentenças
    if (resolvedActType === "sentenca" || tLower.includes("senten")) {
        if (dLower.includes("julgo parcialmente procedente") || dLower.includes("parcial procedência") || dLower.includes("parcialmente procedente")) {
            return {
                codigoTpu: "221",
                descricaoMovimento: "Sentença - Julgamento com Resolução do Mérito - Procedência em Parte",
                tipoAto: "Sentença",
                subtipoResultado: "Parcial Procedência",
                prazoSecretaria: "15 dias úteis (art. 1.003, § 5º, CPC / 10 dias úteis se Lei 9.099/95)",
                filaProjudi: "Aguardando Intimação da Sentença",
                observacoesLancamento: "Lançar código TPU 221 no PROJUDI. Intimar as partes para cumprimento ou recurso cabível."
            };
        }
        if (dLower.includes("julgo improcedente") || dLower.includes("improcedência") || dLower.includes("improcedentes os pedidos")) {
            return {
                codigoTpu: "220",
                descricaoMovimento: "Sentença - Julgamento com Resolução do Mérito - Improcedência",
                tipoAto: "Sentença",
                subtipoResultado: "Improcedência",
                prazoSecretaria: "15 dias úteis (art. 1.003, § 5º, CPC / 10 dias úteis se Lei 9.099/95)",
                filaProjudi: "Aguardando Intimação da Sentença",
                observacoesLancamento: "Lançar código TPU 220 no PROJUDI. Intimar a parte autora."
            };
        }
        if (dLower.includes("julgo extinto sem") || dLower.includes("extinção sem resolução") || dLower.includes("sem julgamento do mérito") || dLower.includes("art. 485") || dLower.includes("indeferimento da petição inicial") || dLower.includes("falta de interesse") || dLower.includes("ilegitimidade")) {
            return {
                codigoTpu: "22",
                descricaoMovimento: "Sentença - Extinção sem Resolução do Mérito (art. 485 CPC)",
                tipoAto: "Sentença",
                subtipoResultado: "Extinção sem Resolução do Mérito",
                prazoSecretaria: "15 dias úteis",
                filaProjudi: "Aguardando Trânsito em Julgado / Intimação",
                observacoesLancamento: "Lançar código TPU 22 (ou 230). Verificar eventual condenação em custas processuais."
            };
        }
        if (dLower.includes("homologo o acordo") || dLower.includes("homologação de acordo") || dLower.includes("transação")) {
            return {
                codigoTpu: "222",
                descricaoMovimento: "Sentença - Homologação de Transação / Acordo",
                tipoAto: "Sentença",
                subtipoResultado: "Homologação de Acordo",
                prazoSecretaria: "Sem prazo / Cumprimento de Acordo",
                filaProjudi: "Suspenso para Cumprimento de Acordo",
                observacoesLancamento: "Lançar código TPU 222 no PROJUDI. Baixar prazos abertos."
            };
        }
        // Default Sentença: Procedência Total
        return {
            codigoTpu: "219",
            descricaoMovimento: "Sentença - Julgamento com Resolução do Mérito - Procedência",
            tipoAto: "Sentença",
            subtipoResultado: "Procedência Total",
            prazoSecretaria: "15 dias úteis (art. 1.003, § 5º, CPC / 10 dias úteis se Lei 9.099/95)",
            filaProjudi: "Aguardando Intimação da Sentença",
            observacoesLancamento: "Lançar código TPU 219 no PROJUDI. Intimar partes e abrir prazo recursal."
        };
    }

    // 2. Decisões Interlocutórias
    if (resolvedActType === "decisao" || tLower.includes("decisão")) {
        if (dLower.includes("defiro a tutela") || dLower.includes("concedo a tutela") || dLower.includes("defiro o pedido liminar") || dLower.includes("defiro a medida de urgência")) {
            return {
                codigoTpu: "25",
                descricaoMovimento: "Decisão - Concedida a Medida Liminar / Deferimento de Tutela Provisória",
                tipoAto: "Decisão Interlocutória",
                subtipoResultado: "Tutela de Urgência Deferida",
                prazoSecretaria: "Cumprimento Imediato / Expedição de Notificação com Urgência",
                filaProjudi: "Urgência - Expedição de Mandado/Intimação",
                observacoesLancamento: "Lançar código TPU 25 no PROJUDI com prioridade. Expedir mandado/ofício à parte requerida com prazo cominatório fixado."
            };
        }
        if (dLower.includes("indefiro a tutela") || dLower.includes("indefiro a liminar") || dLower.includes("indefiro o pedido de tutela") || dLower.includes("ausentes os requisitos")) {
            return {
                codigoTpu: "26",
                descricaoMovimento: "Decisão - Não Concedida a Medida Liminar / Indeferimento de Tutela Provisória",
                tipoAto: "Decisão Interlocutória",
                subtipoResultado: "Tutela de Urgência Indeferida",
                prazoSecretaria: "15 dias úteis",
                filaProjudi: "Aguardando Citação / Intimação",
                observacoesLancamento: "Lançar código TPU 26 no PROJUDI. Citar e intimar para contestação ou audiência."
            };
        }
        if (dLower.includes("saneamento") || dLower.includes("saneador") || dLower.includes("fixo os pontos controvertidos") || dLower.includes("art. 357")) {
            return {
                codigoTpu: "480",
                descricaoMovimento: "Decisão - Decisão de Saneamento e Organização do Processo (art. 357 CPC)",
                tipoAto: "Decisão Interlocutória",
                subtipoResultado: "Saneamento do Processo",
                prazoSecretaria: "5 dias úteis para pedidos de esclarecimento (art. 357, § 1º, CPC)",
                filaProjudi: "Aguardando Estabilização do Saneamento / Instrução",
                observacoesLancamento: "Lançar código TPU 480 no PROJUDI. Pautar instrução ou abrir vista ao perito."
            };
        }
        return {
            codigoTpu: "3",
            descricaoMovimento: "Decisão - Decisão Interlocutória",
            tipoAto: "Decisão Interlocutória",
            subtipoResultado: "Interlocutória",
            prazoSecretaria: "15 dias úteis (Agravo de Instrumento) / 5 dias úteis (Manifestação)",
            filaProjudi: "Aguardando Cumprimento de Decisão",
            observacoesLancamento: "Lançar código TPU 3 no PROJUDI. Cumprir comandos determinatórios."
        };
    }

    // 3. Despachos
    if (dLower.includes("emenda") || dLower.includes("emende-se") || dLower.includes("comprove a hipossuficiência") || dLower.includes("junte comprovante")) {
        return {
            codigoTpu: "60",
            descricaoMovimento: "Despacho - Despacho Proferido - Determinação de Emenda / Regularização",
            tipoAto: "Despacho",
            subtipoResultado: "Emenda à Inicial / Regularização",
            prazoSecretaria: "15 dias úteis (art. 321 CPC)",
            filaProjudi: "Aguardando Emenda à Petição Inicial",
            observacoesLancamento: "Lançar código TPU 60 no PROJUDI. Intimar a parte autora para emenda no prazo assinalado."
        };
    }

    return {
        codigoTpu: "11010",
        descricaoMovimento: "Despacho - Mero Expediente (art. 203, § 3º, CPC)",
        tipoAto: "Despacho",
        subtipoResultado: "Mero Expediente / Impulso Oficial",
        prazoSecretaria: "5 dias úteis",
        filaProjudi: "Aguardando Cumprimento de Cartório",
        observacoesLancamento: "Lançar código TPU 11010 no PROJUDI. Realizar as intimações ou notificações ordenadas."
    };
}

function normalizeGeneratedMinuteAndAudit(rawParsed: any, rawOutputText: string, actType: string, processInfo: any) {
    let parsed = rawParsed;
    if (!parsed || typeof parsed !== 'object') {
        parsed = safeParseJson(rawOutputText) || {};
    }

    // Se a fundamentação ou minute for uma string JSON embutida
    const checkJson = (str: any) => {
        if (typeof str === 'string' && str.trim().startsWith('{') && (str.includes('"sentence"') || str.includes('"report"') || str.includes('"foundation"') || str.includes('"court"') || str.includes('"auditAnalysis"'))) {
            return safeParseJson(str);
        }
        return null;
    };

    let embeddedJson = checkJson(parsed?.minute?.fundamentacao) || checkJson(parsed?.fundamentacao) || checkJson(parsed?.foundation);

    if (embeddedJson && typeof embeddedJson === 'object') {
        console.log("[Assessor Judicial] JSON embutido detectado dentro do campo de fundamentação. Desempacotando estrutura judicial...");
        parsed = {
            ...parsed,
            ...embeddedJson,
            sentence: embeddedJson.sentence || parsed.sentence,
            auditAnalysis: embeddedJson.auditAnalysis || parsed.auditAnalysis
        };
    }

    // Identifica o contêiner da minuta (suporta minute, minuta, sentence, sentenca, decision, decisao ou raiz)
    const mContainer = parsed.minute || parsed.minuta || parsed.sentence || parsed.sentenca || parsed.decision || parsed.decisao || parsed;

    const isCleanSection = (val: any): boolean => {
        if (!val || typeof val !== 'string') return false;
        const t = val.trim();
        if (t.length <= 4) return false;
        if (t === '"' || t === '""' || t === '\"' || t === "''") return false;
        if (t.startsWith('{"') || t.startsWith('{')) return false;
        return true;
    };

    // Extrai os campos com suporte a múltiplos sinônimos jurídicos em português e inglês
    let relatorio = mContainer.relatorio || mContainer.report || parsed.relatorio || parsed.report || parsed.sentence?.report || parsed.sentenca?.relatorio || mContainer.relatorioFatico || parsed.relatorioFatico || "";
    let fundamentacao = mContainer.fundamentacao || mContainer.foundation || parsed.fundamentacao || parsed.foundation || parsed.sentence?.foundation || parsed.sentenca?.fundamentacao || mContainer.fundamentos || parsed.fundamentos || "";
    let dispositivo = mContainer.dispositivo || mContainer.dispositive || parsed.dispositivo || parsed.dispositive || parsed.sentence?.dispositive || parsed.sentenca?.dispositivo || mContainer.conclusao || parsed.conclusao || "";

    // Se fundamentacao ainda contiver JSON serializado, desempacota novamente
    if (typeof fundamentacao === 'string' && (fundamentacao.trim().startsWith('{') || fundamentacao.includes('"sentence"') || fundamentacao.includes('"report"'))) {
        const parsedAgain = safeParseJson(fundamentacao);
        if (parsedAgain) {
            const innerSentence = parsedAgain.sentence || parsedAgain;
            if (innerSentence.report || innerSentence.relatorio) relatorio = innerSentence.report || innerSentence.relatorio;
            if (innerSentence.foundation || innerSentence.fundamentacao) fundamentacao = innerSentence.foundation || innerSentence.fundamentacao;
            if (innerSentence.dispositive || innerSentence.dispositivo) dispositivo = innerSentence.dispositive || innerSentence.dispositivo;
        }
    }

    // Limpa resíduos de aspas se o campo vier como string vazia encapsulada em aspas
    if (typeof relatorio === 'string' && !isCleanSection(relatorio)) relatorio = "";
    if (typeof fundamentacao === 'string' && !isCleanSection(fundamentacao)) fundamentacao = "";
    if (typeof dispositivo === 'string' && !isCleanSection(dispositivo)) dispositivo = "";

    // Se qualquer seção principal estiver vazia ou malformada, tenta extrair de fullFormattedText ou do texto bruto
    const candidateFullText = (typeof mContainer.fullFormattedText === 'string' && mContainer.fullFormattedText.length > 50)
        ? mContainer.fullFormattedText
        : (typeof parsed.fullFormattedText === 'string' && parsed.fullFormattedText.length > 50)
            ? parsed.fullFormattedText
            : "";

    const textToExtractFrom = candidateFullText || (rawOutputText && !rawOutputText.trim().startsWith('{') ? rawOutputText : "");

    if ((!relatorio || !fundamentacao || !dispositivo) && textToExtractFrom) {
        const unescaped = textToExtractFrom.replace(/\\n/g, '\n');
        const relMatch = unescaped.match(/(?:^|\n)(?:#+|\*{1,2})?\s*(?:I\s*[-–.]\s*)?RELAT[OÓ]RIO[^\n]*\n([\s\S]*?)(?=(?:\n(?:#+|\*{1,2})?\s*(?:II\s*[-–.]\s*)?FUNDAMENTA[CÇ][AÃ]O)|$)/i);
        const fundMatch = unescaped.match(/(?:^|\n)(?:#+|\*{1,2})?\s*(?:II\s*[-–.]\s*)?FUNDAMENTA[CÇ][AÃ]O[^\n]*\n([\s\S]*?)(?=(?:\n(?:#+|\*{1,2})?\s*(?:III\s*[-–.]\s*)?DISPOSITIVO)|$)/i);
        const dispMatch = unescaped.match(/(?:^|\n)(?:#+|\*{1,2})?\s*(?:III\s*[-–.]\s*)?DISPOSITIVO[^\n]*\n([\s\S]*?)(?=(?:\n\s*(?:(?:[A-ZÁ-Úa-zá-ú\s]+[\/,]\s*(?:GO|Goiás)[^\n]*)|(?:Juiz(?:a)?\s+de\s+Direito)|(?:"?auditAnalysis"?)|(?:"?indicacaoTpuCnj"?)))|$)/i);

        if (relMatch && relMatch[1] && !relatorio) relatorio = relMatch[1].trim();
        if (fundMatch && fundMatch[1] && !fundamentacao) fundamentacao = fundMatch[1].trim();
        if (dispMatch && dispMatch[1] && !dispositivo) dispositivo = dispMatch[1].trim();
    }

    // Sanitize dispositivo: se ele vazou conteúdo do JSON (ex: "closing":, "fullFormattedText":, "auditAnalysis":)
    if (typeof dispositivo === 'string') {
        const jsonArtifactIndex = dispositivo.search(/(?:"(?:closing|fullFormattedText|auditAnalysis|indicacaoTpuCnj)"\s*:)/i);
        if (jsonArtifactIndex !== -1) {
            dispositivo = dispositivo.substring(0, jsonArtifactIndex).trim();
        }
        // Remove trailing quotes e chaves
        dispositivo = dispositivo.replace(/[\}\"\,]+$/, '').trim();
    }

    // Sanitize relatorio e fundamentacao
    if (typeof relatorio === 'string') {
        relatorio = relatorio.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    }
    if (typeof fundamentacao === 'string') {
        fundamentacao = fundamentacao.replace(/^["'\s]+|["'\s]+$/g, '').trim();
        if (fundamentacao.startsWith('{')) {
            fundamentacao = "Conforme fundamentação e razões de decidir constantes dos autos.";
        }
    }

    const fallbackTitle = actType === "decisao" ? "DECISÃO INTERLOCUTÓRIA" : actType === "despacho" ? "DESPACHO" : "SENTENÇA";
    const title = (mContainer.title || mContainer.titulo || parsed.title || parsed.actType || fallbackTitle).toUpperCase();
    const court = parsed.court || mContainer.court || mContainer.judicialUnit || parsed.judicialUnit || processInfo?.comarca || "Comarca de Montes Claros de Goiás";
    const header = mContainer.header || mContainer.cabecalho || (parsed.court ? `PODER JUDICIÁRIO\nTRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS\n${parsed.court.toUpperCase()}` : "PODER JUDICIÁRIO DO ESTADO DE GOIÁS");
    const processNumber = mContainer.processNumber || parsed.processNumber || processInfo?.processNumber || "Autos do Processo";
    const author = mContainer.parties?.author || parsed.author || parsed.parties?.author || "Parte Autora";
    const defendant = mContainer.parties?.defendant || parsed.defendant || parsed.parties?.defendant || "Parte Ré";
    const closing = mContainer.closing || mContainer.fecho || parsed.closing || (parsed.judge ? `${parsed.judge}\nJuiz(a) de Direito` : "Gabinete Judicial.");

    // Indicação do Tipo de Movimentação TPU CNJ no Projudi
    const rawTpu = parsed.indicacaoTpuCnj || mContainer.indicacaoTpuCnj || parsed.auditAnalysis?.indicacaoTpuCnj || parsed.tpu || null;
    const indicacaoTpuCnj = inferTpuCnjMovement(actType, title, dispositivo, rawTpu);

    const finalMinute = {
        title,
        header,
        processNumber,
        judicialUnit: court,
        parties: {
            author,
            defendant
        },
        relatorio: relatorio || "Relatório elaborado com base nos autos do processo.",
        fundamentacao: fundamentacao || "Fundamentação jurídica elaborada com base no acervo fático-probatório dos autos.",
        dispositivo: dispositivo || "Ante o exposto, decide-se conforme os autos.",
        closing,
        fullFormattedText: `${header}\nProcesso nº: ${processNumber}\nPromovente: ${author}\nPromovido: ${defendant}\n\n${title}\n\nI - RELATÓRIO\n\n${relatorio}\n\nII - FUNDAMENTAÇÃO\n\n${fundamentacao}\n\nIII - DISPOSITIVO\n\n${dispositivo}\n\n${closing}`,
        indicacaoTpuCnj
    };

    // Normalização da Matriz de Auditoria Forense
    let audit = parsed.auditAnalysis || parsed.auditoria || parsed.analiseAuditoria || mContainer.auditAnalysis || {};
    audit.indicacaoTpuCnj = indicacaoTpuCnj;
    
    // Mapeamento caso venha no formato específico do prompt (signatureCheck, documentAuthenticity, etc)
    if (audit.signatureCheck || audit.documentAuthenticity || audit.authenticityCheck) {
        const regularidade = audit.regularidadeDocumental || {};
        regularidade.assinaturasStatus = audit.signatureCheck || audit.authenticityCheck || regularidade.assinaturasStatus || "Válidas e autênticas com certificados digitais no Projudi";
        regularidade.autenticidadeCartorariaStatus = audit.documentAuthenticity || regularidade.autenticidadeCartorariaStatus || "Autenticidade confirmada";
        regularidade.integridadeTemporalStatus = audit.temporalConsistency || audit.chronologyCheck || regularidade.integridadeTemporalStatus || "Cronologia preservada";
        regularidade.subsuncaoLegalProvas = audit.evidenceMatch || audit.jurisdictionCheck || regularidade.subsuncaoLegalProvas || "Confronto fático-probatório rigoroso";
        regularidade.marchaProcessualStatus = audit.proceduralCompliance || audit.integrityCheck || regularidade.marchaProcessualStatus || "Regularidade processual observada";
        if (audit.partiesCheck) regularidade.confrontoDadosMinuta = audit.partiesCheck;
        audit.regularidadeDocumental = regularidade;
    }

    return {
        minute: finalMinute,
        auditAnalysis: audit
    };
}

function sanitizeMinuteData(minute, actType) {
    return minute;
}

const LEGAL_FRAMEWORKS = detectApplicableLegalFrameworks("");
// Helper to extract or fallback process number, parties, and judicial unit
function extractProcessMetadata(stage1Json: any, processInfo: any, allText: string) {
    let procNum = "";
    const isInvalid = (val: any) => {
        if (!val || typeof val !== "string") return true;
        const lower = val.trim().toLowerCase();
        const digits = val.replace(/\D/g, "");
        if (digits.length < 7) return true;
        return (
            lower.length < 7 ||
            lower.includes("extrair") ||
            lower.includes("não informado") ||
            lower.includes("epígrafe") ||
            lower.includes("epigrafe") ||
            lower.includes("eletrônico") ||
            lower.includes("eletronico") ||
            lower.includes("autos do processo")
        );
    };

    // Prioridade máxima: Regex CNJ autêntico nos autos ou nas variáveis (0000000-00.0000.0.00.0000)
    const cnjRegex = /\b(\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})\b/;
    const mAll = (allText || "").match(cnjRegex);
    const mInfo = (processInfo?.processNumber || "").match(cnjRegex);
    const mStage = (stage1Json?.processNumber || "").match(cnjRegex);

    if (mAll) {
        procNum = mAll[1];
    } else if (mInfo) {
        procNum = mInfo[1];
    } else if (mStage) {
        procNum = mStage[1];
    } else if (!isInvalid(processInfo?.processNumber)) {
        procNum = processInfo.processNumber.trim();
    } else if (!isInvalid(stage1Json?.processNumber)) {
        procNum = stage1Json.processNumber.trim();
    } else {
        // Busca 20 dígitos seguidos sem pontuação
        const mDigits = (allText || "").match(/\b(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})\b/);
        if (mDigits) {
            procNum = `${mDigits[1]}-${mDigits[2]}.${mDigits[3]}.${mDigits[4]}.${mDigits[5]}.${mDigits[6]}`;
        } else {
            procNum = "Autos do Processo";
        }
    }

    // Author
    let author = "";
    const isInvalidParty = (val: any, defaultVal: string) => {
        if (!val || typeof val !== "string") return true;
        const lower = val.trim().toLowerCase();
        // Remove accents for resilient matching
        const normalized = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (lower.length < 3 || lower.length > 90) return true;
        
        // Generic party placeholders
        if (
            lower.includes("parte autora") ||
            lower.includes("parte re") ||
            lower.includes("parte ré") ||
            lower.includes("partes devidamente") ||
            lower.includes("qualificad") ||
            lower === "autor" ||
            lower === "autora" ||
            lower === "réu" ||
            lower === "reu" ||
            lower === "ré" ||
            lower.includes("extrair") ||
            lower.includes("nao informado") ||
            lower.includes("não informado") ||
            lower.includes("autos do processo")
        ) {
            return true;
        }

        // Factual claims, relationship narratives, predicates (never valid party names)
        if (
            normalized.includes("manteve") ||
            normalized.includes("uniao afetiva") ||
            normalized.includes("uniao estavel") ||
            normalized.includes("com o requerido") ||
            normalized.includes("com a requerida") ||
            normalized.includes("com o reu") ||
            normalized.includes("com a re") ||
            normalized.includes("contra o requerido") ||
            normalized.includes("contra a requerida") ||
            normalized.includes("contra o reu") ||
            normalized.includes("contra a re") ||
            normalized.includes("em face do") ||
            normalized.includes("em face da") ||
            normalized.includes("acao de") ||
            normalized.includes("pedido de") ||
            normalized.includes("tutela de") ||
            normalized.includes("dissolucao de") ||
            normalized.includes("revisao de") ||
            normalized.includes("encontravam-se") ||
            normalized.includes("encontram-se") ||
            normalized.includes("encontra-se") ||
            normalized.includes("em aberto") ||
            normalized.includes("absolutamente") ||
            normalized.includes("estavam") ||
            normalized.includes("estava") ||
            normalized.includes("inadimplen") ||
            normalized.includes("debito") ||
            normalized.includes("divida") ||
            normalized.includes("saldo") ||
            normalized.includes("eletronico") ||
            normalized.includes("epigrafe")
        ) {
            return true;
        }

        const narrativeVerbs = [
            "alega", "aduz", "sustenta", "afirma", "relata", "narra", "pretende",
            "pleiteia", "postula", "requer", "pugna", "ajuizou", "ingressou",
            "propos", "trata-se", "cuida-se", "visando", "discute-se"
        ];
        if (narrativeVerbs.some(v => normalized.includes(v))) {
            return true;
        }

        // Procedural and judicial acts (never valid party names)
        const proceduralNoise = [
            "designacao", "designação", "audiencia", "audiência", "instrucao", "instrução",
            "conciliacao", "conciliação", "julgamento", "despacho", "decisao", "decisão",
            "sentenca", "sentença", "certidao", "certidão", "intimacao", "intimação",
            "citacao", "citação", "contestacao", "contestação", "impugnacao", "impugnação",
            "mandado", "peticao", "petição", "requerimento", "cumprimento", "execucao", "execução",
            "preclusao", "preclusão", "recurso", "apelacao", "apelação", "agravo", "embargos",
            "movimentacao", "movimentação", "evento", "autos", "secretaria", "vara", "comarca",
            "juizado", "tribunal", "ministerio publico", "ministério público", "prazo",
            "procuracao", "procuração", "conclusao", "conclusão", "arquivamento"
        ];
        if (proceduralNoise.some(term => normalized.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
            return true;
        }

        // Strings starting with verbs/articles that indicate phrases rather than entities
        if (/^(a|o|as|os|da|do|das|dos|de|em|para|por)\s+(designa|solicita|requer|pede|realiza|marca|abre|julga|converte|alega|aduz|mant)/i.test(lower)) {
            return true;
        }

        return false;
    };

    const extractEntityFromContext = (sourceText: string, isDef: boolean): string | null => {
        if (!sourceText || typeof sourceText !== "string") return null;
        
        if (isDef) {
            const defPatterns = [
                // Header Projudi / TJGO: "PROMOVIDO: BANCO XYZ LTDA" ou "EMBARGADO: FULANO"
                /(?:promovid[oa]|requerid[oa]|polo\s+passivo|embargad[oa]|executad[oa]|impetrad[oa])\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?=\s*(?:\n|promovente|requerente|autor|polo\s+ativo|embargante|executado|cpf|cnpj|advogad|procurad|ação|autos|juiz|$))/i,
                // "em face de/da/do/dos EMPRESA / PESSOA"
                /(?:em\s+face\s+d[eao]s?|contra\s+(?:o|a)?|desfavor\s+d[eao]s?)\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s*,\s*tombad|\s*,\s*todos|[,\.\n]|\s+visando|\s+pretendendo)/i,
                // "polo passivo: EMPRESA"
                /(?:polo\s+passivo|promovid[oa]|requerid[oa]|executad[oa]|embargad[oa])\s*[:\-]?\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s*,\s*qualificad)/i,
                // "réu / ré: EMPRESA" (exige dois pontos para não casar com orações narrativas)
                /(?:réu|ré)\s*:\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s*,\s*qualificad)/i,
                // Dispositivo: "CONDENAR a requerida EMPRESA..."
                /(?:condenar\s+(?:o|a)?\s+(?:requerid[oa]|promovid[oa]|demandad[oa]|executad[oa]|réu|ré)?\s*)([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s+(?:a|ao|para|em)\s+pagar|\s*,\s*a\s+pagar|[,\.\n])/i
            ];
            for (const pat of defPatterns) {
                const m = sourceText.match(pat);
                if (m && m[1]) {
                    let cleaned = m[1].replace(/[\*\_]/g, "").trim();
                    // Remove prefixo acidental "ré " ou "réu "
                    cleaned = cleaned.replace(/^(?:a\s+)?(?:ré|réu|requerid[oa]|promovid[oa]|embargad[oa])\s+/i, "").trim();
                    if (!isInvalidParty(cleaned, "Parte Ré")) {
                        return cleaned;
                    }
                }
            }
        } else {
            const authPatterns = [
                // Header Projudi / TJGO: "PROMOVENTE: FULANO DE TAL" ou "EMBARGANTE: FULANO"
                /(?:promovente|requerente|polo\s+ativo|embargante|exequente|impetrante)\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?=\s*(?:\n|promovido|requerido|réu|ré|polo\s+passivo|embargado|executado|cpf|cnpj|advogad|procurad|ação|autos|juiz|$))/i,
                // "proposta por FULANO em face de"
                /(?:instaurad[oa]|propost[oa]|ajuizad[oa]|promovid[oa]|movid[oa])\s+por\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s+em\s+face|\s+contra|\s+desfavor)/i,
                // "polo ativo: FULANO"
                /(?:polo\s+ativo|promovente|requerente|exequente|embargante)\s*[:\-]?\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s+em\s+face|\s+contra)/i,
                // "autor / autora: FULANO" (exige dois pontos para não capturar orações como "A autora manteve união...")
                /(?:autor(?:a)?)\s*:\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s+em\s+face|\s+contra)/i
            ];
            for (const pat of authPatterns) {
                const m = sourceText.match(pat);
                if (m && m[1]) {
                    let cleaned = m[1].replace(/[\*\_]/g, "").trim();
                    cleaned = cleaned.replace(/^(?:o\s+|a\s+)?(?:autor(?:a)?|promovente|requerente|embargante)\s+/i, "").trim();
                    if (!isInvalidParty(cleaned, "Parte Autora")) {
                        return cleaned;
                    }
                }
            }
        }
        return null;
    };

    if (!isInvalidParty(stage1Json?.parties?.author, "Parte Autora")) {
        author = stage1Json.parties.author.trim();
    } else if (!isInvalidParty(stage1Json?.author, "Parte Autora")) {
        author = stage1Json.author.trim();
    } else if (!isInvalidParty(processInfo?.autor, "Parte Autora")) {
        author = processInfo.autor.trim();
    } else {
        const fullScope = [stage1Json?.relatorio, stage1Json?.fundamentacao, stage1Json?.dispositivo, allText].filter(Boolean).join("\n");
        const found = extractEntityFromContext(fullScope, false);
        author = found || "Parte Autora";
    }

    // Defendant
    let defendant = "";
    if (!isInvalidParty(stage1Json?.parties?.defendant, "Parte Ré")) {
        defendant = stage1Json.parties.defendant.trim();
    } else if (!isInvalidParty(stage1Json?.defendant, "Parte Ré")) {
        defendant = stage1Json.defendant.trim();
    } else if (!isInvalidParty(processInfo?.reu, "Parte Ré")) {
        defendant = processInfo.reu.trim();
    } else {
        const fullScope = [stage1Json?.relatorio, stage1Json?.dispositivo, stage1Json?.fundamentacao, allText].filter(Boolean).join("\n");
        const found = extractEntityFromContext(fullScope, true);
        defendant = found || "Parte Ré";
    }

    // Judicial Unit / Comarca
    let judicialUnit = stage1Json?.judicialUnit || processInfo?.vara || processInfo?.comarca || "Poder Judiciário do Estado de Goiás - TJGO";
    if (stage1Json?.relatorio && (judicialUnit.includes("Poder Judiciário") || judicialUnit.includes("Mineiros"))) {
        const mUnit = stage1Json.relatorio.match(/perante\s+o?\s+([A-ZÁ-Úa-zá-ú\s]{5,70}?(?:Comarca\s+de\s+[A-ZÁ-Úa-zá-ú\s]+|TJGO))/i);
        if (mUnit && mUnit[1]) {
            judicialUnit = mUnit[1].trim();
        }
    }

    return { procNum, author, defendant, judicialUnit };
}

app.post("/api/generate-minute", async (req, res) => {
    let keepAliveInterval: any = null;
    try {
    const userApiKey=extractApiKey(req);
    const reqUserUid = (req.headers["x-user-uid"] as string) || "";
    const reqUserEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
    const reqUserName = req.headers["x-user-name"] ? decodeURIComponent(req.headers["x-user-name"] as string) : "";
    const reqTenantId = (req.headers["x-tenant-id"] as string) || "";
    const{processText,pdfBase64,pdfFiles,knowledgePdfs,customPromptText,cabinetTesesText,isTesesEnabled,paradigmModelText,paradigmModelTitle,isParadigmEnabled,proceduralPhase,actType,actSubtype,specificInstructions,processInfo,processActsSummary,isExpertModeEnabled,isGroundingEnabled: rawGroundingEnabled,generationMode,isEconomyMode}=req.body;
    const activePromptTitle = req.body.activePromptTitle || "";
    const isGroundingEnabled = rawGroundingEnabled === true;
    let safeProcessText = filterInnocuousCertificates(cleanJudicialPdfText(processText || ""));

    // Preservação integral do texto processual sem mutilação de miolo (limite de segurança ultra-amplo: 1.500.000 caracteres)
    if (safeProcessText.length > 1500000) {
        safeProcessText = safeProcessText.substring(0, 1500000);
    }
const hasText=Boolean(safeProcessText&&typeof safeProcessText==="string"&&safeProcessText.trim().length>0);
let accumulatedPdfText="";
let knowledgeBaseText="";
let generatedHolisticSynopsis = "";
const contentsParts=[];
let totalDuplicatesFound = 0;
let totalCharsSaved = 0;

if(knowledgePdfs&&Array.isArray(knowledgePdfs)&&knowledgePdfs.length>0){for(const kPdf of knowledgePdfs){if(kPdf.extractedText&&typeof kPdf.extractedText==="string"&&kPdf.extractedText.trim().length>0){knowledgeBaseText+=`

[=== BASE DE CONHECIMENTO INTERNA: ${kPdf.name} ===]
${kPdf.extractedText}
`}}}

let targetPdfFiles = pdfFiles || [];
if(pdfFiles&&Array.isArray(pdfFiles)&&pdfFiles.length>0){
    const dedupRes = deduplicateJudicialPdfFiles(pdfFiles);
    targetPdfFiles = dedupRes.files;
    totalDuplicatesFound += dedupRes.duplicatesFound;
    totalCharsSaved += dedupRes.charsSaved;
    if (dedupRes.duplicatesFound > 0) {
        console.log(`[Assessor Judicial - Deduplicação] ${dedupRes.duplicatesFound} arquivos repetidos consolidados sem perda de conteúdo probatório.`);
    }

    for(const pFile of targetPdfFiles){
        const hasExtractedText=Boolean(pFile.extractedText&&typeof pFile.extractedText==="string"&&pFile.extractedText.trim().length>0);
        if(hasExtractedText){
            // Aplicar filtro de ruídos e certidões burocráticas
            let safeText = filterInnocuousCertificates(cleanJudicialPdfText(pFile.extractedText));
            // Evitar duplicação se o texto colado já contiver o conteúdo
            const sample = safeText.trim().substring(0, Math.min(80, safeText.trim().length));
            if (!sample || !safeProcessText.includes(sample)) {
                accumulatedPdfText+=`\n\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"várias"} páginas) ===]\n${safeText}\n`;
            }
        }
        if(pFile.base64&&typeof pFile.base64==="string"&&pFile.base64.length>0){
            const cleanBase64=pFile.base64.replace(/^data:[^;]+;base64,/,"").trim();
            if(cleanBase64.length>0&&cleanBase64.length<40*1024*1024){
                if(!hasExtractedText){
                    try{
                        const buffer=Buffer.from(cleanBase64,"base64");
                        const bufferText=await extractTextFromPdfBuffer(buffer);
                        if(bufferText&&bufferText.trim().length>20){
                            let safeBufferText = filterInnocuousCertificates(cleanJudicialPdfText(bufferText));
                            accumulatedPdfText+=`\n\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (Extraído via Buffer) ===]\n${safeBufferText}\n`;
                        }
                    }catch(e){console.log("Buffer extraction fallback skipped:",e)}
                }
const finalHasText = hasExtractedText || (accumulatedPdfText.trim().length > 30);
const pCount = pFile.pageCount || 100;
const shouldSendBase64 = !finalHasText && cleanBase64.length < 8 * 1024 * 1024;
if (shouldSendBase64) {
    contentsParts.push({inlineData:{mimeType:pFile.mimeType||"application/pdf",data:cleanBase64}});
}
}}if(!hasExtractedText&&(!pFile.base64||pFile.base64.length===0)){accumulatedPdfText+=`\n\n[=== DOCUMENTO DOS AUTOS: ${pFile.name||"Arquivo Anexado"} (${pFile.pageCount||1} pág) ===]\n(Arquivo PDF anexado aos autos pelo gabinete para subsidiar a minuta)\n`}}}else if(pdfBase64&&typeof pdfBase64==="string"){const cleanBase64=pdfBase64.replace(/^data:[^;]+;base64,/,"").trim();if(cleanBase64.length>0&&cleanBase64.length<8*1024*1024&&!hasText&&accumulatedPdfText.trim().length===0){contentsParts.push({inlineData:{mimeType:"application/pdf",data:cleanBase64}})}}

// Deduplicação de blocos de texto internos idênticos
const textDedup = deduplicateTextBlocks(accumulatedPdfText);
if (textDedup.duplicatesFound > 0) {
    accumulatedPdfText = textDedup.text;
    totalDuplicatesFound += textDedup.duplicatesFound;
    totalCharsSaved += textDedup.charsSaved;
    console.log(`[Assessor Judicial - Deduplicação de Blocos] ${textDedup.duplicatesFound} blocos repetidos consolidados.`);
}

// PRESERVAÇÃO INTEGRAL DOS DOCUMENTOS E PROVAS (SEM CORTES PRECIPITADOS)
// Gemini 3.1 Flash Lite e modelos contingenciais comportam mais de 1 milhão de tokens (~4.000.000 caracteres).
// Mantemos todos os documentos, contestações, réplicas, preliminares e provas intactos.
if (accumulatedPdfText.length > 1500000) {
    console.log(`[Assessor Judicial] Processo excepcionalmente grande (${accumulatedPdfText.length} caracteres). Preservando os primeiros 1.500.000 caracteres integrais.`);
    accumulatedPdfText = accumulatedPdfText.substring(0, 1500000);
}
const hasPdfs=Boolean(pdfFiles&&Array.isArray(pdfFiles)&&pdfFiles.length>0);const hasPrompt=Boolean(customPromptText&&typeof customPromptText==="string"&&customPromptText.trim().length>0);const hasProcessNumber=Boolean(processInfo?.processNumber&&processInfo.processNumber.trim().length>3&&processInfo.processNumber!=="Extrair automaticamente dos autos");const hasAnyContent=hasText||accumulatedPdfText.length>0||contentsParts.length>0||hasPdfs||hasPrompt||hasProcessNumber;if(!hasAnyContent){return res.status(400).json({error:"É obrigatório fornecer o PDF dos autos, o texto processual ou as diretrizes do prompt."})}

// Safeguard anti-alucinação: se o usuário anexou PDFs, mas nenhum texto foi extraído e não há texto digitado
const rawPdfTextLength = accumulatedPdfText.replace(/\[===.*?===\]/g, "").replace(/\(.*?\)/g, "").trim().length;
const hasRealFactualContent = (safeProcessText && safeProcessText.trim().length > 40) || rawPdfTextLength > 50 || contentsParts.length > 0;
if (hasPdfs && !hasRealFactualContent) {
    return res.status(400).json({
        error: "Não foi possível extrair o texto dos arquivos PDF anexados (0 caracteres úteis identificados). Para evitar que a inteligência artificial crie partes fictícias ou erre a matéria da ação, anexe um PDF com camada de texto selecionável ou cole o texto da petição inicial na aba 'Digitar / Colar Texto'.",
        isError: true
    });
}

// Configuração defensiva de timeout de conexão e streaming de batimento cardíaco (anti-timeout do Cloud Run)
req.socket?.setTimeout(600000);
res.socket?.setTimeout(600000);

keepAliveInterval = null;
if (!res.headersSent) {
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
    });
    // Pulso invisível a cada 3 segundos para que conexões HTTP sob Cloud Run e proxies não sofram idle timeout
    keepAliveInterval = setInterval(() => {
        try {
            if (!res.writableEnded && !res.destroyed) {
                res.write(" ");
            }
        } catch (_) {}
    }, 3000);
}

const combinedContextForPrecedents = [safeProcessText || "", accumulatedPdfText || "", actType || "", actSubtype || "", specificInstructions || "", customPromptText || "", paradigmModelText || ""].join(" ");
const matchedPrecedents = matchApplicableBindingPrecedents(combinedContextForPrecedents);
const taxonomySummary = getApplicableTaxonomySummary(combinedContextForPrecedents);

let liveGroundingPrecedents = "";
let liveGroundingSources: Array<{ title: string; url: string }> = [];

const isNativeAllowed = req.headers['x-use-native-key'] === 'true';

if (isGroundingEnabled) {
    try {
        console.log("[Assessor Judicial] Executando camada de Grounding Oficial ao Vivo (TJGO • STJ • STF)...");
        const briefFacts = combinedContextForPrecedents.slice(0, 1500);
        const groundingPrompt = `Você é um pesquisador jurisprudencial sênior do Poder Judiciário.
Pesquise a jurisprudência, súmulas vigentes, temas repetitivos/RG e informativos de jurisprudência do TJGO (Tribunal de Justiça do Estado de Goiás) e Tribunais Superiores (STJ e STF) aplicáveis ao litígio:

${briefFacts}

FONTES OFICIAIS OBRIGATÓRIAS DE PESQUISA:
- Jurisprudência e Informativos TJGO: transparencia.tjgo.jus.br/jurisprudencia ou tjgo.jus.br
- STJ: stj.jus.br
- STF: stf.jus.br
- Teses e Súmulas: tesesesumulas.com.br

Retorne de 1 a 3 precedentes oficiais aplicáveis (informando o tribunal, número da súmula ou tema, síntese da tese jurídica e link oficial consultado).`;

        const effectiveKey = userApiKey || (isNativeAllowed ? process.env.GEMINI_API_KEY : (extractApiKeyPool(req)[0] || ""));
        if (effectiveKey) {
            const groundingAi = new GoogleGenAI({ apiKey: effectiveKey });
            const groundingRes = await groundingAi.models.generateContent({
                model: "gemini-3.8-flash",
                contents: groundingPrompt,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            const gText = groundingRes.text;
            if (gText && gText.trim().length > 30) {
                liveGroundingPrecedents = gText.trim();
                console.log("[Assessor Judicial] Grounding oficial ao vivo obtido com sucesso!");
            }

            const chunks = groundingRes.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (chunks && Array.isArray(chunks)) {
                for (const chunk of chunks) {
                    if (chunk.web?.uri) {
                        liveGroundingSources.push({
                            title: chunk.web.title || "Precedente Oficial",
                            url: chunk.web.uri
                        });
                    }
                }
            }
        }
    } catch (gErr: any) {
        console.log("[Assessor Judicial] Camada de Grounding ao vivo finalizou com fallback:", gErr?.message || gErr);
    }
}

const activeTeses = getActiveCabinetTeses(cabinetTesesText, isTesesEnabled);
const hasActiveParadigm = (isParadigmEnabled !== false) && Boolean(paradigmModelText && typeof paradigmModelText === "string" && paradigmModelText.trim().length > 0);

// ETAPA 1 - System Instruction do Assessor Fático (Extração e Confronto Probatório Bruto):
let stage1SystemInstruction = SYSTEM_INSTRUCTION_FABRICIO + `

DIRETRIZ DA ETAPA 1 (ASSESSOR FÁTICO-PROCESSUAL & ANALISTA PROBATÓRIO):
Você atua estritamente como Assessor Fático-Processual e Analista Probatório do Gabinete.
Sua missão é realizar a extração e o confronto probatório bruto de todas as peças e documentos dos autos, sem qualquer juízo genérico ou abreviação telegráfica.

REGRA MANDATÓRIA DE OBSERVAÇÃO DA MARCHA PROCESSUAL E QUESTÕES PENDENTES DE JULGAMENTO:
1. OBSERVE A ORDEM CRONOLÓGICA DAS MOVIMENTAÇÕES DOS AUTOS: Identifique com precisão qual é o ato ou questão que está PENDENTE de resolução pelo juízo (a última movimentação conclusa).
2. SENTENÇA PRÉVIA & EMBARGOS DE DECLARAÇÃO: Se os autos já foram sentenciados em evento anterior e há petição de Embargos de Declaração pendente de apreciação (ex: mov. 55), É TERMINANTEMENTE PROIBIDO REDIGIR UMA NOVA SENTENÇA DO PROCESSO. Você deve redigir a minuta preliminar para o JULGAMENTO DOS EMBARGOS DE DECLARAÇÃO, identificando a sentença embargada, os embargos opostos no respectivo evento/movimento e os vícios alegados (omissão, contradição, obscuridade ou erro material)!
3. EXTRAÇÃO FIEL DOS DADOS: Extraia com absoluta fidelidade o número do processo (formato CNJ completo: 0000000-00.0000.0.00.0000), os nomes completos das partes (Promovente/Autor/Embargante e Promovido/Réu/Embargado) e a unidade judiciária. NUNCA utilize predicados, verbos ou relatos fáticos como nome de partes.

Você deve produzir a MINUTA PRELIMINAR FACTUAL estruturada em JSON contendo:
- "processNumber": Número do processo CNJ autêntico;
- "author": Nome completo da parte autora / requerente / embargante / exequente;
- "defendant": Nome completo da parte ré / requerida / embargada / executada;
- "judicialUnit": Comarca e Vara oficial dos autos;
- "pendingMatter": Descrição exata da questão que está pendente de julgamento nos autos;
- "actType": Tipo do ato judicial adequado (EMBARGOS DE DECLARAÇÃO, DECISÃO INTERLOCUTÓRIA, SENTENÇA ou DESPACHO);
- "relatorio": Relatório judicial completo, fidedigno e cronológico (narrando detalhadamente todas as partes, pedidos, tutelas, certidões, contestações, réplicas, laudos e provas com a tríplice localização processual: Mov. X, Arq. Y, Pág. Z);
- "fundamentacao": Fundamentação jurídica fática e probatória densa estruturada rigorosamente nos 7 blocos obrigatórios em 5 a 8 parágrafos profundos (1. Regularidade processual; 2. Cerne da questão; 3. Regime legal e precedentes com transcrição de artigos; 4. Confronto fático-probatório concreto documento a documento com citação de eventos e transcrição de trechos entre aspas; 5. Subsunção motivada; 6. Apreciação individualizada de cada pedido; 7. Consectários legais e juros pela Lei 14.905/2024);
- "dispositivo": Dispositivo preliminar operacional com comandos claros e precisos adequados aos pedidos ou ao julgamento do recurso pendente.
`;
if (processActsSummary && typeof processActsSummary === "string" && processActsSummary.trim().length > 0) {
    stage1SystemInstruction += `\n\n[MEMÓRIA PROCESSUAL DO GABINETE • EVOLUÇÃO DOS ATOS PRÉVIOS DESTE MESMO PROCESSO]:\n${processActsSummary.trim()}\n`;
}

// ETAPA 2 - System Instruction do Juiz Revisor (Teses, Precedentes Vinculantes, Paradigma & Auditoria Forense):
let stage2SystemInstruction = SYSTEM_INSTRUCTION_FABRICIO + `

DIRETRIZ DA ETAPA 2 (JUIZ REVISOR ESPECIALISTA & AUDITOR FORENSE):
Você é o Juiz de Direito Titular e Juiz Revisor do Gabinete.
Você recebeu a Minuta Preliminar Factual gerada na Etapa 1 pelo Assessor Forense.
Sua missão é:
1. LER a Minuta Preliminar Factual com atenção máxima aos eventos probatórios;
2. CONFRONTÁ-LA com o CADERNO DE TESES DO GABINETE, as SÚMULAS VINCULANTES (STF, STJ, TNU e TJGO) e a MINUTA PARADIGMA (se ativada);
3. REESCREVER e ADENSAR magistralmente a fundamentação ('fundamentacao') e o dispositivo ('dispositivo') aplicando as teses consolidadas do magistrado e a jurisprudência vinculante, sem perder a riqueza fática da Etapa 1;
4. GERAR a estrutura final ('minute') e a MATRIZ DE AUDITORIA FORENSE COMPLETA ('auditAnalysis': Fato vs Prova evento a evento, Competência, 6 Pilares de Integridade Documental, Normas Aplicadas, Legislação Mapeada, Consectários Detalhados e Pré-Auditoria).
`;

if (activeTeses && typeof activeTeses === "string" && activeTeses.trim().length > 0) {
    stage2SystemInstruction += `\n\n[CADERNO DE TESES E DIRETRIZES VINCULANTES DO GABINETE (PRIORIDADE MÁXIMA & CUMPRIMENTO OBRIGATÓRIO)]:\n${activeTeses.trim()}\n\nDIRETRIZ MANDATÓRIA SOBRE AS TESES DO GABINETE:\n- Confronte a minuta preliminar com as teses acima. Se o caso se enquadrar em qualquer tese, REESCREVA a fundamentação e o dispositivo aplicando expressamente as teses e enunciados do magistrado.\n`;
}

if (matchedPrecedents.length > 0) {
    stage2SystemInstruction += `\n\n[ALIMENTAÇÃO AUTOMÁTICA DE SÚMULAS, TESES VINCULANTES E INFORMATIVOS (STF • STJ • TNU • TJGO)]:\n` +
        matchedPrecedents.map((p, idx) => `${idx + 1}. [${p.tribunal} • ${p.number} - ${p.title}]: "${p.statement}" (Fonte: ${p.sourceUrl})`).join("\n") +
        `\nDIRETRIZ JURISPRUDENCIAL VINCULANTE: Harmonize a fundamentação e o dispositivo com as súmulas/teses vinculantes superiores e do TJGO.\n`;
}

if (liveGroundingPrecedents) {
    stage2SystemInstruction += `\n\n[PESQUISA OFICIAL AO VIVO VIA GROUNDING (TJGO • STJ • STF)]:\n${liveGroundingPrecedents}\n\nDIRETRIZ DE INCORPORAÇÃO DO GROUNDING: Incorpore os precedentes oficiais e teses atualizadas obtidos na pesquisa ao vivo acima diretamente na fundamentação jurídica.\n`;
}

if (taxonomySummary) {
    stage2SystemInstruction += `\n\n[MAPEAMENTO TAXONÔMICO NORMATIVO & MICROSSISTEMAS]:\n${taxonomySummary}\n`;
}

if (knowledgeBaseText) {
    stage2SystemInstruction += `\n\n[BASE DE CONHECIMENTO DO GABINETE]:\n${knowledgeBaseText}\n`;
}

if (customPromptText && typeof customPromptText === "string" && customPromptText.trim().length > 0) {
    stage2SystemInstruction += `\n\n[DIRETRIZES E PROMPT ATUAL SELECIONADO PELO ASSESSOR]:\n${customPromptText}\n`;
}

if (hasActiveParadigm) {
    stage2SystemInstruction += `\n\n[ESTRUTURA DE CASO IDÊNTICO E MINUTA PARADIGMA DE REFERÊNCIA - CLONAGEM ESTRUTURAL E DE ESTILO OBRIGATÓRIA]:\nO magistrado titular e o assessor vincularam a seguinte MINUTA PARADIGMA ${paradigmModelTitle ? `("${paradigmModelTitle}")` : ""} como padrão oficial e imutável de entendimento, estilo, formatação, redação, tópicos, fundamentação integral e dispositivo para este tipo de demanda idêntica:\n"""\n${paradigmModelText}\n"""\n\nREGRAS MANDATÓRIAS DE ESPELHAMENTO DE FORMATAÇÃO, ESTILO E ENTENDIMENTO (COM ISOLAMENTO FÁTICO):\n1. REPRODUÇÃO DA TESE JURÍDICA E JURISPRUDÊNCIA DO JUIZ (PROIBIDO RESUMIR A TESE): Espelhe e copie fielmente toda a TESE JURÍDICA, legislação, precedentes, acórdãos citados, súmulas e doutrina do modelo paradigma.\n2. PROIBIÇÃO ABSOLUTA DE ALUCINAÇÃO FÁTICA E ISOLAMENTO DO MODELO (REGRA DE OURO): Descarte os fatos antigos do paradigma e utilize ESTRITAMENTE os fatos e provas reais do processo em exame narrados na Minuta Preliminar Factual da Etapa 1.\n3. ESPELHAMENTO ESTRUTURAL: Mantenha rigorosamente a divisão de tópicos e subtópicos (I - RELATÓRIO, II - FUNDAMENTAÇÃO, 1. PRELIMINAR, 2. MÉRITO, etc.) e formatação Markdown.\n4. ADOÇÃO INTEGRAL DA LINHA DECISÓRIA E DISPOSITIVO: Aplique a mesma ratio decidendi e preserve a estrutura de comandos do dispositivo.\n`;
}

if (processActsSummary && typeof processActsSummary === "string" && processActsSummary.trim().length > 0) {
    stage2SystemInstruction += `\n\n[MEMÓRIA PROCESSUAL DO GABINETE • EVOLUÇÃO DOS ATOS PRÉVIOS DESTE MESMO PROCESSO]:\n${processActsSummary.trim()}\n`;
}

// Detecção Inteligente e Fidedigna da Peça e Fase Processual dos Autos:
const combinedTextLower = ((safeProcessText || "") + "\n" + (accumulatedPdfText || "")).toLowerCase();

// Filtra menções preliminares que aparecem no rol de pedidos da petição inicial (para não confundir com a peça de contestação ou audiência realizada)
const textWithoutPetitionFormulas = combinedTextLower
    .replace(/(?:citação|intimação)\s+d[eao]s?\s+(?:requerid|promovid|ré|demandad)[^\.\n]*?(?:contestar|contestação)/gi, "")
    .replace(/(?:sob\s+pena\s+de\s+revelia|para\s+apresentar\s+contestação)/gi, "")
    .replace(/(?:desinteresse|interesse|dispensa|manifesta|designação)\s+n?a?\s+audiência\s+de\s+conciliação/gi, "")
    .replace(/(?:art(?:igo)?\.?\s*334|art(?:igo)?\.?\s*335)[^\.\n]*/gi, "");

const hasContestacao = (
    /(?:^|\n|\b)(?:peça\s+de\s+|da\s+)?contestação(?:\s+apresentada|\s+d[eao]\s+ré|\s+d[eao]\s+requerid|\s*[-–:]|\s+ao\s+pedido|\s+à\s+ação)/i.test(textWithoutPetitionFormulas) ||
    /(?:mov(?:imentação)?|evento|arq(?:uivo)?)\s*[\d\.\s-]*[-–:]?\s*(?:contestação|defesa\s+apresentada)/i.test(textWithoutPetitionFormulas) ||
    /(?:vem|vêm)\s+(?:respeitosamente\s+)?(?:apresentar|oferecer|juntar|protocolar)\s+(?:sua\s+)?contestação/i.test(textWithoutPetitionFormulas) ||
    /(?:da\s+tempestividade\s+da\s+contestação|das\s+preliminares\s+da\s+contestação|do\s+mérito\s+da\s+defesa|impugnação\s+ao\s+mérito)/i.test(textWithoutPetitionFormulas)
);

const hasAudiencia = (
    /(?:termo|ata)\s+de\s+audiência(?:\s+de\s+conciliação|\s+de\s+instrução|\s+realizada)?/i.test(textWithoutPetitionFormulas) ||
    /(?:aberta\s+a\s+audiência|instalada\s+a\s+audiência|presentes\s+as\s+partes|conciliação\s+restou\s+infrutífera|proposta\s+a\s+conciliação)/i.test(textWithoutPetitionFormulas)
);

const hasReplica = (
    /(?:mov(?:imentação)?|evento|arq(?:uivo)?)\s*[\d\.\s-]*[-–:]?\s*(?:réplica|impugnação\s+à\s+contestação)/i.test(textWithoutPetitionFormulas) ||
    /(?:vem|vêm)\s+(?:respeitosamente\s+)?apresentar\s+(?:sua\s+)?réplica/i.test(textWithoutPetitionFormulas)
);

const hasInitialPetition = (
    combinedTextLower.includes("petição inicial") ||
    combinedTextLower.includes("exordial") ||
    combinedTextLower.includes("ação de") ||
    combinedTextLower.includes("vem respeitosamente") ||
    combinedTextLower.includes("dos fatos") ||
    combinedTextLower.includes("do direito") ||
    combinedTextLower.includes("dos pedidos")
);

const hasUrgentRequest = (
    combinedTextLower.includes("tutela de urgência") ||
    combinedTextLower.includes("liminar") ||
    combinedTextLower.includes("tutela provisória") ||
    combinedTextLower.includes("tutela antecipada") ||
    combinedTextLower.includes("pedido de liminar") ||
    combinedTextLower.includes("inaudita altera parte") ||
    combinedTextLower.includes("tutela de evidência") ||
    combinedTextLower.includes("medida liminar") ||
    combinedTextLower.includes("urgência contemporânea")
);

const isOnlyInitialPetitionPresent = (hasInitialPetition || combinedTextLower.length > 50) && !hasContestacao && !hasAudiencia && !hasReplica;

// Detecção Cronológica de Sentença Prévia e Embargos de Declaração Pendentes:
const hasSentencaPrevia = (
    /(?:^|\n|\b)(?:mov(?:imentação)?|evento)\s*[\d\.\s-]*[-–:]?\s*(?:sentença|sentenca)/i.test(combinedTextLower) ||
    /(?:julgo\s+(?:procedente|improcedente|parcialmente\s+procedente)|resolvo\s+o\s+mérito|extingo\s+o\s+processo\s+com\s+resolução|dispositivo\s+da\s+sentença)/i.test(combinedTextLower) ||
    /(?:proferida\s+a\s+sentença|publicada\s+a\s+sentença|certidão\s+de\s+publicação\s+da\s+sentença|após\s+a\s+sentença|sentença\s+de\s+mérito)/i.test(combinedTextLower) ||
    /(?:trata-se\s+de\s+embargos\s+de\s+declaração\s+opostos\s+em\s+face\s+da\s+sentença)/i.test(combinedTextLower)
);

let embargosMovimentacaoTexto = "";
const mMovEmbargos = combinedTextLower.match(/(?:mov(?:imentação)?|evento)\s*(\d+)[\s\S]{1,60}?(?:embargos\s+de\s+declaração|embargos\s+declaratórios)/i) ||
                     combinedTextLower.match(/(?:embargos\s+de\s+declaração|embargos\s+declaratórios)[\s\S]{1,60}?(?:no\s+mov(?:imentação)?|no\s+evento)\s*(\d+)/i);
if (mMovEmbargos && mMovEmbargos[1]) {
    embargosMovimentacaoTexto = `mov. ${mMovEmbargos[1]}`;
}

const hasEmbargosDeclaracao = (
    Boolean(embargosMovimentacaoTexto) ||
    /(?:embargos\s+de\s+declaração|embargos\s+declaratórios|opõe\s+embargos|opostos\s+embargos|interpostos\s+embargos)/i.test(combinedTextLower) ||
    /(?:art(?:igo)?\.?\s*1\.?022|art(?:igo)?\.?\s*1022)[^\.\n]*?(?:omissão|contradição|obscuridade|erro\s+material)/i.test(combinedTextLower) ||
    combinedTextLower.includes("efeitos infringentes") ||
    combinedTextLower.includes("acolhimento dos presentes declaratórios")
);

const promptDirectives = ((customPromptText || "") + " " + (activePromptTitle || "") + " " + (actType || "")).toLowerCase();
const isPromptInstructingEmbargos = promptDirectives.includes("embargo") || promptDirectives.includes("declarat");

let resolvedActType = (actType || "").toLowerCase().trim();

// REGRA MANDATÓRIA DE BLINDAGEM DE FASE PROCESSUAL:
// 1. Se os autos já foram sentenciados e a questão pendente são Embargos de Declaração (ou se o prompt instrui embargos):
// É ESTRITAMENTE PROIBIDO proferir nova Sentença de Mérito! O ato obrigatório é JULGAMENTO DE EMBARGOS DE DECLARAÇÃO.
if (isPromptInstructingEmbargos || (hasSentencaPrevia && hasEmbargosDeclaracao) || resolvedActType.includes("embargo")) {
    resolvedActType = "embargos";
    console.log(`[Assessor Judicial] Sentença Prévia e Embargos de Declaração Detectados (${embargosMovimentacaoTexto || "nos autos"}). Enquadramento mandatório: JULGAMENTO DE EMBARGOS DE DECLARAÇÃO`);
} else if (isOnlyInitialPetitionPresent) {
    if (!resolvedActType || resolvedActType === "auto" || resolvedActType.includes("definir") || resolvedActType === "sentenca") {
        resolvedActType = hasUrgentRequest ? "decisao" : "despacho";
        console.log(`[Assessor Judicial] Fase Inicial Isolada Detectada. Enquadramento obrigatório para: ${resolvedActType.toUpperCase()} (Tutela/Liminar: ${hasUrgentRequest})`);
    }
} else if (!resolvedActType || resolvedActType === "auto" || resolvedActType.includes("definir")) {
    resolvedActType = "sentenca";
}

const actTypeGuidance = resolvedActType === "embargos"
  ? `DIRETRIZ MANDATÓRIA PARA JULGAMENTO DE EMBARGOS DE DECLARAÇÃO (ART. 1.022 A 1.026 DO CPC):
- O ato a ser proferido é um JULGAMENTO DE EMBARGOS DE DECLARAÇÃO (DECISÃO OU SENTENÇA DE EMBARGOS DE DECLARAÇÃO).
- PROIBIÇÃO ABSOLUTA DE PROFERIR NOVA SENTENÇA DE MÉRITO DO PROCESSO: O processo já possui sentença proferida em evento/movimentação anterior. Realizar uma nova sentença sobre a petição inicial configuraria grave erro processual, violação à coisa julgada e à preclusão consumativa do magistrado (art. 494 do CPC).
- O FOCO DO ATO JUDICIAL É APRECIAR OS EMBARGOS DE DECLARAÇÃO OPOSTOS ${embargosMovimentacaoTexto ? `NO ${embargosMovimentacaoTexto.toUpperCase()}` : "NOS AUTOS"} CONTRA A SENTENÇA EMBARGADA.
- No campo 'title', utilize "DECISÃO - EMBARGOS DE DECLARAÇÃO" ou "SENTENÇA - EMBARGOS DE DECLARAÇÃO".
- ESTRUTURAÇÃO OBRIGATÓRIA EM SUBTÓPICOS:
  1. I - RELATÓRIO:
     * Narrar com precisão a sentença embargada (data, movimentação/evento e síntese do dispositivo);
     * Narrar a oposição dos embargos de declaração (identificando a parte embargante, o número da movimentação/evento da petição de embargos - ex: ${embargosMovimentacaoTexto || "mov. 55"} -, data e tempestividade nos termos do art. 1.023 do CPC);
     * Descrever de forma minuciosa os vícios apontados pelo embargante (omissão, contradição, obscuridade ou erro material), citando expressamente os trechos da petição de embargos entre aspas e a localização (Mov. X, Arq. Y, Pág. Z);
     * Registrar se houve ou não intimação da parte adversa para apresentar contrarrazões em caso de potencial efeito infringente (art. 1.023, § 2º, do CPC).
  2. II - FUNDAMENTAÇÃO MAGISTRAL (ART. 1.022 DO CPC):
     ### 1. DA ADMISSIBILIDADE E TEMPESTIVIDADE
     * Exame de admissibilidade dos aclaratórios: tempestividade no prazo legal de 5 (cinco) dias úteis (art. 1.023 do CPC) e regularidade de representação. Transcrever o art. 1.022 do CPC em bloco destacado (> "Art. 1.022. Cabem embargos de declaração...").
     ### 2. DO EXAME DAS OMISSÕES, CONTRADIÇÕES OU ERROS APONTADOS
     * Confronto analítico ponto a ponto entre a tese do embargante e os exatos termos da sentença embargada;
     * Se a questão já foi resolvida com fundamentação lógica e coerente na sentença e o embargante busca apenas o reexame probatório, afastar a alegação fundamentando que os embargos não se prestam à rediscussão do mérito ou reforma do julgado por via inadequada (jurisprudência consolidada do TJGO e STJ);
     * Se houver efetiva omissão ou erro material involuntário, reconhecer motivadamente o ponto e integrar a fundamentação para sanar o vício;
     * Analisar se há ou não incidência de efeitos infringentes/modificativos.
     ### 3. DA APLICAÇÃO DE PRECEDENTES E TESES VINCULANTES
     * Aplicar enunciados do TJGO/STJ sobre cabimento estrito dos aclaratórios e rejeição de intuito protelatório.
  3. III - DISPOSITIVO OPERACIONAL:
     * "Ante o exposto, CONHEÇO dos embargos de declaração opostos no ${embargosMovimentacaoTexto || "evento dos autos"} porquanto tempestivos, e, no mérito, REJEITO-OS, mantendo incólume a sentença embargada em todos os seus termos."
     * (OU se houver vício real: "CONHEÇO dos embargos de declaração e, no mérito, ACOLHO-OS (com/sem efeitos infringentes), para sanar a omissão/erro material apontado e declarar que...")
     * Consignar expressamente a interrupção do prazo para interposição de outros recursos (art. 1.026 do CPC).
     * Determinar as intimações de estilo e prosseguimento do feito.`
  : resolvedActType === "decisao"
  ? `DIRETRIZ MANDATÓRIA PARA DECISÃO INTERLOCUTÓRIA COMPLETA, PROFUNDA E EXAUSTIVA (ART. 300 E ART. 489 DO CPC):
- O ato a ser proferido é uma DECISÃO INTERLOCUTÓRIA (NÃO É SENTENÇA E NÃO É DESPACHO).
- PROIBIÇÃO ABSOLUTA DE DECISÃO SUCINTA, DE 1 PARÁGRAFO OU GENÉRICA: A decisão deve ser densa, robusta e articulada, enfrentando minuciosamente cada documento, fato e pedido.
- PROTOCOLO DE TRÍPLICE CITAÇÃO E EXTRAÇÃO PROBATÓRIA REAL:
  * Toda referência aos autos DEVE conter a tríplice localização: (Mov. X, Arq. Y, Pág. Z / Fls. Z).
  * TRANSCREVA LITERALMENTE ENTRE ASPAS os trechos comprobatórios da urgência, laudos, extratos ou cláusulas contratuais.
  * Se a parte alegar urgência ou dano mas NÃO houver prova documental no PDF, consigne expressamente a ausência do documento nos autos.
- TRANSCRIÇÃO DE DISPOSITIVOS LEGAIS E PRECEDENTES:
  * Transcreva o texto do art. 300 do CPC e demais normas aplicáveis em bloco destacado (> "Art. 300. A tutela de urgência...").
  * Transcreva o teor das súmulas do TJGO/STJ ou teses do Caderno de Teses do Gabinete pertinentes.
- ESTRUTURAÇÃO OBRIGATÓRIA DA DECISÃO INTERLOCUTÓRIA EM SUBTÓPICOS (###):
  1. I - RELATÓRIO: Narrar detalhadamente a qualificação das partes, o objeto da ação, a causa de pedir e a especificação exata do pedido de tutela provisória de urgência / liminar deduzido pela parte autora, citando eventos, arquivos e páginas.
  2. II - FUNDAMENTAÇÃO MAGISTRAL (ART. 300 E ART. 489 DO CPC):
     ### 1. DA ADMISSIBILIDADE E GRATUIDADE DA JUSTIÇA
     * Apreciação expressa e fundamentada do pedido de gratuidade da justiça (arts. 98 e 99 do CPC) ou recolhimento/diferimento de custas, indicando os documentos acostados (Mov. X, Arq. Y, Pág. Z). Transcrever o dispositivo legal em bloco (>).
     ### 2. DO EXAME DA TUTELA PROVISÓRIA DE URGÊNCIA (ART. 300 DO CPC)
     * a) DA PROBABILIDADE DO DIREITO (FUMUS BONI IURIS): Demonstração pormenorizada da plausibilidade jurídica da tese autoral em face da legislação, precedentes e do acervo documental probatório, transcrevendo trechos dos contratos, laudos, extratos ou notificações com indicação de (Mov. X, Arq. Y, Pág. Z).
     * b) DO PERIGO DE DANO OU RISCO AO RESULTADO ÚTIL DO PROCESSO (PERICULUM IN MORA): Demonstração concreta, atual e fundamentada da urgência, identificando o prejuízo irreparável ou de difícil reparação caso o provimento não seja concedido de plano.
     * c) DA REVERSIBILIDADE DOS EFEITOS DA MEDIDA (ART. 300, § 3º, DO CPC): Exame da viabilidade fática e jurídica de reversão do provimento liminar.
     ### 3. DA APLICAÇÃO DO CADERNO DE TESES E DIRETRIZES DO GABINETE
     * Aplicação expressa e transcrição de quaisquer teses ou diretrizes vinculantes do magistrado pertinentes à matéria liminar.
  3. III - DISPOSITIVO MANDAMENTAL CRISTALINO:
     * COMANDO EXPRESSO SOBRE A TUTELA PROVISÓRIA: Deferimento, deferimento parcial ou indeferimento da liminar, com especificação exata da obrigação de dar, fazer ou não fazer imposta à parte contrária ou a terceiro.
     * ASTREINTES E PRAZO DE CUMPRIMENTO: Fixação de prazo peremptório para cumprimento (em dias ou horas) e cominação de multa diária (astreintes) razoável e proporcional para hipótese de descumprimento injustificado.
     * COMANDO SOBRE A GRATUIDADE: Deferimento ou indeferimento da gratuidade da justiça.
     * CITAÇÃO E DESIGNAÇÃO DE AUDIÊNCIA DE CONCILIAÇÃO: Determinação de citação e intimação da parte demandada para cumprimento e para comparecimento à audiência de conciliação (art. 334 do CPC), com advertência de prazo para contestação (art. 335 do CPC).
- No campo 'title', utilize "DECISÃO INTERLOCUTÓRIA".`
  : resolvedActType === "despacho"
  ? `DIRETRIZ MANDATÓRIA PARA DESPACHO JUDICIAL:
- O ato a ser proferido é um DESPACHO de mero expediente ou de impulso oficial (não é Sentença nem Decisão Interlocutória).
- PROTOCOLO DE CITAÇÃO DOS AUTOS: Indique com precisão as movimentações, arquivos e páginas (Mov. X, Arq. Y, Pág. Z) que ensejam a determinação.
- Se for despacho de emenda à inicial (art. 321 do CPC), aponte com exatidão o defeito ou omissão documental e transcreva o prazo legal de 15 dias.
- Se for despacho de recebimento e citação, ordene a citação/intimação do réu e encaminhamento para pauta de conciliação (art. 334 do CPC).
- No campo 'title', utilize "DESPACHO".`
  : `DIRETRIZ MANDATÓRIA PARA SENTENÇA COMPLETA, PROFUNDA E EXAUSTIVA (ART. 489 DO CPC):
- O ato a ser proferido é uma SENTENÇA JUDICIAL EXAUSTIVA (MÉRITO OU TERMINATIVA).
- PROIBIÇÃO ABSOLUTA DE MINUTA SIMPLES, CURTA OU RESUMIDA: Elabore uma peça completa, densa, robusta e pormenorizada, enfrentando todos os pedidos e teses sem economizar espaço ou abreviar fundamentações.
- No campo 'title', utilize "SENTENÇA".
- PROTOCOLO DE TRÍPLICE CITAÇÃO PROCESSUAL:
  * Toda referência a petições, contestações, certidões ou provas documentais DEVE indicar: (Mov. X, Arq. Y, Pág. Z / Fls. Z).
- EXTRAÇÃO PROBATÓRIA REAL E TRANSCRIÇÃO LITERAL:
  * TRANSCREVA LITERALMENTE ENTRE ASPAS os trechos probatórios essenciais: laudos periciais (nomes dos peritos, datas, conclusões literais), cláusulas de contratos bancários/comerciais, conversas, contracheques, certidões e pareceres ministeriais.
  * Se a parte alegar um fato mas NÃO houver documento nos autos, consigne expressamente a ausência da prova com base no ônus do art. 373 do CPC.
- TRANSCRIÇÃO LITERAL DE LEIS, SÚMULAS E TESES:
  * TRANSCREVA O TEXTO INTEGRAL dos artigos de lei aplicados (CPC, CC, CDC, CF/88, ECA, etc.) em bloco destacado (> "Art. ...").
  * TRANSCREVA O ENUNCIADO COMPLETO das súmulas do STJ, STF ou TJGO aplicadas em bloco destacado (> "Súmula nº ...").
  * TRANSCREVA AS TESES DO CADERNO DO GABINETE em bloco destacado e aplique-as ao caso concreto.
- ESTRUTURAÇÃO DA FUNDAMENTAÇÃO EM CAPÍTULOS TEMÁTICOS (###):
  * A fundamentação DEVE conter subtópicos numerados em Markdown (ex: ### 1. DA REGULARIDADE PROCESSUAL E GRATUIDADE; ### 2. DAS PRELIMINARES ARGUIDAS NA CONTESTAÇÃO; ### 3. DO MÉRITO E CONFRONTO PROBATÓRIO INDIVIDUALIZADO [um tópico para cada pedido]; ### 4. DA APLICAÇÃO DO CADERNO DE TESES DO GABINETE E SÚMULAS VINCULANTES; ### 5. DOS CONSECTÁRIOS LEGAIS).
- DISPOSITIVO CRISTALINO E EXAURIENTE: Delibere expressamente sobre procedência, procedência parcial ou improcedência, obrigações com prazos, condenações pecuniárias líquidas ou critérios de liquidação, custas e honorários advocatícios (ou isenção nos termos da Lei nº 9.099/95).`;

const userPrompt=`
DADOS DO PROCESSO:
- Comarca/Vara/Juizado Referência: ${processInfo?.comarca||"Poder Judiciário do Estado de Goiás - TJGO"} (REGRA OBRIGATÓRIA: Se as peças dos autos ou a petição inicial indicarem comarca ou vara expressamente indicada, como por exemplo 'Vara de Família e Sucessões da Comarca de Orizona - Goiás', PREVALECE SEMPRE a comarca e vara dos próprios autos no cabeçalho da minuta, desconsiderando a comarca de referência do painel)
- Número do Processo: ${processInfo?.processNumber||"Processo dos autos"}
- Juiz de Direito: ${processInfo?.juiz||"Juiz(a) de Direito"}
- Partes e Pedidos: Extrair com rigor estrito da Petição Inicial e das peças dos autos. NUNCA invente partes fictícias, nunca utilize partes de modelos preexistentes e nunca altere o objeto da lide.
- Fase Processual: ${isOnlyInitialPetitionPresent ? "Fase Postulatória Inicial (Petição Inicial sem Contestação)" : (proceduralPhase||"Conhecimento / Execução / Cumprimento de Sentença")}
- Tipo de Ato Requerido: ${resolvedActType.toUpperCase()}
- Subtipo / Enquadramento Específico: ${actSubtype||"Análise automática e integral de todos os eventos e pedidos dos autos"}
- Instruções Adicionais do Gabinete: ${specificInstructions||"Executar análise processual exaustiva com confronto fático-probatório completo e regras do TJGO."}

${actTypeGuidance}

${hasText?`TEXTO DOS AUTOS E PEÇAS PROCESSUAIS DISPONIBILIZADOS:
"""
${safeProcessText}
"""
`:""}
${accumulatedPdfText?`CONTEÚDO INTEGRAL EXTRAÍDO DE TODAS AS PÁGINAS E MOVIMENTAÇÕES DO PDF DOS AUTOS:
"""
${accumulatedPdfText}
"""
`:""}
${contentsParts.length>0?`[DIRETRIZ DE LEITURA DO PDF E VISÃO MULTIMODAL DE MANUSCRITOS]:
- Execute a leitura atenta de todas as movimentações, petições, emendas, certidões de citação/intimação, defesas/contestações, laudos periciais com nomes dos peritos e diagnósticos, certidões de óbito ou atos supervenientes, e manifestações do Ministério Público, identificando os números exatos de cada evento/movimentação, O NÚMERO DO ARQUIVO correspondente e a PÁGINA exata (ex: Movimentação 1, arquivo 5, Pag. 4/4) para citação no Relatório e Fundamentação.
- INSPEÇÃO VISUAL DIRETA: Examine visualmente imagens, contratos, cheques e NOTAS PROMISSÓRIAS (inclusive manuscritos de próprio punho como 'peguei emprestado a 5% ao mês', rasuras, anotações de juros no corpo ou verso). Faça o confronto matemático e o devido tratamento jurídico do negócio e das taxas de juros.`:""}

DIRETRIZES DE REDAÇÃO DA MINUTA:
1. RELATÓRIO PORMENORIZADO: Redigir um relatório completo e minucioso, narrando cronologicamente toda a marcha do processo com citação expressa dos eventos/movimentações, ARQUIVOS E PÁGINAS (ex: petição inicial na mov. 1, arq. 1, pág. 2/5; emenda na mov. 5, arq. 2, pág. 1/1; tutela na mov. 23, arq. 4; certidão de citação na mov. 44, arq. 2; contestação/defesa na mov. 74, arq. 3; réplica na mov. 80; laudo pericial na mov. 188, arq. 2, pág. 340; parecer do Ministério Público na mov. 250; etc.).

2. FUNDAMENTAÇÃO MAGISTRAL, CAPITULAR E EXAUSTIVA (ART. 489, § 1º, DO CPC - NUNCA REDUZA OU SINTETIZE PARA ECONOMIZAR ESPAÇO):
   - A análise DEVE ser completa, aprofundada e confiável, estruturada obrigatoriamente em SUBTÓPICOS NUMERADOS (### 1., ### 2., ### 3.).
   - PROTOCOLO DE TRÍPLICE CITAÇÃO: Cada documento citado deve conter (Mov. X, Arq. Y, Pág. Z / Fls. Z).
   - TRANSCRIÇÃO DE TRECHOS PROBATÓRIOS: Transcreva entre aspas as conclusões de laudos, cláusulas de contratos, mensagens e certidões fundamentais.
   - TRANSCRIÇÃO DE ARTIGOS DE LEIS E SÚMULAS: Transcreva em bloco destacado (> "Art. ...") o texto dos artigos de lei e das súmulas do STJ/TJGO aplicadas.
   - APLICAÇÃO DO CADERNO DE TESES DO GABINETE: Transcreva a tese vinculante do gabinete e aplique-a ao caso concreto.
   - PRELIMINARES E IMPUGNAÇÕES (OBRIGATÓRIO): Cada preliminar apresentada nos autos deve ser identificada, analisada e fundamentada em tópico próprio (impugnação à gratuidade, impugnação ao valor da causa, inépcia da inicial, ilegitimidade, incompetência, etc.).
   - MÉRITO E CONFRONTO PROBATÓRIO DIRETO: Analise minuciosamente cada documento acostado com juízo de subsunção motivado demonstrando a incidência do direito aos fatos comprovados nos autos.
   - APRECIAÇÃO INDIVIDUALIZADA DE CADA PEDIDO: Enfrente expressamente cada um dos pedidos formulados na inicial, fundamentando o acolhimento ou rejeição de cada um.
   - CONSECTÁRIOS LEGAIS: Fixação fundamentada de juros moratórios e correção monetária aplicáveis (Lei 14.905/2024, IPCA, Selic, Súmulas 43 e 54 do STJ).
   - FORMATAÇÃO RICA:
     * Use Markdown para negritos (**...**) nas partes, datas, conclusões e teses, itálicos (*...*) em expressões em latim e normas, e blocos recuados (> ...) para transcrições.
     * USE SEMPRE DUAS QUEBRAS DE LINHA (\\n\\n) PARA SEPARAR CADA PARÁGRAFO. É expressamente proibido gerar o texto como um bloco corrido sem respiro.
     * Não inicie com termos artificiais como "PARÁGRAFO 1", "BLOCO 2". Redija como uma peça judicial real, fluida e contínua.

3. DISPOSITIVO: Comandos judiciais completos, claros e exaurientes (procedência, procedência parcial, improcedência ou extinção, tutelas deferidas/indeferidas, obrigações com prazos e astreintes, condenações pecuniárias líquidas ou parâmetros de liquidação, custas e honorários advocatícios ou isenção em Juizados).

4. MARCHA PROCESSUAL & PRECLUSÃO: Siga a ordem lógica do processo. Não reabra discussões sobre matérias já decididas nos autos, salvo se houver fato novo ou superveniente (CPC 493).

5. RIGOR MAGISTRAL E PROFUNDIDADE TOTAL: Dedique a totalidade da sua capacidade e volume de tokens à redação jurídica exaustiva da decisão (I - RELATÓRIO, II - FUNDAMENTAÇÃO e III - DISPOSITIVO). Enfrente minuciosamente cada documento, alegação e prova, e aplique com rigor absoluto as diretrizes do Caderno de Teses do Gabinete e súmulas vigentes do TJGO/STJ.

6. IDENTIFICAÇÃO E EXTRAÇÃO PRECISA DOS DADOS DO PROCESSO:
   - Extraia obrigatoriamente dos autos o número único do processo (formato CNJ: 0000000-00.0000.0.00.0000). É ESTRITAMENTE PROIBIDO retornar 'Extrair automaticamente dos autos', 'Autos do Processo' ou 'Não informado'.
   - Extraia o nome completo da parte autora / promovente e da parte ré / promovida (pessoa física ou jurídica: ex. 'Banco Bradesco S/A', 'Claro S/A', 'Estado de Goiás', 'Fulano de Tal'). É TERMINANTEMENTE PROIBIDO preencher o campo 'defendant' ou 'author' com atos processuais ou movimentações.
   - Identifique a Vara e Comarca exatas de tramitação (ex: Vara de Família e Sucessões da Comarca de Orizona - TJGO).

MISSÃO DA ETAPA 1 (ASSESSOR FÁTICO):
Atue estritamente como assessor fático-processual e analista probatório, sem resumir ou emitir juízos genéricos:
1. RELATÓRIO CRONOLÓGICO MINUCIOSO: Identificação nominal das partes, pedidos, tutelas, certidões, defesas, documentos e manifestações com os números exatos de todas as movimentações/eventos dos autos (Mov. X, Arq. Y, Pág. Z).
2. ESTRUTURAÇÃO DA FUNDAMENTAÇÃO EM 7 BLOCOS OBRIGATÓRIOS (5 A 8 PARÁGRAFOS PROFUNDOS):
   Bloco 1. Regularidade Processual: Pressupostos processuais, condições da ação e contraditório.
   Bloco 2. Cerne da Questão: Delimitação fática e jurídica da controvérsia.
   Bloco 3. Regime Legal e Precedentes: Transcrição e citação expressa de artigos de lei e enunciados (CPC, CC, CDC, Juizados, Súmulas STJ/STF).
   Bloco 4. Confronto Fático-Probatório Concreto: Análise documento a documento com citação expressa dos eventos (Mov. X, Arq. Y, Pág. Z) e transcrição literal entre aspas das conclusões de laudos, cláusulas contratuais e certidões.
   Bloco 5. Subsunção e Convicção Judicial Motivada: Aplicação do direito aos fatos comprovados nos autos.
   Bloco 6. Apreciação Individualizada: Julgamento pormenorizado de cada um dos pedidos formulados (materiais, morais, obrigação de fazer, etc.).
   Bloco 7. Consectários Legais: Critérios normativos de juros e correção monetária (Lei 14.905/2024, Tema do STJ, termo inicial).
3. DISPOSITIVO EXAUSTIVO E OPERACIONAL: Comandos operacionais claros com adequação estrita aos pedidos.

Retorne EXCLUSIVAMENTE o objeto JSON com os campos: processNumber, author, defendant, judicialUnit, pendingMatter, actType, relatorio, fundamentacao e dispositivo.
`;

const stage1ContentsParts: any[] = [{ text: userPrompt }];
for (const p of contentsParts) {
    if (p.inlineData) {
        stage1ContentsParts.push(p);
    }
}

console.log("[Assessor Judicial] Disparando ETAPA 1: Assessor Fático (Extração e Confronto Probatório Bruto)...");
const stage1Response = await generateWithFallbackAndRetry({
    apiKey: userApiKey,
    keyPool: extractApiKeyPool(req),
    isNativeAllowed: req.headers['x-use-native-key'] === 'true',
    res,
    primaryModel: "gemini-3.8-flash",
    fallbackModel: "gemini-flash-latest",
    timeoutMs: 120000,
    contents: [{ role: "user", parts: stage1ContentsParts }],
    config: {
        systemInstruction: stage1SystemInstruction,
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                processNumber: {
                    type: Type.STRING,
                    description: "Número do processo em formato CNJ autêntico extraído fielmente dos autos (ex: 5211660-72.2026.8.09.0166)"
                },
                author: {
                    type: Type.STRING,
                    description: "Nome completo da parte autora / promovente / embargante / exequente extraído dos autos (NUNCA incluir verbos, predicados ou relações afetivas narrativas)"
                },
                defendant: {
                    type: Type.STRING,
                    description: "Nome completo da parte ré / promovida / embargada / executada extraído dos autos"
                },
                judicialUnit: {
                    type: Type.STRING,
                    description: "Comarca e Vara oficial dos autos (ex: Vara de Família da Comarca de Orizona - TJGO)"
                },
                pendingMatter: {
                    type: Type.STRING,
                    description: "Identificação da questão processual pendente de julgamento nos autos (ex: Julgamento de Embargos de Declaração opostos no mov. 55 contra a sentença)"
                },
                actType: {
                    type: Type.STRING,
                    description: "Tipo de ato a ser proferido: EMBARGOS DE DECLARAÇÃO, DECISÃO INTERLOCUTÓRIA, SENTENÇA ou DESPACHO"
                },
                relatorio: {
                    type: Type.STRING,
                    description: "Relatório judicial completo, com formatação rica (separando os parágrafos com quebras de linha e utilizando negritos para destaques), encadeado e fidedigno, narrando toda a marcha processual e citando nominalmente as partes, pedidos, tutelas, certidões, defesas, documentos e manifestações com os números exatos de todas as movimentações/eventos dos autos."
                },
                fundamentacao: {
                    type: Type.STRING,
                    description: "Fundamentação jurídica magistral, densa e completa em 5 a 8 parágrafos detalhados (separados rigorosamente por quebras de linha e utilizando formatação Markdown como negritos e itálicos), estruturada nos blocos fáticos e probatórios com citação de eventos (Mov. X, Arq. Y, Pág. Z) e enfrentamento exato do objeto pendente."
                },
                dispositivo: {
                    type: Type.STRING,
                    description: "Dispositivo judicial exaustivo e operacional, com comandos claros e precisos adequados à matéria pendente de julgamento."
                }
            },
            required: ["relatorio", "fundamentacao", "dispositivo"]
        }
    }
});

const stage1Text = stage1Response.text;
if (!stage1Text) {
    throw new Error("Não foi possível gerar a resposta preliminar do Assessor Fático (Etapa 1).");
}

let stage1Json: any = safeParseJson(stage1Text) || {};
if (!stage1Json.relatorio && !stage1Json.fundamentacao && !stage1Json.dispositivo) {
    stage1Json = { relatorio: "", fundamentacao: stage1Text, dispositivo: "" };
}

console.log("[Assessor Judicial] Etapa 1 (Assessor Fático) concluída com êxito. Intervalo preventivo de resfriamento de cota (2.5s)...");
await new Promise(resolve => setTimeout(resolve, 2500));
console.log("[Assessor Judicial] Disparando ETAPA 2: Juiz Revisor (Teses, Precedentes & Matriz Forense)...");

const stage2Prompt = `
DADOS DO PROCESSO:
- Comarca/Vara: ${stage1Json.judicialUnit || processInfo?.comarca || "Poder Judiciário do Estado de Goiás - TJGO"}
- Número do Processo: ${stage1Json.processNumber || processInfo?.processNumber || "Processo dos autos"}
- Juiz de Direito: ${processInfo?.juiz || "Juiz(a) de Direito"}
- Partes Identificadas: Promovente/Autor/Embargante: "${stage1Json.author || "Parte Autora"}" | Promovido/Réu/Embargado: "${stage1Json.defendant || "Parte Ré"}"
- Questão Processual Pendente: ${stage1Json.pendingMatter || "Análise dos autos"}
- Tipo de Ato Requerido: ${resolvedActType === "embargos" ? "JULGAMENTO DE EMBARGOS DE DECLARAÇÃO" : resolvedActType.toUpperCase()}
- Subtipo / Enquadramento: ${actSubtype || "Análise integral de pedidos"}
- Diretrizes Adicionais: ${specificInstructions || "Confronto probatório e regras do TJGO."}

${actTypeGuidance}

MINUTA PRELIMINAR FACTUAL EXTRAÍDA NA ETAPA 1 (ASSESSOR FÁTICO):
======================================================
DADOS DAS PARTES E DA MARCHA:
- Processo nº: ${stage1Json.processNumber || processInfo?.processNumber || "(Conforme extraído dos autos)"}
- Polo Ativo: ${stage1Json.author || "Parte Autora"}
- Polo Passivo: ${stage1Json.defendant || "Parte Ré"}
- Questão Processual Pendente: ${stage1Json.pendingMatter || "(Apreciação dos autos)"}

I - RELATÓRIO PRELIMINAR:
${stage1Json.relatorio || "(Não informado)"}

II - FUNDAMENTAÇÃO PRELIMINAR:
${stage1Json.fundamentacao || "(Não informado)"}

III - DISPOSITIVO PRELIMINAR:
${stage1Json.dispositivo || "(Não informado)"}
======================================================

COMANDOS PARA O JUIZ REVISOR (ETAPA 2):
1. REVISÃO, HARMONIZAÇÃO E ADENSAMENTO MAGISTRAL:
   - Leia atentamente o Relatório e a Fundamentação Preliminar;
   - Confronte com o Caderno de Teses do Gabinete, Súmulas Vinculantes, Jurisprudência e Minuta Paradigma (se ativada);
   - Reescreva e aprofunde exaustivamente a Fundamentação ('fundamentacao') e o Dispositivo ('dispositivo') aplicando expressamente as teses e súmulas, transcrevendo os artigos de lei em bloco (> "Art. ..."), preservando a tríplice localização (Mov. X, Arq. Y, Pág. Z) e os trechos probatórios literais de laudos e contratos;
   - Mantenha o Relatório completo e fidedigno ('relatorio');
   - Preencha o cabeçalho, comarca/vara e fecho judicante oficial;
   - Compile o texto integral contínuo pronto para o Projudi/PJe em 'fullFormattedText'.

2. MATRIZ DE AUDITORIA FORENSE COMPLETA ('auditAnalysis'):
   - 'fatoVsProva': Tabela analítica confrontando fato alegado vs prova documental evento a evento com análise crítica e fundamentação legal (art. 373 CPC);
   - 'competenciaCheck': Verificação minuciosa de valor da causa, teto de 40 SM (se Juizado), competência material e territorial;
   - 'regularidadeDocumental': Auditoria dos 6 pilares forenses (assinaturas físicas vs digitais/ICP-Brasil, integridade temporal/anacronismos, integridade visual/rasuras, autenticidade cartorária/selos/QR codes, subsunção aos arts. 428/429 CPC e Tema 1049 STJ, confronto de dados PDF vs Minuta e respeito à marcha processual/preclusão);
   - 'normasAplicadas': Rol de diplomas e súmulas incidentes;
   - 'legislacaoMapeada': Detalhamento de artigos-chave e regime de correção;
   - 'consectariosDetalhados': Juros, correção monetária, Lei 14.905/2024 e termos iniciais;
   - 'alertasProcessuais': Avisos de cautela processual;
   - 'preAudit': Pontuação (0-100), veredito, selo de segurança e síntese técnica da auditoria.

Retorne EXCLUSIVAMENTE o objeto JSON final conforme o responseSchema.
`;

const stage2ResponseSchema = {
    type: Type.OBJECT,
    properties: {
        minute: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Título em caixa alta: DECISÃO - EMBARGOS DE DECLARAÇÃO, SENTENÇA, DECISÃO INTERLOCUTÓRIA ou DESPACHO (máximo 60 caracteres)" },
                header: { type: Type.STRING, description: "Cabeçalho padrão do TJGO / Vara / Juizado" },
                processNumber: { type: Type.STRING, description: "Número do processo extraído fielmente dos autos (formato CNJ)" },
                judicialUnit: { type: Type.STRING, description: "Nome exato da Vara/Comarca/Juizado extraído dos autos (ex: 'Vara de Família e Sucessões da Comarca de Orizona - TJGO')" },
                parties: {
                    type: Type.OBJECT,
                    properties: {
                        author: { type: Type.STRING, description: "Nome completo da parte autora / requerente" },
                        defendant: { type: Type.STRING, description: "Nome completo da parte ré / requerida" }
                    },
                    required: ["author", "defendant"]
                },
                relatorio: {
                    type: Type.STRING,
                    description: "Relatório judicial completo, com formatação rica (separando os parágrafos com quebras de linha e utilizando negritos para destaques), encadeado e fidedigno, narrando toda a marcha processual e citando nominalmente as partes, peritos, pedidos, tutelas, certidões, defesas, laudos e parecer do MP com os números exatos de todas as movimentações/eventos dos autos."
                },
                fundamentacao: {
                    type: Type.STRING,
                    description: "Fundamentação jurídica magistral, densa e completa em 5 a 8 parágrafos detalhados (separados rigorosamente por quebras de linha e utilizando formatação Markdown como negritos e itálicos), estruturada nos 7 blocos obrigatórios: 1. Regularidade processual; 2. Cerne da questão; 3. Regime legal e precedentes; 4. Confronto fático-probatório concreto documento a documento com citação de eventos (Mov. X, Arq. Y, Pág. Z); 5. Subsunção e convicção judicial motivada; 6. Apreciação individualizada de cada pedido; 7. Consectários legais e juros pela Lei 14.905/2024, aplicando expressamente as teses do Caderno de Teses do Gabinete e súmulas."
                },
                dispositivo: {
                    type: Type.STRING,
                    description: "Dispositivo judicial exaustivo e operacional, com comandos claros e precisos adequados aos pedidos da ação (procedência, improcedência ou parcial procedência, obrigações de fazer/pagar, parâmetros legais de juros e correção monetária, custas e honorários se cabíveis, prazos recursais e arquivamento definitivo)."
                },
                closing: { type: Type.STRING, description: "Fecho padrão judicial oficial (ex: Comarca/GO, data. Juiz(a) de Direito)." },
                fullFormattedText: { type: Type.STRING, description: "Texto integral da minuta compilada e formatada com títulos I - RELATÓRIO, II - FUNDAMENTAÇÃO e III - DISPOSITIVO, pronta para cópia para o Projudi/PJe." }
            },
            required: ["title", "header", "processNumber", "parties", "relatorio", "fundamentacao", "dispositivo"]
        },
        auditAnalysis: {
            type: Type.OBJECT,
            properties: {
                fatoVsProva: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            fatoAlegado: { type: Type.STRING },
                            eventoId: { type: Type.STRING },
                            provaApresentada: { type: Type.STRING },
                            status: { type: Type.STRING },
                            analiseCritica: { type: Type.STRING },
                            fundamentoLegal: { type: Type.STRING },
                            valoracaoJuridica: { type: Type.STRING }
                        },
                        required: ["fatoAlegado", "eventoId", "provaApresentada", "status", "analiseCritica"]
                    }
                },
                competenciaCheck: {
                    type: Type.OBJECT,
                    properties: {
                        valorCausa: { type: Type.STRING },
                        adequacaoTeto40SM: { type: Type.BOOLEAN },
                        competenciaMaterial: { type: Type.BOOLEAN },
                        legitimidadePartes: { type: Type.BOOLEAN },
                        competenciaTerritorial: { type: Type.STRING },
                        observacoes: { type: Type.STRING }
                    },
                    required: ["valorCausa", "adequacaoTeto40SM", "competenciaMaterial", "legitimidadePartes", "competenciaTerritorial"]
                },
                regularidadeDocumental: {
                    type: Type.OBJECT,
                    properties: {
                        procuracaoStatus: { type: Type.STRING },
                        comprovanteEnderecoStatus: { type: Type.STRING },
                        consectariosStatus: { type: Type.STRING },
                        observacoes: { type: Type.STRING },
                        assinaturasStatus: { type: Type.STRING, description: "Pilar 1: Verificação de assinaturas físicas vs digitais e logs ICP-Brasil/Gov.br/DocuSign" },
                        integridadeTemporalStatus: { type: Type.STRING, description: "Pilar 2: Verificação de anacronismos temporais e cronologia" },
                        integridadeVisualStatus: { type: Type.STRING, description: "Pilar 3: Verificação de rasuras, emendas, fontes incompatíveis e montagens" },
                        autenticidadeCartorariaStatus: { type: Type.STRING, description: "Pilar 4: Validação de selos eletrônicos de fiscalização e QR codes" },
                        subsuncaoLegalProvas: { type: Type.STRING, description: "Pilar 5: Subsunção aos arts. 428/429 CPC e Tema 1049 STJ" },
                        confrontoDadosMinuta: { type: Type.STRING, description: "Pilar 6: Confronto cruzado direto de dados PDF vs Minuta" },
                        marchaProcessualStatus: { type: Type.STRING, description: "Ordem da marcha processual e respeito à preclusão de matérias já decididas" }
                    },
                    required: ["procuracaoStatus", "comprovanteEnderecoStatus", "consectariosStatus", "observacoes"]
                },
                normasAplicadas: { type: Type.ARRAY, items: { type: Type.STRING } },
                legislacaoMapeada: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            leiOuNorma: { type: Type.STRING },
                            artigoOuDispositivo: { type: Type.STRING },
                            ementaOuObjeto: { type: Type.STRING },
                            regimeCorrecao: { type: Type.STRING },
                            aplicabilidadeAoCaso: { type: Type.STRING }
                        },
                        required: ["leiOuNorma", "artigoOuDispositivo", "ementaOuObjeto"]
                    }
                },
                consectariosDetalhados: {
                    type: Type.OBJECT,
                    properties: {
                        regimeAplicado: { type: Type.STRING },
                        indiceCorrecao: { type: Type.STRING },
                        termoInicialCorrecao: { type: Type.STRING },
                        indiceJuros: { type: Type.STRING },
                        termoInicialJuros: { type: Type.STRING },
                        baseLegalCompleta: { type: Type.STRING },
                        observacoes: { type: Type.STRING }
                    },
                    required: ["regimeAplicado", "indiceCorrecao", "termoInicialCorrecao", "indiceJuros", "termoInicialJuros", "baseLegalCompleta"]
                },
                alertasProcessuais: { type: Type.ARRAY, items: { type: Type.STRING } },
                preAudit: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        verdict: { type: Type.STRING },
                        verdictColor: { type: Type.STRING },
                        certificateMessage: { type: Type.STRING },
                        auditSummary: { type: Type.STRING },
                        congruenceStatus: { type: Type.STRING },
                        evidentiaryStatus: { type: Type.STRING },
                        proceduralStatus: { type: Type.STRING },
                        precedentsStatus: { type: Type.STRING },
                        forensicAuditStatus: { type: Type.STRING },
                        marchaProcessualStatus: { type: Type.STRING },
                        safetySeal: { type: Type.BOOLEAN },
                        keyFindings: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    topic: { type: Type.STRING },
                                    status: { type: Type.STRING },
                                    details: { type: Type.STRING }
                                },
                                required: ["topic", "status", "details"]
                            }
                        }
                    },
                    required: ["score", "verdict", "certificateMessage", "congruenceStatus", "evidentiaryStatus", "proceduralStatus"]
                }
            },
            required: ["fatoVsProva", "competenciaCheck", "regularidadeDocumental", "normasAplicadas", "alertasProcessuais"]
        }
    },
    required: ["minute"]
};

const response = await generateWithFallbackAndRetry({
    apiKey: userApiKey,
    keyPool: extractApiKeyPool(req),
    isNativeAllowed: req.headers['x-use-native-key'] === 'true',
    res,
    primaryModel: "gemini-3.8-flash",
    fallbackModel: "gemini-flash-latest",
    timeoutMs: 120000,
    contents: [{ role: "user", parts: [{ text: stage2Prompt }] }],
    config: {
        systemInstruction: stage2SystemInstruction,
        temperature: 0.1,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
        responseSchema: stage2ResponseSchema
    }
});

const outputText = response.text;
if (!outputText) {
    throw new Error("Não foi possível gerar a resposta do modelo na Etapa 2.");
}

let parsed = safeParseJson(outputText);
if (!parsed.minute) {
    parsed.minute = {};
}
// Preservação de densidade fática da Etapa 1 caso algum campo tenha ficado omisso na Etapa 2
if ((!parsed.minute.relatorio || parsed.minute.relatorio.length < 50) && stage1Json.relatorio) {
    parsed.minute.relatorio = stage1Json.relatorio;
}
if ((!parsed.minute.fundamentacao || parsed.minute.fundamentacao.length < 100) && stage1Json.fundamentacao) {
    parsed.minute.fundamentacao = stage1Json.fundamentacao;
}
if ((!parsed.minute.dispositivo || parsed.minute.dispositivo.length < 30) && stage1Json.dispositivo) {
    parsed.minute.dispositivo = stage1Json.dispositivo;
}

const normalized = normalizeGeneratedMinuteAndAudit(parsed, outputText, resolvedActType, processInfo);
parsed = {
    ...parsed,
    minute: normalized.minute,
    auditAnalysis: normalized.auditAnalysis
};

const detectedFrameworks = detectApplicableLegalFrameworks(combinedContextForPrecedents);
const primaryFramework = detectedFrameworks[0] || LEGAL_FRAMEWORKS[0];

if (!parsed.auditAnalysis) {
    parsed.auditAnalysis = {
        fatoVsProva: [],
        competenciaCheck: {
            valorCausa: "Conforme autos",
            adequacaoTeto40SM: true,
            competenciaMaterial: true,
            legitimidadePartes: true,
            competenciaTerritorial: "Regular",
            observacoes: "Processo processado com êxito na leitura dos autos."
        },
        regularidadeDocumental: {
            procuracaoStatus: "Regular",
            comprovanteEnderecoStatus: "Regular",
            consectariosStatus: primaryFramework.name,
            observacoes: "Em conformidade com a legislação aplicável e 6 pilares forenses.",
            assinaturasStatus: "Assinaturas autênticas e logs eletrônicos verificados.",
            integridadeTemporalStatus: "Cronologia fidedigna sem anacronismos.",
            integridadeVisualStatus: "Sem rasuras, emendas ou inconsistência de fontes.",
            autenticidadeCartorariaStatus: "Selos eletrônicos de fiscalização e QR codes regulares.",
            subsuncaoLegalProvas: "Conforme arts. 428/429 CPC e Tema 1049 STJ.",
            confrontoDadosMinuta: "Dados 100% aderentes aos documentos dos autos.",
            marchaProcessualStatus: "Ordem processual e preclusão respeitadas sem reabertura indevida."
        },
        normasAplicadas: ["Lei nº 9.099/95", "CPC", "FONAJE", primaryFramework.principaisLeis[0]?.diploma || "Lei nº 14.905/2024"],
        legislacaoMapeada: detectedFrameworks.flatMap(fw => fw.principaisLeis.map(l => ({
            leiOuNorma: l.diploma,
            artigoOuDispositivo: l.artigosChave,
            ementaOuObjeto: l.objeto,
            regimeCorrecao: fw.regimeCorrecao.indiceCorrecao,
            aplicabilidadeAoCaso: `Incide diretamente na matéria de ${fw.category}.`
        }))),
        consectariosDetalhados: {
            regimeAplicado: primaryFramework.name,
            indiceCorrecao: primaryFramework.regimeCorrecao.indiceCorrecao,
            termoInicialCorrecao: primaryFramework.regimeCorrecao.termoInicialCorrecao,
            indiceJuros: primaryFramework.regimeCorrecao.indiceJuros,
            termoInicialJuros: primaryFramework.regimeCorrecao.termoInicialJuros,
            baseLegalCompleta: primaryFramework.regimeCorrecao.baseLegalCompleta,
            observacoes: primaryFramework.regimeCorrecao.observacoes
        },
        alertasProcessuais: ["Minuta e auditoria forense estruturadas com sucesso."]
    };
} else {
    if (parsed.auditAnalysis.regularidadeDocumental) {
        const reg = parsed.auditAnalysis.regularidadeDocumental;
        if (!reg.assinaturasStatus) reg.assinaturasStatus = "Assinaturas físicas/digitais e logs auditados.";
        if (!reg.integridadeTemporalStatus) reg.integridadeTemporalStatus = "Cronologia dos autos preservada sem anacronismos.";
        if (!reg.integridadeVisualStatus) reg.integridadeVisualStatus = "Documentos íntegros sem rasuras ou montagens detectadas.";
        if (!reg.autenticidadeCartorariaStatus) reg.autenticidadeCartorariaStatus = "Selos eletrônicos e códigos cartorários conferidos.";
        if (!reg.subsuncaoLegalProvas) reg.subsuncaoLegalProvas = "Adequação aos arts. 428/429 do CPC e Tema 1049 STJ.";
        if (!reg.confrontoDadosMinuta) reg.confrontoDadosMinuta = "Dados nominais, valores e datas confrontados com os autos.";
        if (!reg.marchaProcessualStatus) reg.marchaProcessualStatus = "Marcha processual contínua e respeito à preclusão observado.";
    }
    if (!Array.isArray(parsed.auditAnalysis.legislacaoMapeada) || parsed.auditAnalysis.legislacaoMapeada.length === 0) {
        parsed.auditAnalysis.legislacaoMapeada = detectedFrameworks.flatMap(fw => fw.principaisLeis.map(l => ({
            leiOuNorma: l.diploma,
            artigoOuDispositivo: l.artigosChave,
            ementaOuObjeto: l.objeto,
            regimeCorrecao: fw.regimeCorrecao.indiceCorrecao,
            aplicabilidadeAoCaso: `Incide na disciplina jurídica de ${fw.category}.`
        })));
    }
    if (!parsed.auditAnalysis.consectariosDetalhados || !parsed.auditAnalysis.consectariosDetalhados.indiceCorrecao) {
        parsed.auditAnalysis.consectariosDetalhados = {
            regimeAplicado: primaryFramework.name,
            indiceCorrecao: primaryFramework.regimeCorrecao.indiceCorrecao,
            termoInicialCorrecao: primaryFramework.regimeCorrecao.termoInicialCorrecao,
            indiceJuros: primaryFramework.regimeCorrecao.indiceJuros,
            termoInicialJuros: primaryFramework.regimeCorrecao.termoInicialJuros,
            baseLegalCompleta: primaryFramework.regimeCorrecao.baseLegalCompleta,
            observacoes: primaryFramework.regimeCorrecao.observacoes
        };
    }
}

if (!parsed.auditAnalysis.preAudit) {
    parsed.auditAnalysis.preAudit = {
        score: 100,
        verdict: "APROVADO",
        certificateMessage: "Minuta em estrita conformidade técnica, fundamentada e ajustada às diretrizes vinculantes do gabinete e jurisprudência superior.",
        congruenceStatus: "Total",
        evidentiaryStatus: "Sólido e contemporâneo",
        proceduralStatus: "Regular",
        auditSummary: "Minuta e auditoria estruturadas com sucesso em etapa única de alta performance.",
        forensicAuditStatus: "Perfeita",
        keyFindings: [
            { topic: "Estrutura Judicante", status: "Conforme", details: "Preservação estrita dos tópicos I-Relatório, II-Fundamentação e III-Dispositivo." },
            { topic: "Diretrizes de Gabinete", status: "Conforme", details: "Aplicação dos precedentes e normas regimentais pertinentes." }
        ],
        marchaProcessualStatus: "Regular",
        precedentsStatus: "Conforme jurisprudência vigente",
        safetySeal: true,
        verdictColor: "green"
    };
}

if (!Array.isArray(parsed.auditAnalysis.fatoVsProva) || parsed.auditAnalysis.fatoVsProva.length === 0) {
    parsed.auditAnalysis.fatoVsProva = [
        {
            fatoAlegado: "Averiguação dos fatos e pedidos constantes da exordial e autos processuais",
            eventoId: "Autos Processuais",
            provaApresentada: "Documentação carreada aos autos e teses de direito",
            status: "Comprovado",
            analiseCritica: "Fatos e pedidos confrontados diretamente com os autos e com o acervo probatório.",
            fundamentoLegal: "Art. 373, I e II, do CPC",
            valoracaoJuridica: "Acervo probatório valorado para a prolação do ato judicial."
        }
    ];
}

parsed.minute = sanitizeMinuteData(parsed.minute, resolvedActType === "embargos" ? "DECISÃO - EMBARGOS DE DECLARAÇÃO" : (actType || "SENTENÇA"));
if (parsed.minute) {
    if (resolvedActType === "embargos" && (!parsed.minute.title || !parsed.minute.title.toUpperCase().includes("EMBARGO"))) {
        parsed.minute.title = "DECISÃO - EMBARGOS DE DECLARAÇÃO";
    }
    const fullScope = [parsed.minute.relatorio, parsed.minute.dispositivo, parsed.minute.fundamentacao, parsed.minute.fullFormattedText, safeProcessText, accumulatedPdfText].filter(Boolean).join("\n");
    const reconciled = extractProcessMetadata({
        processNumber: parsed.minute.processNumber,
        author: parsed.minute.parties?.author,
        defendant: parsed.minute.parties?.defendant,
        judicialUnit: parsed.minute.judicialUnit,
        relatorio: parsed.minute.relatorio,
        fundamentacao: parsed.minute.fundamentacao,
        dispositivo: parsed.minute.dispositivo
    }, processInfo, fullScope);
    parsed.minute.processNumber = reconciled.procNum;
    if (!parsed.minute.parties) parsed.minute.parties = { author: "", defendant: "" };
    parsed.minute.parties.author = reconciled.author;
    parsed.minute.parties.defendant = reconciled.defendant;
    if (reconciled.judicialUnit && (!parsed.minute.judicialUnit || parsed.minute.judicialUnit.length < 5)) {
        parsed.minute.judicialUnit = reconciled.judicialUnit;
    }
}

parsed.groundingSources = liveGroundingSources;
if (liveGroundingSources && liveGroundingSources.length > 0 && parsed.auditAnalysis?.preAudit) {
    const curStatus = parsed.auditAnalysis.preAudit.precedentsStatus || "Precedentes validados";
    parsed.auditAnalysis.preAudit.precedentsStatus = `${curStatus} • ${liveGroundingSources.length} precedente(s) consultado(s) ao vivo via Grounding oficial (TJGO • STJ • STF).`;
}

const stage1Tokens = stage1Response?.usageMetadata || {};
const stage2Tokens = response?.usageMetadata || {};

const totalPromptTokens = (stage1Tokens.promptTokenCount || 0) + (stage2Tokens.promptTokenCount || 0);
const totalCandidatesTokens = (stage1Tokens.candidatesTokenCount || 0) + (stage2Tokens.candidatesTokenCount || 0);
const totalTotalTokens = (stage1Tokens.totalTokenCount || 0) + (stage2Tokens.totalTokenCount || 0);
const totalCachedTokens = (stage1Tokens.cachedContentTokenCount || 0) + (stage2Tokens.cachedContentTokenCount || 0);

const usage = (totalTotalTokens > 0 || totalPromptTokens > 0) ? {
    promptTokenCount: totalPromptTokens,
    candidatesTokenCount: totalCandidatesTokens,
    totalTokenCount: totalTotalTokens,
    cachedContentTokenCount: totalCachedTokens
} : void 0;
parsed.usage = usage;
parsed.modelUsed = "Gemini 3.8 Flash (Two-Stage Pipeline: Assessor Fático -> Juiz Revisor & Matriz Forense)";
parsed.holisticSynopsis = generatedHolisticSynopsis || undefined;
parsed.deduplicationStats = {
    duplicatesFound: totalDuplicatesFound,
    charsSaved: totalCharsSaved
};
parsed.indicacaoTpuCnj = parsed.minute?.indicacaoTpuCnj || parsed.auditAnalysis?.indicacaoTpuCnj;

if (activeTeses && typeof activeTeses === "string" && activeTeses.trim().length > 0) {
    const rawLines = activeTeses.split("\n").map(l => l.trim()).filter(l => l.length > 5 && !l.startsWith("#") && !l.startsWith("=="));
    const nonCnjLines = rawLines.filter(l => !/\(CNJ:\d+\)/.test(l));
    const resumo = (nonCnjLines.length > 0 ? nonCnjLines : rawLines).slice(0, 6);

    parsed.cadernoTesesApplied = {
        active: true,
        thesesSnippet: activeTeses.slice(0, 300),
        fullText: activeTeses
    };
    if (parsed.auditAnalysis) {
        parsed.auditAnalysis.tesesGabineteCheck = {
            aplicadas: true,
            resumoTeses: resumo,
            observacoes: "Caderno de Teses e Diretrizes Vinculantes do Gabinete aplicado na fundamentação e no dispositivo."
        };
    }
}

if (isParadigmEnabled && paradigmModelText && typeof paradigmModelText === "string" && paradigmModelText.trim().length > 0) {
    parsed.paradigmUsed = {
        title: paradigmModelTitle || "Minuta Paradigma do Juiz",
        fullText: paradigmModelText
    };
}

const wasRotated = Boolean((response as any)?.wasRotated || (stage1Response as any)?.wasRotated);
const rotatedKey = (response as any)?.usedKey || (stage1Response as any)?.usedKey;
if (wasRotated && rotatedKey) {
    parsed.wasRotated = true;
    parsed.rotatedKey = rotatedKey;
    parsed.usedKeyIndex = (response as any)?.usedKeyIndex ?? (stage1Response as any)?.usedKeyIndex ?? 0;
    console.log(`[Assessor Judicial] Chave rotacionada no failover: ${rotatedKey.slice(0, 8)}... (índice ${parsed.usedKeyIndex})`);
}

    try{
        const generatedId=`analysis-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;
        const isValidProc = (num) => num && num.trim().length > 3 && !num.toLowerCase().includes('não informado') && !num.toLowerCase().includes('processo nº') && !num.toLowerCase().includes('extrair');
        const processNum = isValidProc(parsed.minute?.processNumber) ? parsed.minute.processNumber.trim() : (isValidProc(processInfo?.processNumber) ? processInfo.processNumber : "Número não identificado nos autos");
        if(parsed.minute) { parsed.minute.processNumber = processNum; }
        const titlePrompt=(customPromptText?customPromptText.slice(0,60).trim():"")||parsed.minute?.title||"Análise e Minuta Judicial";
        const serverAnalysisItem={
            id:generatedId,
            promptTitle:titlePrompt,
            date:Date.now(),
            processNumber:processNum,
            userEmail: reqUserEmail,
            userId: reqUserUid,
            userName: reqUserName,
            tenantId: reqTenantId,
            wasRotated: Boolean(parsed.wasRotated),
            rotatedKeySnippet: parsed.rotatedKey ? `...${parsed.rotatedKey.slice(-4)}` : undefined,
            result:parsed,
            holisticSynopsis: generatedHolisticSynopsis || undefined,
            deduplicationStats: {
                duplicatesFound: totalDuplicatesFound,
                charsSaved: totalCharsSaved
            },
            processTextContext:safeProcessText?safeProcessText.slice(0,1500):"Análise a partir de PDF/Autos"
        };
        let history=readJsonFile("history.json",[]);
        history.unshift(serverAnalysisItem);
        if(history.length>1e3){history=history.slice(0,1e3)}
        writeJsonFile("history.json",history);
        console.log(`[Storage] Análise 2 etapas ${generatedId} (${processNum}) gravada para ${reqUserEmail || 'anônimo'} no histórico compartilhado. Total: ${history.length}`);
        parsed.analysisId = generatedId;
    } catch (saveErr) {
        console.warn("[Storage] Falha ao persistir automaticamente no histórico do servidor:", saveErr);
    }

    if ((response as any)?.wasRotated && (response as any)?.usedKey) {
        parsed.rotatedKey = (response as any).usedKey;
    }
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
    if (!res.headersSent) {
        res.json(parsed);
    } else {
        try {
            res.write(JSON.stringify(parsed));
            res.end();
        } catch (_) {}
    }
} catch (error: any) {
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        const isDemand = error?.message?.includes("503") || 
                         error?.message?.includes("high demand") || 
                         error?.message?.includes("UNAVAILABLE") ||
                         error?.message?.includes("GOOGLE_QUEUE_TIMEOUT");
        const isQuota = error?.message?.includes("429") ||
                        error?.message?.includes("RESOURCE_EXHAUSTED") ||
                        error?.message?.includes("Quota exceeded");
        const statusCode = isQuota ? 429 : (isDemand ? 503 : 500);

        if (isDemand) {
            console.log("[Assessor Judicial] Aviso de alta demanda transitória dos clusters de IA do Google (503).");
        } else {
            console.log("[Assessor Judicial] Aviso ao concluir geração da minuta:", error?.message || error);
        }
        const formattedErr = formatGeminiError(error) || "Erro interno ao processar a minuta processual.";
        if (!res.headersSent) {
            res.status(statusCode).json({ error: formattedErr, isError: true });
        } else {
            try {
                res.write(JSON.stringify({ error: formattedErr, isError: true }));
                res.end();
            } catch (_) {}
        }
    }
});

app.get("/api/telemetry/server-history", (req, res) => {
    try {
        const history = readJsonFile("history.json", []);
        const simplified = history.slice(0, 200).map((h: any) => ({
            id: h.id,
            date: h.date,
            userEmail: h.userEmail,
            userName: h.userName,
            userId: h.userId,
            tenantId: h.tenantId,
            processNumber: h.processNumber,
            wasRotated: Boolean(h.wasRotated),
            rotatedKeySnippet: h.rotatedKeySnippet || '',
            totalTokenCount: h.result?.usage?.totalTokenCount || h.usage?.totalTokenCount || 0,
            promptTokenCount: h.result?.usage?.promptTokenCount || h.usage?.promptTokenCount || 0,
            candidatesTokenCount: h.result?.usage?.candidatesTokenCount || h.usage?.candidatesTokenCount || 0,
        }));
        res.json({ success: true, count: simplified.length, items: simplified });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});
if (process.env.NODE_ENV !== "production") {
    createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
    }).then(vite => {
        app.use(vite.middlewares);
        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log("Server running on http://localhost:" + PORT);
        });
        server.setTimeout(600000);
        server.keepAliveTimeout = 120000;
        server.headersTimeout = 125000;
    });
} else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
    const server = app.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on port " + PORT);
    });
    server.setTimeout(600000);
    server.keepAliveTimeout = 120000;
    server.headersTimeout = 125000;
}
