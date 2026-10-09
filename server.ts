
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
import { extractFromCoverPage } from './src/utils/judicialMetadataExtractor';
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

5. ESTRUTURAÇÃO DA FUNDAMENTAÇÃO JUDICIAL CONFORME O TIPO DO ATO (ART. 489, § 1º, DO CPC):
   A 'fundamentacao' DEVE ser estruturada em subtópicos Markdown ('### 1. ...', '### 2. ...'), com proibição absoluta de parágrafos telegráficos, sucintos ou genéricos:
   - SE O ATO FOR DECISÃO INTERLOCUTÓRIA (Tutela de Urgência / Liminar / Alimentos / Cautelar / Pedidos não decididos):
     Estruturada nos subtópicos próprios da tutela provisória e preliminares:
     ### 1. DA ADMISSIBILIDADE E GRATUIDADE DA JUSTIÇA (análise circunstanciada da prova de renda/contracheques e arts. 98 e 99 do CPC).
     ### 2. DA TUTELA DE URGÊNCIA (exame dogmático da probabilidade do direito / fumus boni iuris, perigo de dano ou risco ao resultado útil / periculum in mora, reversibilidade, confronto probatório detalhado dos autos e fixação de parâmetros operacionais: percentuais sobre rendimentos líquidos, base de cálculo em folha, pensão subsidiária em caso de desemprego ou prazos e astreintes).
     ### 3. [DEMAIS PEDIDOS PRELIMINARES OU URGENTES CONEXOS] (ex: guarda unilateral provisória e convivência sob a égide da Lei 14.713/2023 e art. 1.584 do CC; ou ordem de abstenção/desbloqueio no CDC; ou medidas cautelares).
     ### 4. DA DESIGNAÇÃO DE AUDIÊNCIA DE MEDIAÇÃO/CONCILIAÇÃO E CITAÇÃO (arts. 334 ou 695 do CPC / Juizados / prazos de resposta).
     (É expressamente VEDADO incluir sucumbência e honorários do art. 85 do CPC em decisões interlocutórias).
   - SE O ATO FOR SENTENÇA (Julgamento de Mérito ou Extinção):
     Estruturada nos 7 blocos obrigatórios de mérito:
     ### 1. DA REGULARIDADE PROCESSUAL, COMPETÊNCIA E GRATUIDADE DA JUSTIÇA
     ### 2. DO EXAME INDIVIDUALIZADO DE TODAS AS PRELIMINARES E PREJUDICIAIS
     ### 3. DO CERNE DA LIDE E DELIMITAÇÃO DAS QUESTÕES CONTROVERTIDAS
     ### 4. DO REGIME JURÍDICO APLICÁVEL, NORMAS E SÚMULAS VINCULANTES
     ### 5. DO CONFRONTO FÁTICO-PROBATÓRIO DOCUMENTO A DOCUMENTO
     ### 6. DA APRECIAÇÃO EXAUSTIVA E VALORAÇÃO INDIVIDUALIZADA DE CADA PEDIDO
     ### 7. DOS CONSECTÁRIOS LEGAIS, JUROS E CORREÇÃO MONETÁRIA (LEI Nº 14.905/2024), CUSTAS E HONORÁRIOS ADVOCATÍCIOS (ART. 85 DO CPC).
   - SE O ATO FOR DECISÃO DE SANEAMENTO E ORGANIZAÇÃO (Art. 357 do CPC):
     Estruturada nos incisos do art. 357 (1. Regularidade e preliminares; 2. Pontos controvertidos; 3. Ônus da prova; 4. Questões de direito; 5. Provas admitidas e designação de AIJ).
   - SE O ATO FOR EMBARGOS DE DECLARAÇÃO (Art. 1.022 do CPC):
     Estruturada nos subtópicos (1. Admissibilidade e tempestividade; 2. Exame dos vícios apontados; 3. Precedentes vinculantes).
   - DIRETRIZ MANDATÓRIA DE LINGUAGEM SIMPLES E ACESSÍVEL (GUIA SIMPLES E FÁCIL DO TJGO & PACTO NACIONAL DO JUDICIÁRIO PELA LINGUAGEM SIMPLES - STF/CNJ):
     * BANIMENTO DE LATINÓRIOS (EXPRESSÕES EM LATIM): É terminantemente PROIBIDO o emprego de expressões em latim (*in casu*, *fumus boni iuris*, *periculum in mora*, *ab initio*, *quantum debeatur*, *ex positis*, *data venia*, *inaudita altera parte*, *in albis*, *sub judice*, etc.). Substitua-as sempre por vernáculo límpido em língua portuguesa: "neste caso / no caso em apreço", "aparência do bom direito / probabilidade do direito", "perigo de dano ou risco ao resultado útil", "desde o início", "valor devido", "diante do exposto", "com o devido respeito", "sem oitiva prévia da parte contrária", "sem manifestação", etc.
     * SUPRESSÃO DE JURIDIQUÊS ARCAICO E ANACRÔNICO: É expressamente PROIBIDO o uso de vocábulos obsoletos e arcaísmos jurídicos (ex.: *hodiernamente*, *dessarte*, *destarte*, *outrossim*, *prefalado*, *guerreado*, *digladiar*, *peça vestibular*, *exordial*, *decisum*, *estribado*, *arrimado*, *ululante*, *sobejo*). Utilize português contemporâneo, sóbrio e direto: "atualmente / hoje", "portanto / assim / desse modo", "além disso", "mencionado", "discutido", "petição inicial", "decisão / sentença", "baseado / fundamentado", "evidente", etc.
     * ORDEM DIRETA E FRASES CONCISAS: Priorize a ordem direta (Sujeito + Verbo + Complemento), períodos curtos e voz ativa. O jurisdicionado e as partes devem compreender com clareza a decisão, mantendo-se a densidade técnica e o rigor dos fundamentos.
   - Use **negrito** nas conclusões e nomes de documentos, e *itálico* em nomes de leis e citações normativas.
   - Parágrafos separados por duas quebras de linha (\\n\\n). Proibido usar termos artificiais como "PARÁGRAFO 1". Proibido truncar ou abreviar fundamentações mesmo em modelos mais leves ou chaves gratuitas.

6. DIRETRIZ DE GRANDEZA E PROFUNDIDADE COGNITIVA IRRENUNCIÁVEL (INDEPENDENTEMENTE DO MODELO EM EXECUÇÃO):
   - Ainda que a requisição seja processada por modelos secundários, contingenciais ou acionados ao final da esteira (como gemini-flash-latest, gemini-3.5-flash-lite, gemini-3.1-flash-lite ou gemini-flash-lite-latest), é TERMINANTEMENTE PROIBIDO simplificar, abreviar, resumir, omitir detalhes fáticos, aglutinar tópicos ou descartar dados dos autos.
   - A minuta e o relatório DEVEM rigorosamente manter a mesma grandeza, amplitude, densidade analítica, piso de 14 a 20+ parágrafos na fundamentação distribuídos nos 7 blocos obrigatórios, citações exatas de movimentações/páginas e transcrições literais entre aspas, idêntica ao padrão de excelência dos modelos de raciocínio profundo da linha principal (gemini-3.8-flash).

7. PROTOCOLO DE ADSTRIÇÃO E CONGRUÊNCIA ESTRITA AOS PEDIDOS (ARTS. 141 E 492 DO CPC):
   - O magistrado e o assessor devem decidir estritamente nos limites dos pedidos formulados pelas partes, sendo vedada decisão extra petita, ultra petita ou citra petita.
   - BIPARTIÇÃO E INDIVIDUALIZAÇÃO ESTRITA EM CASO DE LITISCONSÓRCIO OU RÉUS MÚLTIPLOS (PROIBIÇÃO ABSOLUTA DE FUSÃO DE POLOS): Se a petição formular requerimentos distintos para litisconsortes diferentes (ex: pedido de pesquisa de endereço em sistemas conveniados para a pessoa jurídica e pedido de intimação por WhatsApp para a pessoa física), o ato DEVE apreciar cada requerimento de forma autônoma e espelhada. É expressamente PROIBIDO estender o meio de comunicação postulado contra um réu ao outro se a parte não requereu (ex: estender WhatsApp à empresa se o autor não pediu para ela, ou presumir representação administrativa sem pedido expresso), e é expressamente PROIBIDO converter pedidos imediatos de um réu em pedidos subsidiários do outro.

8. TRAVA DE FIDELIDADE ALFANUMÉRICA E CONTATOS (ANTI-ALUCINAÇÃO DE TELEFONES E DDDs):
   - Em relação a números de telefone, DDDs, e-mails, endereços, CPFs, CNPJs, contas bancárias, valores, placas ou dados cadastrais: é TERMINANTEMENTE PROIBIDO criar números derivados, alterar DDDs (ex: alterar ou duplicar DDD 64 para 62 ou vice-versa), completar padrões ou inventar terminais que não constem ipsis litteris da petição. Somente devem constar no dispositivo e relatório os dados exatamente informados nos autos.

9. DELIBERAÇÃO ESTRITA SOBRE O OBJETO DA PETIÇÃO INTERCORRENTE (SEM REPETIÇÃO INÓCUA DE DESPACHOS PRECLUSOS):
   - Quando os autos estiverem em fase de cumprimento de sentença ou após tentativas citatórias/intimatórias frustradas, e a petição versar sobre localização de devedores ou meios de comunicação processual (WhatsApp, pesquisas em sistemas SISBAJUD/INFOJUD/RENAJUD), o ato judicial DEVE se ater a apreciar os meios postulados (deferindo/indeferindo as pesquisas e a comunicação eletrônica nos termos requeridos), sem reabrir ou repetir provimentos inaugurais pretéritos de intimação para pagamento com multa do art. 523 do CPC já proferidos nos autos.`;

function filterThesesByThematicRelevance(thesesText: string, caseContext: string): string {
    if (!thesesText || typeof thesesText !== "string") return "";
    const ctxLower = (caseContext || "").toLowerCase();
    
    // Identificação dos ramos principais do processo concreto
    const isFamilia = ctxLower.includes("alimento") || ctxLower.includes("guarda") || ctxLower.includes("divórcio") || ctxLower.includes("divorcio") || ctxLower.includes("união estável") || ctxLower.includes("uniao estavel") || ctxLower.includes("menor") || ctxLower.includes("visitas") || ctxLower.includes("convivência") || ctxLower.includes("paternidade");
    const isPenal = ctxLower.includes("crime") || ctxLower.includes("delito") || ctxLower.includes("penal") || ctxLower.includes("inquérito") || ctxLower.includes("tco") || ctxLower.includes("prisão") || ctxLower.includes("liberdade provisória") || ctxLower.includes("medidas protetivas");
    const isFazendaSaude = ctxLower.includes("medicamento") || ctxLower.includes("cirurgia") || ctxLower.includes("leito de uti") || ctxLower.includes("tratamento médico") || ctxLower.includes("natjus") || ctxLower.includes("fazenda pública") || ctxLower.includes("município de") || ctxLower.includes("estado de goiás");
    const isBancarioConsumidor = ctxLower.includes("empréstimo") || ctxLower.includes("emprestimo") || ctxLower.includes("cartão") || ctxLower.includes("cartao") || ctxLower.includes("consignado") || ctxLower.includes("rmc") || ctxLower.includes("rcc") || ctxLower.includes("tarifa bancária") || ctxLower.includes("seguro prestamista") || ctxLower.includes("negativação") || ctxLower.includes("spc") || ctxLower.includes("serasa");

    // Divisão por blocos/tópicos de teses (ex: "I – ", "1. ", "## ", "== ")
    const blocks = thesesText.split(/\n(?=(?:[I|V|X]+\s*[-–]|(?:\d+\.|\#\#|\=\=)\s*[A-ZÁ-Ú]))/);
    if (blocks.length > 1) {
        const relevantBlocks = blocks.filter(b => {
            const bLow = b.toLowerCase();
            // Se for Família, expurga teses bancárias de consignado/RMC/bancos
            if (isFamilia && (bLow.includes("bancário") || bLow.includes("bancario") || bLow.includes("empréstimo consignado") || bLow.includes("emprestimo consignado") || bLow.includes("cartão rmc") || bLow.includes("rmc/rcc") || bLow.includes("tarifa bancária") || bLow.includes("instituição financeira"))) {
                return false;
            }
            // Se for Penal, expurga teses de consumidor/bancos
            if (isPenal && (bLow.includes("contratos bancários") || bLow.includes("contratos bancarios") || bLow.includes("empréstimo consignado") || bLow.includes("cartão rmc"))) {
                return false;
            }
            // Se for Saúde/Fazenda, expurga teses bancárias
            if (isFazendaSaude && (bLow.includes("contratos bancários") || bLow.includes("contratos bancarios") || bLow.includes("empréstimo consignado") || bLow.includes("cartão rmc"))) {
                return false;
            }
            // Se for Bancário, expurga teses de família
            if (isBancarioConsumidor && !isFamilia && (bLow.includes("guarda unilateral") || bLow.includes("alimentos provisórios") || bLow.includes("convivência paterno-filial"))) {
                return false;
            }
            return true;
        });

        if (relevantBlocks.length > 0) {
            return relevantBlocks.join("\n\n").trim();
        }
    }
    
    // Se a tese inteira for puramente bancária e a ação for de Família ou Penal, descarta para evitar poluição conceitual
    if (isFamilia && (thesesText.toLowerCase().includes("contratos bancários") || thesesText.toLowerCase().includes("contratos bancarios") || thesesText.toLowerCase().includes("empréstimo consignado") || thesesText.toLowerCase().includes("emprestimo consignado")) && !thesesText.toLowerCase().includes("alimento") && !thesesText.toLowerCase().includes("família") && !thesesText.toLowerCase().includes("familia")) {
        return "";
    }

    return thesesText;
}

function getActiveCabinetTeses(cabinetTesesText: any, isTesesEnabled: any, caseContext?: string) {
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
    const effectiveBase = cleaned.length > 20 ? cleaned : raw;
    // SOBERANIA INTEGRAL DO CADERNO DE TESES (SOLUÇÃO 1):
    // Preserva 100% das teses cadastradas sem filtros rígidos ou expurgos por palavras-chave,
    // permitindo que o modelo aplique teses materiais e processuais (ex.: art. 924, II pelo pagamento,
    // alvará, custas, honorários e provimentos da Corregedoria) a qualquer classe ou ramo do direito.
    return effectiveBase;
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
        const testModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
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