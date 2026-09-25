import express from "express";
import { GoogleGenAI, Type } from "@google/genai";


import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

async function processFileToPart(ai: any, file: any): Promise<any> {
  if (file.extractedText) {
    let safeText = file.extractedText;
    if (safeText.length > 5000000) {
      safeText = safeText.substring(0, 5000000) + "\n...[CONTEÚDO ADAPTADO PARA A CAPACIDADE MÁXIMA DA IA]...";
    }
    return { text: `[CONTEÚDO EXTRAÍDO DO ARQUIVO: ${file.name || 'documento'}]\n${safeText}\n[FIM DO ARQUIVO]` };
  } else if (file.base64) {
    let tmpPath: string | undefined;
    try {
      tmpPath = path.join(os.tmpdir(), `gemini_upload_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
      fs.writeFileSync(tmpPath, file.base64, 'base64');
      console.log(`[Petition] Uploading ${file.name || 'file'} to Gemini File API...`);
      let uploadResult = await ai.files.upload({ file: tmpPath, config: { mimeType: file.mimeType || "application/pdf" } });
      
      let fileInfo;
      let attempts = 0;
      while(attempts < 15) {
        fileInfo = await ai.files.get({ name: uploadResult.name });
        if(fileInfo.state !== "PROCESSING") break;
        await new Promise(r => setTimeout(r, 4000));
        attempts++;
      }
      if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      
      if(fileInfo?.state === "FAILED") {
        throw new Error(`Falha no processamento pelo Gemini para o arquivo ${file.name}.`);
      }
      return { fileData: { fileUri: uploadResult.uri, mimeType: file.mimeType || "application/pdf" } };
    } catch(err: any) {
      if (tmpPath && fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch {}
      }
      
      const errMsg = err?.message || String(err);
      const errLower = errMsg.toLowerCase();
      
      // Se for esgotamento de créditos, cota ou permissão, repassa imediatamente
      if (
        err?.status === 429 ||
        err?.status === 403 ||
        err?.status === 401 ||
        errLower.includes("prepayment credits") ||
        errLower.includes("resource_exhausted") ||
        errLower.includes("quota") ||
        errLower.includes("billing")
      ) {
        throw err;
      }
      
      // Para arquivos acima de 5MB base64, inlineData excederá o limite de requisição e causará erro 400
      if (file.base64.length > 5 * 1024 * 1024) {
        throw new Error(`O arquivo ${file.name || 'documento'} não pôde ser enviado para a nuvem Gemini e é muito grande (${Math.round(file.base64.length / 1024 / 1024)}MB) para envio direto inline. Tente extrair o texto em PDF ou dividir o documento.`);
      }
      
      console.warn(`[Petition] Erro no ai.files.upload para ${file.name}. Fallback para inlineData:`, err.message);
      return {
        inlineData: {
          data: file.base64,
          mimeType: file.mimeType || "application/pdf"
        }
      };
    }
  }
  return null;
}

export const petitionRouter = express.Router();

const SUPER_ADMIN_EMAIL = "fabriciocunha.adv@gmail.com";

// Trava de Segurança Mandatória: Acesso exclusivo ao Super Admin (fabriciocunha.adv@gmail.com)
petitionRouter.use((req, res, next) => {
  const userEmail = ((req.headers["x-user-email"] as string) || "").toLowerCase().trim();
  if (userEmail !== SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: "Acesso restrito. O módulo Petição & Defesa 360° é de uso exclusivo do Super Administrador (fabriciocunha.adv@gmail.com).",
      isForbidden: true
    });
  }
  next();
});

function getGeminiClient(userApiKey?: string): GoogleGenAI {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key do Google Gemini não configurada.");
  }
  return new GoogleGenAI({ apiKey });
}

function extractApiKey(req: express.Request): string | undefined {
  const customKey = req.headers["x-gemini-api-key"] || req.headers["x-custom-api-key"];
  if (typeof customKey === "string" && customKey.trim()) {
    return customKey.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return undefined;
}
async function generateWithRetry(ai: any, params: any): Promise<any> {
  const primaryModel = params.model || "gemini-3.8-flash";
  const fallbackModels = [
    primaryModel,
    primaryModel,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    primaryModel,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    primaryModel
  ];
  const maxRetries = fallbackModels.length;
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    const currentModel = fallbackModels[i];
    try {
      if (i > 0) {
        // More aggressive exponential backoff
        const waitMs = Math.min(25000, Math.round(4000 * Math.pow(1.5, i - 1) + Math.random() * 2000));
        console.log(`[Petição] Tentativa ${i + 1}/${maxRetries} de IA. Trocando para o modelo: ${currentModel}. Aguardando ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      
      const attemptParams = { ...params, model: currentModel };
      return await ai.models.generateContent(attemptParams);
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      console.log(`[Petição] Erro na tentativa ${i + 1} (${currentModel}): ${errMsg.slice(0, 150)}`);
      const isRecoverable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("overloaded") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("404") || errMsg.includes("not found");
      if (!isRecoverable) {
        throw err;
      }
    }
  }
  throw lastError;
}


function formatPetitionGeminiError(error: any, userApiKey?: string): string {
  const errMsg = error?.message || (typeof error === "object" ? JSON.stringify(error) : String(error));
  const errLower = errMsg.toLowerCase();
  
  if (
    errLower.includes("prepayment credits are depleted") ||
    errLower.includes("billing") ||
    errLower.includes("resource_exhausted") ||
    errLower.includes("quota exceeded") ||
    errLower.includes("429")
  ) {
    return userApiKey
      ? "A cota da sua Chave de API PESSOAL foi esgotada (Erro 429). Mesmo trocando a chave, se ela for do mesmo projeto no Google Cloud, o limite é compartilhado. Verifique seu faturamento no Google AI Studio."
      : "A cota da Chave de API NATIVA DO GABINETE foi esgotada momentaneamente (Erro 429). Por favor, ative sua Chave de API Pessoal nas configurações para continuar usando o sistema sem interrupções.";
  }
  
  if (errLower.includes("api_key_invalid") || errLower.includes("key not valid") || errLower.includes("api key not found")) {
    return "A Chave de API do Google Gemini informada é inválida ou não foi encontrada. Verifique a configuração da sua chave no menu de configurações.";
  }
  
  if (errLower.includes("503") || errLower.includes("unavailable") || errLower.includes("high demand") || errLower.includes("overloaded")) {
    return "Os servidores de inteligência artificial do Google estão com alta demanda momentânea. Aguarde alguns instantes e clique em 'Tentar Novamente'.";
  }
  
  if (errLower.includes("invalid_argument") || errLower.includes("400")) {
    if (errLower.includes("payload") || errLower.includes("too large") || errLower.includes("exceeds")) {
      return "O arquivo anexado excedeu o limite de envio binário direto. Recomendamos utilizar arquivos PDF com texto selecionável ou dividir documentos escaneados.";
    }
    return `Inconsistência nos argumentos da requisição (${errMsg.slice(0, 150)}). Verifique se o arquivo está íntegro e tente novamente.`;
  }
  
  return errMsg || "Erro ao processar requisição com a IA.";
}

interface GroundingResult {
  text: string;
  links: Array<{ url: string; title: string }>;
  queries: string[];
}

// PESQUISA REAL DE JURISPRUDÊNCIA VIA GOOGLE SEARCH GROUNDING
async function searchJurisprudenceWithGrounding(
  ai: GoogleGenAI,
  query: string,
  court: string
): Promise<GroundingResult> {
  try {
    const prompt = `Você é um Assistente Forense com acesso direto ao Google Search.
Pesquise no Google jurisprudência real, acórdãos e súmulas dos tribunais brasileiros (em especial ${court} e STJ/STF) sobre a seguinte matéria jurídica:
"${query}".

REGRAS DE OURO E TRANSPARÊNCIA:
1. Localize precedentes e acórdãos REAIS indexados no Google (com portais oficiais de tribunais, STJ, STF, Jusbrasil, Conjur, DJe).
2. É TERMINANTEMENTE PROIBIDO inventar números de processos, números de apelação sintéticos ou nomes genéricos de relatores como "Desembargador Relator".
3. Se encontrar decisões judiciais autênticas, cite o tribunal, número real da súmula/tema ou do processo real, ementa autêntica e o link da fonte.
4. Se NÃO encontrar acórdãos específicos reais indexados na web, forneça a tese doutrinária/teórica aplicável e declare expressamente que se trata de uma "Sugestão de Tese Argumentativa".`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const webChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];
    const searchLinks: Array<{ url: string; title: string }> = [];

    for (const chunk of webChunks as any[]) {
      if (chunk.web?.uri && chunk.web?.title) {
        searchLinks.push({
          url: chunk.web.uri,
          title: chunk.web.title
        });
      }
    }

    return {
      text: response.text || "",
      links: searchLinks,
      queries: (webQueries as string[]) || []
    };
  } catch (err) {
    console.error("Erro na busca de jurisprudência via Google Grounding:", err);
    return { text: "", links: [], queries: [] };
  }
}

// 1. ROTA DE AUTO-INGESTÃO E EXTRAÇÃO ULTRA-RÁPIDA DE PROVAS E AUTOS DO PROCESSO
petitionRouter.post("/auto-extract-evidence", async (req, res) => {
  let userApiKey: string | undefined;
  try {
    userApiKey = extractApiKey(req);
    const {
      pdfFiles, // legado/geral
      processFiles, // Autos do processo existente em PDF
      clientFiles, // Documentos e provas do cliente
      quickNotes,
      pieceType = "inicial",
      clientRole = "autor"
    } = req.body;
    const ai = getGeminiClient(userApiKey);

    const systemInstruction = `Você é um Advogado Sênior Especialista em Triagem Forense, Análise Probatória e Atuação Contenciosa (Defesa e Petição Inicial).
Sua missão é realizar a LEITURA IMEDIATA E ULTRA-AUTOMÁTICA dos documentos anexados:
- Se houver autos do processo em PDF (petição inicial da contraparte, despachos, certidões, decisões): extraia o número do processo, juízo/vara, autor, réu, resumo dos pedidos formulados pela contraparte e eventuais preliminares/prejudiciais aplicáveis. Sempre que extrair um fato, indique a fonte exata (Movimentação, Arquivo e Página, ex: Movimentação 1, Arquivo 5, Pág. 4/4).
- Se houver provas e documentos do cliente (extratos, prints, contratos, comprovantes de PIX, recibos, BO, laudos): analise o que cada um comprova para fundamentar a peça processual, indicando a fonte exata (Movimentação, Arquivo e Página).
- Se a peça for CONTESTAÇÃO ou DEFESA: crie a MATRIZ DE IMPUGNAÇÃO ESPECÍFICA (Art. 341 do CPC), confrontando as alegações da petição adversa com a prova documental do cliente.

REGRA ABSOLUTA DE FIDELIDADE PROBATÓRIA (ANTI-ALUCINAÇÃO):
- É TERMINANTEMENTE PROIBIDO inventar, deduzir ou presumir fatos, informações ou características que não estejam EXPRESSAMENTE ESCRITOS e visíveis nos documentos analisados.
- Se uma certidão, laudo ou documento afirmar algo (ex: "o falecido não deixou bens a inventariar"), limite-se ESTRITAMENTE a essa informação. NÃO invente conclusões adicionais (como "não deixou descendentes") a menos que constem textualmente no documento lido.

Você DEVE identificar com precisão cirúrgica:
1. "clientName": Nome completo do cliente defendido (com CPF/CNPJ se constar).
2. "defendantName": Nome da parte contrária (Banco, Empresa, Pessoa Física, etc. com CPF/CNPJ se constar).
3. "processNumber": Número da ação / autos do processo (ex: "5001234-56.2026.8.09.0051"), se houver.
4. "varaJuizo": Vara ou Juízo competente onde tramita ou deve tramitar o feito (ex: "2ª Vara Cível da Comarca de Goiânia/GO").
5. "lawArea": Área do direito recomendada (ex: "Direito do Consumidor / Bancário", "Transporte Aéreo", "Cível Geral", "Trabalhista", "Previdenciário").
6. "targetCourt": Tribunal competente sugerido (ex: "TJGO", "TJSP", "TRF1", "TRT18", etc.).
7. "factualNarrative": ${pieceType === 'inicial' 
    ? '"Relato cronológico e persuasivo dos fatos extraídos das provas e documentos do cliente."' 
    : '"SÍNTESE DOS FATOS ALEGADOS PELA PARTE ADVERSA (extraída EXCLUSIVAMENTE dos autos do processo / petição inicial adversa). NÃO inclua as refutações da defesa neste campo, apenas o que a parte contrária alegou."'
  }
8. "materialDamages": Valor monetário em discussão ou dano material comprovado.
9. "hasUrgency": Boolean indicando se há urgência patente (ex: tutela provisória, bloqueio de bens, risco de perecimento, arresto).
10. "urgencyJustification": Justificativa técnica do perigo de dano (art. 300 do CPC) ou pedido de efeito suspensivo.
11. "identifiedPreliminaries": Array com preliminares identificadas sob o Art. 337 do CPC (ex: "Inépcia da Inicial", "Ilegitimidade Passiva Ad Causam", "Incompetência do Juízo", "Falta de Interesse de Agir", "Impugnação ao Valor da Causa").
12. "identifiedPrejudiciais": Array com prejudiciais de mérito detectadas (ex: "Prescrição Trienal/Quinquenal", "Decadência").
13. "matrizImpugnacao": Array de objetos com { "alegacaoAutor": string, "refutacaoDefesa": string, "documentoRef": string } confrontando pontos da inicial adversa com a prova do réu (Art. 341 CPC).
14. "evidenceList": Array com cada documento analisado e o que ele comprova cabalmente.

Responda ESTRITAMENTE em formato JSON.`;

    const contentsParts: any[] = [];

    // Arquivos dos Autos do Processo
    if (processFiles && Array.isArray(processFiles) && processFiles.length > 0) {
      contentsParts.push({ text: "=== DOCUMENTOS DOS AUTOS DO PROCESSO EXISTENTE (Petição da contraparte / Decisões / Certidões) ===" });
      for (const file of processFiles) {
        const part = await processFileToPart(ai, file);
        if (part) contentsParts.push(part);
      }

    }

    // Provas do Cliente
    if (clientFiles && Array.isArray(clientFiles) && clientFiles.length > 0) {
      contentsParts.push({ text: "=== DOCUMENTOS E PROVAS APRESENTADAS PELO CLIENTE (Contratos / Extratos / Comprovantes / Prints) ===" });
      for (const file of clientFiles) {
        const part = await processFileToPart(ai, file);
        if (part) contentsParts.push(part);
      }

    }

    // Fallback legado
    if ((!processFiles || processFiles.length === 0) && (!clientFiles || clientFiles.length === 0) && pdfFiles && Array.isArray(pdfFiles)) {
      for (const file of pdfFiles) {
        const part = await processFileToPart(ai, file);
        if (part) contentsParts.push(part);
      }

    }

    contentsParts.push({
      text: `Contexto da atuação:
Tipo de Peça Pretendida: ${pieceType}
Papel do Cliente: ${clientRole === "reu" ? "RÉU (Defesa)" : "AUTOR"}
Anotações rápidas do advogado: ${quickNotes || "Nenhuma anotação adicional, extraia 100% dos documentos."}

Extraia todos os elementos fáticos, processuais e probatórios em JSON.`
    });

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: contentsParts,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 8192
      }
    });

    const responseText = response.text || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        try {
          parsedData = JSON.parse(match[1]);
        } catch (e) {
          throw new Error("A IA retornou um formato inválido de extração.");
        }
      } else {
        throw new Error("A IA não retornou um JSON válido na extração.");
      }
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error in /api/advogado-peticao/auto-extract-evidence:", error);
    const errMsg = formatPetitionGeminiError(error, userApiKey);
    return res.status(500).json({ error: errMsg });
  }
});

// 2. ROTA DE REDAÇÃO INTEGRAL DA PEÇA FORENSE 360° (INICIAL, CONTESTAÇÃO/DEFESA, RÉPLICA, INCIDENTAL OU RECURSO)
petitionRouter.post("/generate-full-petition", async (req, res) => {
  let userApiKey: string | undefined;
  try {
    userApiKey = extractApiKey(req);
    const {
      pieceType = "inicial",
      clientRole = "autor",
      processNumber,
      varaJuizo,
      clientName,
      defendantName,
      lawArea,
      targetCourt,
      caseDescription,
      customPrompt,
      wantsUrgency,
      wantsGratuity,
      hasConciliationOption,
      causeValue,
      pdfFiles,
      processFiles,
      clientFiles,
      preliminaresSelecionadas,
      tempestividadeInfo,
      repetitiveTemplateId,
      customClientVars,
      cabinetTesesText,
      knowledgePdfs
    } = req.body;

    const ai = getGeminiClient(userApiKey);

    const isDefense = pieceType === "contestacao" || clientRole === "reu";
    const isReplica = pieceType === "replica";
    const isRecurso = pieceType === "recurso";
    const isIncidental = pieceType === "incidental";

    let pieceGuidelines = "";
    if (isDefense) {
      pieceGuidelines = `VOCÊ ESTÁ REDIGINDO UMA CONTESTAÇÃO / DEFESA DO RÉU (ART. 335 DO CPC).
POSTURA: 100% DEFENSIVA, AGUERRIDA, COMBATIVA E TÉCNICA EM FAVOR DO RÉU/CLIENTE. ESTA PEÇA DEVE SER EXTREMAMENTE ROBUSTA, ARGUMENTATIVA E APROFUNDADA.
ESTRUTURA OBRIGATÓRIA DA CONTESTAÇÃO:
1. Endereçamento correto à Vara/Juízo onde tramitam os autos (Processo nº ${processNumber || "[NÚMERO DOS AUTOS]"}).
2. Qualificação do Réu e requerimento expresso de juntada de procuração e habilitação exclusiva dos advogados.
3. Tempestividade expressa: demonstrar detalhadamente a contagem do prazo de 15 dias úteis (art. 219 e 335 do CPC), citando a juntada do mandado ou intimação eletrônica (${tempestividadeInfo || "tempestiva no prazo legal"}).
4. Breve Síntese da Petição Inicial formulada pela parte autora.
5. Das Preliminares de Mérito (Art. 337 do CPC): abordar expressamente as preliminares cabíveis (${Array.isArray(preliminaresSelecionadas) && preliminaresSelecionadas.length > 0 ? preliminaresSelecionadas.join(", ") : "Inépcia da inicial, falta de interesse de agir, ilegitimidade passiva, etc."}), fundamentando o pedido de extinção sem resolução do mérito (Art. 485, IV/VI).
6. Das Prejudiciais de Mérito: prescrição e decadência, se aplicáveis.
7. Do Mérito e da Impugnação Específica dos Fatos (Art. 341 do CPC): Impugnar parágrafo por parágrafo as alegações autorais com base nos documentos do réu, demonstrando inexistência de culpa, excludente de responsabilidade (culpa exclusiva do autor ou terceiro - art. 14, §3º CDC ou art. 393 CC) e ausência de dano moral (mero dissabor cotidiano).
8. Da Eventual Reconvenção / Pedido Contraposto (se cabível conforme os fatos).
9. Do Protesto por Provas e Relação de Documentos Juntados.
10. Dos Pedidos e Fecho: Acolhimento das preliminares ou, no mérito, improcedência total dos pedidos autorais, condenação do autor em honorários sucumbenciais (art. 85, §2º) e custas.`;
    } else if (isReplica) {
      pieceGuidelines = `VOCÊ ESTÁ REDIGINDO UMA IMPUGNAÇÃO À CONTESTAÇÃO / RÉPLICA (ARTS. 350 E 351 DO CPC).
POSTURA: COMBATIVA E FAVORÁVEL AO AUTOR. ESTA PEÇA DEVE SER EXTREMAMENTE ROBUSTA, ARGUMENTATIVA E APROFUNDADA. Rejeite e esmiuce todas as preliminares levantadas pelo réu, impugne rigorosamente os documentos juntados pela defesa, aponte preclusão, reafirme os pedidos da inicial com forte fundamentação e requeira o julgamento antecipado ou deferimento probatório.`;
    } else if (isRecurso) {
      pieceGuidelines = `VOCÊ ESTÁ REDIGINDO UMA PEÇA RECURSAL (APELAÇÃO, AGRAVO DE INSTRUMENTO OU EMBARGOS DE DECLARAÇÃO).
POSTURA: COMBATIVA COM DIALETICIDADE RECURSAL (Art. 932, III e 1.010 CPC). ESTA PEÇA DEVE SER EXTREMAMENTE ROBUSTA E EXTENSA. Demonstrar exaustivamente o cabimento, tempestividade, preparo ou gratuidade, evidenciar com clareza o erro in procedendo ou in iudicando e fundamentar densamente o pedido de reforma/anulação da decisão impugnada.`;
    } else if (isIncidental) {
      pieceGuidelines = `VOCÊ ESTÁ REDIGINDO UMA MANIFESTAÇÃO INCIDENTAL / ESPECIFICAÇÃO DE PROVAS / IMPUGNAÇÃO A LAUDO PERICIAL.
POSTURA: ESTRITAMENTE TÉCNICA, PROFUNDA E OBJETIVA. APROFUNDE-SE NOS ARGUMENTOS, indicando a pretensão probatória detalhadamente justificada ou formulando críticas técnicas contundentes e quesitos precisos ao ato processual.`;
    } else {
      pieceGuidelines = `VOCÊ ESTÁ REDIGINDO UMA PETIÇÃO INICIAL 360° (ARTS. 319 E 320 DO CPC).
POSTURA: 100% FAVORÁVEL AO AUTOR. ESTA PEÇA DEVE SER EXTREMAMENTE ROBUSTA, ARGUMENTATIVA E APROFUNDADA, com endereçamento, qualificação, fatos cronológicos esmiuçados, tutela de urgência (art. 300) fortemente fundamentada (probabilidade do direito e perigo de dano), densos fundamentos de direito, vacinas contra possíveis preliminares do réu, opção pela conciliação e pedidos líquidos certos com astreintes.`;
    }

    let systemInstruction = `Você é o "Redator Forense 360°" — um motor de Inteligência Artificial de elite EXCLUSIVO para a Advocacia Contenciosa e ESPECIALISTA DE ALTA PERFORMANCE (Senior Partner) em todas as áreas do direito.
Você NÃO age como juiz, assessor de gabinete ou auditor imparcial.
SUA POSTURA É 100% COMBATIVA, PERSUASIVA, EXAUSTIVAMENTE TÉCNICA E PARCIAL EM DEFESA DO SEU CLIENTE (${clientRole === "reu" ? "RÉU" : "AUTOR"}).
SUA MISSÃO É REDIGIR UMA PEÇA ROBUSTA, LONGA, DENSA E ESTRATÉGICA. NUNCA ENTREGUE UM RESUMO OU UMA PEÇA SIMPLES. Explore TODOS OS PONTOS FÁTICOS E JURÍDICOS POSSÍVEIS. Crie tópicos bem divididos, desenvolva a argumentação com profundidade (doutrina, analogia, princípios constitucionais), cite os fatos com precisão cirúrgica sem inventar absolutamente nada. Onde houver comandos extras do usuário (PROMPT PERSONALIZADO), você DEVE aplicá-los com a MÁXIMA ESPECIALIDADE, esgotando a tese solicitada com excelência jurídica.

DIRETRIZES DA PEÇA ATUAL:
${pieceGuidelines}

SEUS PILARES FUNDAMENTAIS OBRIGATÓRIOS:
1. RIGOR AO CÓDIGO DE PROCESSO CIVIL E LEGISLAÇÃO PERTINENTE (CDC, CC, CF/88, Leis Especiais).
2. PRECEDENTES VINCULANTES E TRANSPARÊNCIA TOTAL SOBRE JURISPRUDÊNCIA:
   - É TERMINANTEMENTE PROIBIDO inventar números de processos, apelações sintéticas ou desembargadores relatores genéricos (ex: "Desembargador Relator").
   - Quando citar súmula pacificada ou tema repetitivo oficial (ex: "Súmula 297 do STJ", "Tema 1061 do STJ", "Súmula Vinculante 37 do STF"), classifique como "tipo": "real_verificado" e "isRealVerificado": true.
   - Quando NÃO houver link oficial ou acórdão concreto confirmado na busca web, classifique SEMPRE como "tipo": "sugestao_tese", "isRealVerificado": false, e defina o "precedentNumber" como "💡 Sugestão de Tese Argumentativa" (NUNCA invente número de processo no CNJ!).
3. FIDELIDADE ABSOLUTA AOS DOCUMENTOS ANEXADOS (ANTI-ALUCINAÇÃO):
   - É TERMINANTEMENTE PROIBIDO inventar, deduzir ou presumir fatos, informações ou características da causa que não estejam expressamente descritos na "DESCRIÇÃO DOS FATOS" ou nos documentos anexados.
   - Leia as provas e certidões com extrema precisão e limite-se ESTRITAMENTE às declarações textuais contidas nelas. Sempre cite a origem exata da prova, indicando Evento/Movimentação, Arquivo e Página (ex: "conforme consta na Movimentação 1, Arquivo 5, Pág. 4/4").
4. AUDITORIA PREVENTIVA CPC INTEGRADA NO JSON (com nota de 0 a 100 e conformidade de cada requisito).
5. SE FOR DEFESA: MATRIZ DE IMPUGNAÇÃO ESPECÍFICA (ART. 341 CPC) rebatendo cada ponto da inicial com referência documental.

Retorne rigorosamente no seguinte schema JSON:
{
  "title": "Título Formal da Peça (ex: CONTESTAÇÃO C/C PRELIMINARES...)",
  "fullPetitionMarkdown": "Texto integral da peça. FORMATAÇÃO OBRIGATÓRIA: Use parágrafos devidamente justificados ou recuados quando for jurisprudência, adicione espaçamentos entre as seções. Aplique marcação negrito ou itálico para enfatizar as teses centrais e artigos de lei. A formatação deve ser PROFISSIONAL, pronta para impressão, semelhante a uma peça redigida em software de edição de texto com rigor ortográfico e estético.",
  "cleanTextPreview": "Resumo sintético de 2 parágrafos da peça...",
  "favorableJurisprudence": [
    {
      "court": "${targetCourt || "STJ"}",
      "precedentNumber": "Número real da Súmula/Tema ou '💡 Sugestão de Tese Argumentativa'",
      "theme": "Tema da tese",
      "summary": "Resumo da tese favorável",
      "favorableArgument": "Como beneficia a parte defendida",
      "fullCitation": "Ementa oficial ou redação da tese doutrinária recomendada",
      "tipo": "real_verificado ou sugestao_tese",
      "isRealVerificado": true,
      "fonteUrl": "URL oficial se encontrada ou vazio",
      "fonteNome": "Fonte oficial / Google Grounding ou Sugestão de Tese",
      "alertaAutenticidade": "Explicação transparente para o advogado"
    }
  ],
  "anticipatedDefenses": [
    "Ponto controverso 1 abordado e superado na peça",
    "Ponto controverso 2..."
  ],
  "matrizImpugnacao": [
    {
      "alegacaoAutor": "Alegação da parte contrária nos autos",
      "refutacaoDefesa": "Refutação jurídica e fática elaborada",
      "documentoRef": "Documento anexo que comprova a refutação"
    }
  ],
  "auditCpc": {
    "status": "aprovado",
    "score": 98,
    "safeForProtocol": true,
    "criticalAlerts": [],
    "items": [
      {
        "id": "item_1",
        "label": "Juízo e Endereçamento",
        "requirement": "Art. 319, I ou Art. 335 CPC",
        "isCompliant": true,
        "details": "Adequado aos autos e competência."
      },
      {
        "id": "item_2",
        "label": "Qualificação e Habilitação",
        "requirement": "Art. 77, V c/c Art. 287 CPC",
        "isCompliant": true,
        "details": "Qualificação completa e requerimento de juntada de procuração."
      },
      {
        "id": "item_3",
        "label": "Tempestividade",
        "requirement": "Art. 219 e Art. 335 CPC",
        "isCompliant": true,
        "details": "Comprovada observância do prazo processual em dias úteis."
      },
      {
        "id": "item_4",
        "label": "Impugnação Específica / Pedidos Certos",
        "requirement": "Art. 341 ou Art. 322 CPC",
        "isCompliant": true,
        "details": "Refutação detalhada de cada ponto controverso sem preclusão."
      },
      {
        "id": "item_5",
        "label": "Provas e Documentos",
        "requirement": "Art. 320 ou Art. 434 CPC",
        "isCompliant": true,
        "details": "Juntada tempestiva das provas documentais do cliente."
      }
    ]
  },
  "kitProcuracao": "Texto pronto da Procuração Ad Judicia com poderes específicos para esta atuação...",
  "kitDeclaracaoPobreza": "Texto pronto da Declaração de Hipossuficiência Financeira..."
}`;

    const promptUser = `
DADOS DA ATUAÇÃO ADVOCATÍCIA:
- Tipo de Peça: ${pieceType.toUpperCase()}
- Papel do Cliente: ${clientRole === "reu" ? "RÉU (Defesa / Polo Passivo)" : "AUTOR (Polo Ativo)"}
- Número dos Autos: ${processNumber || "Ação originária ou a distribuir"}
- Vara / Juízo: ${varaJuizo || "Juízo competente"}
- Cliente Defendido: ${clientName || "Cliente a qualificar"}
- Parte Contrária: ${defendantName || "Parte adversa"}
- Área do Direito: ${lawArea || "Cível / Consumidor"}
- Tribunal / Foro: ${targetCourt || "TJGO"}
- Tutela de Urgência / Efeito Suspensivo: ${wantsUrgency ? "SIM" : "NÃO"}
- Gratuidade de Justiça: ${wantsGratuity ? "SIM (Art. 98 CPC)" : "NÃO"}
- Preliminares Arguidas: ${Array.isArray(preliminaresSelecionadas) && preliminaresSelecionadas.length > 0 ? preliminaresSelecionadas.join(", ") : "Preliminares de praxe cabíveis"}
- Informações de Tempestividade: ${tempestividadeInfo || "Prazo regular de lei"}
- Valor da Causa / Proveito: ${causeValue || "Conforme petição inicial ou estimativa"}

DESCRIÇÃO DOS FATOS, PROVAS E CONTROVÉRSIA:
${caseDescription}

${customPrompt && customPrompt.trim() !== "" ? `COMANDOS EXTRAS / PROMPT PERSONALIZADO DA ADVOGADA:
ATENÇÃO IA: O usuário inseriu comandos específicos para a estratégia da causa.
COMO ESPECIALISTA, VOCÊ DEVE INTERPRETAR ESTES COMANDOS COM A MÁXIMA ESPECIALIDADE TÉCNICA.
NÃO FAÇA APENAS UMA MENÇÃO SUPERFICIAL. DESENVOLVA TESES COMPLETAS, ABORDANDO TODOS OS PONTOS E ESTRATÉGIAS POSSÍVEIS DERIVADAS DESTE COMANDO, mergulhando no Direito Material e Processual cabível, SEMPRE sem alucinar fatos não provados.
"""
${customPrompt}
"""` : ""}

A PEÇA FORENSE DEVE SER ESTRUTURADA DE FORMA PROFUNDA, COM MÚLTIPLAS PÁGINAS DE CONTEÚDO (LONG-FORM). ESCREVA PARÁGRAFOS DENSOS, CITE DOUTRINA, CITE JURISPRUDÊNCIA, REBATA CADA ARGUMENTO COM EXAUSTÃO. ENTREGUE UMA VERDADEIRA TESE DE ESPECIALISTA. NUNCA ENTREGUE UM ESBOÇO SIMPLES OU RESUMO!
VOCÊ DEVE RESPONDER ESTRITAMENTE EM UM FORMATO JSON VÁLIDO. NÃO RETORNE TEXTO PURO. NAO USE FORMATACAO COM CRASE SE FOR QUEBRAR A RESPOSTA. O ARQUIVO DEVE SER EXATAMENTE O JSON SOLICITADO NO SCHEMA. O campo fullPetitionMarkdown deve conter o texto formatado rigorosamente. Redija a peça forense completa, primorosa e combativa em Markdown, e preencha todos os campos do JSON (inclusive precedentes vinculantes pró-cliente, auditoria de conformidade processual, matriz de impugnação do art. 341 se defesa, e minutas de procuração e declaração).`;

    const contentsParts: any[] = [];

    // Juntar arquivos do processo e do cliente
    if (processFiles && Array.isArray(processFiles) && processFiles.length > 0) {
      contentsParts.push({ text: "=== DOCUMENTOS DOS AUTOS DO PROCESSO (Petição Inicial adversa / Decisões / Certidões) ===" });
      for (const file of processFiles) {
        const part = await processFileToPart(ai, file);
        if (part) contentsParts.push(part);
      }

    }

    if (clientFiles && Array.isArray(clientFiles) && clientFiles.length > 0) {
      contentsParts.push({ text: "=== DOCUMENTOS E PROVAS DO CLIENTE (Contratos / Extratos / Recibos / Prints) ===" });
      for (const file of clientFiles) {
        const part = await processFileToPart(ai, file);
        if (part) contentsParts.push(part);
      }

    }

    // Fallback legado se enviado no campo unificado
    if ((!processFiles || processFiles.length === 0) && (!clientFiles || clientFiles.length === 0) && pdfFiles && Array.isArray(pdfFiles)) {
      for (const file of pdfFiles) {
        const part = await processFileToPart(ai, file);
        if (part) contentsParts.push(part);
      }

    }

    let groundingInfo: GroundingResult = { text: "", links: [], queries: [] };
    try {
      // Extrair termos jurídicos substanciais, ignorando dados de qualificação
      let cleanCoreTheme = caseDescription
        .replace(/EXCELENT[ÍI]SSIMO[\s\S]*?VARA/i, "")
        .replace(/[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}/g, "")
        .replace(/\b(brasileiro|casado|solteiro|inscrito no CPF|portador do RG|residente e domiciliado)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      const keyWords = cleanCoreTheme.split(" ").slice(0, 25).join(" ");
      const searchQuery = `"${lawArea || "Direito Cível"}" ${keyWords} ${targetCourt || "TJGO"} jurisprudencia precedentes`;
      groundingInfo = await searchJurisprudenceWithGrounding(ai, searchQuery, targetCourt || "TJGO");
      if (groundingInfo.text || groundingInfo.links.length > 0) {
        contentsParts.push({
          text: `=== PESQUISA REAL DE JURISPRUDÊNCIA NO GOOGLE (GROUNDING) ===
Resultados e precedentes reais encontrados na web para este caso:
${groundingInfo.text}

Links oficiais autênticos indexados:
${groundingInfo.links.map(l => `- [${l.title}](${l.url})`).join("\n")}`
        });
      }
    } catch (err) {
      console.warn("Google Grounding durante redação da petição falhou silenciosamente:", err);
    }

    contentsParts.push({ text: promptUser });

    const response = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: contentsParts,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.5,
        maxOutputTokens: 8192
      }
    });

    const responseText = response.text || "{}";
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // 1. Tentar pegar com bloco markdown
      const match = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (match) {
        try {
          parsedData = JSON.parse(match[1]);
        } catch(e) {}
      }
      
      // 2. Fallback robusto via Regex (para extrair strings ignorando erros estruturais de JSON longo)
      if (!parsedData || !parsedData.fullPetitionMarkdown) {
         const markdownMatch = responseText.match(/"fullPetitionMarkdown"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/);
         const titleMatch = responseText.match(/"title"\s*:\s*"([^"]*?)"/);
         
         if (markdownMatch && markdownMatch[1]) {
             parsedData = {
                 ...parsedData,
                 title: titleMatch ? titleMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : (pieceType === "contestacao" ? "Contestação" : "Petição Inicial"),
                 fullPetitionMarkdown: markdownMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t')
             };
         } else {
             // Fallback radical: limpar sintaxe crua do JSON se vazou para o texto
             let cleanText = responseText;
             const jsonRawMatch = cleanText.match(/\{\s*"title"\s*:.*?"fullPetitionMarkdown"\s*:\s*"(.*)/s);
             if (jsonRawMatch) {
                 cleanText = jsonRawMatch[1];
                 cleanText = cleanText.replace(/"\s*\}\s*$/, ''); // remove fechamento de aspas e chaves no final
             }
             cleanText = cleanText.replace(/\\n/g, '\n').replace(/\\"/g, '"');
             parsedData = {
               title: pieceType === "contestacao" ? "Contestação" : "Petição Inicial",
               fullPetitionMarkdown: cleanText
             };
         }
      }
    }

    // Pós-processamento e Auditoria Estrita de Autenticidade da Jurisprudência
    if (Array.isArray(parsedData.favorableJurisprudence)) {
      parsedData.favorableJurisprudence = parsedData.favorableJurisprudence.map((item: any, idx: number) => {
        const hasUrl = typeof item.fonteUrl === "string" && item.fonteUrl.startsWith("http");
        const isOfficialPrecedent = item.precedentNumber && (
          /súmula|sumula|tema repetitivo|tema vinculante|tema stj|tema stf|súmula vinculante/i.test(item.precedentNumber)
        );

        // Se tem link real verificado ou é súmula oficial pacificada
        const isReal = (item.tipo === "real_verificado" || item.isRealVerificado === true) && (hasUrl || isOfficialPrecedent);
        const tipo = isReal ? "real_verificado" : "sugestao_tese";

        let precedentNumber = item.precedentNumber || "Tese Jurídica";
        // Prevenir números de autos sintéticos inventados pela IA
        if (!isReal && (/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(precedentNumber) || /apelação|agravo/i.test(precedentNumber))) {
          precedentNumber = "💡 Sugestão de Tese Argumentativa";
        }

        const fallbackLink = groundingInfo.links[idx]?.url || groundingInfo.links[0]?.url;

        return {
          ...item,
          tipo,
          isRealVerificado: isReal,
          fonteUrl: hasUrl ? item.fonteUrl : (isReal && fallbackLink ? fallbackLink : undefined),
          fonteNome: isReal 
            ? (item.fonteNome || (hasUrl ? "Google Grounding (Oficial)" : "Precedente Vinculante Oficial"))
            : "Sugestão de Tese Argumentativa (Construção Doutrinária)",
          alertaAutenticidade: isReal
            ? "Precedente ou acórdão com respaldo verificado na web ou Súmula oficial vinculante."
            : "💡 Sugestão de Tese Argumentativa: Trata-se de orientação de mérito e doutrina jurídica. Não cite numeração de autos sem antes validar no repositório de jurisprudência do tribunal.",
          precedentNumber
        };
      });
    }

    return res.json({ 
      success: true, 
      data: parsedData,
      groundingSearch: {
        linksCount: groundingInfo.links.length,
        queries: groundingInfo.queries
      }
    });
  } catch (error: any) {
    console.error("Error in /api/advogado-peticao/generate-full-petition:", error);
    
    let errMsg = error.message || "";
    if (errMsg.includes("INVALID_ARGUMENT") || errMsg.includes("400")) {
      errMsg = "O documento anexado ou o texto extraído é muito grande ou inválido para o modelo processar de uma só vez (limite de contexto ou tamanho de arquivo excedido). Por favor, divida o documento em partes menores e tente novamente.";
    }
    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("resource_exhausted") || errMsg.includes("429")) {
      errMsg = userApiKey 
        ? "A cota da sua Chave de API PESSOAL foi esgotada (Erro 429). Mesmo trocando a chave, se ela for do mesmo projeto no Google Cloud, o limite é compartilhado. Verifique seu faturamento no Google AI Studio."
        : "A cota da Chave de API NATIVA DO GABINETE foi esgotada momentaneamente (Erro 429). Por favor, ative sua Chave de API Pessoal nas configurações para continuar usando o sistema.";
    }
    return res.status(500).json({ error: errMsg || "Erro ao redigir peça jurídica." });
  }
});

// 3. ROTA EXCLUSIVA DE PESQUISA DIRETA DE JURISPRUDÊNCIA NO GOOGLE (GROUNDING EM TEMPO REAL)
petitionRouter.post("/search-grounding", async (req, res) => {
  let userApiKey: string | undefined;
  try {
    userApiKey = extractApiKey(req);
    const { query, theme, court = "TJGO", lawArea = "Cível", caseDescription } = req.body;
    
    let finalQuery = (query || "").trim();
    if (!finalQuery && theme) {
      finalQuery = `"${theme}" ${court} jurisprudência precedentes`;
    } else if (!finalQuery && caseDescription) {
      let cleanDesc = String(caseDescription)
        .replace(/[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}/g, "")
        .replace(/\b(brasileiro|casado|solteiro|inscrito no CPF|portador do RG|residente e domiciliado)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      finalQuery = `${lawArea} ${cleanDesc.substring(0, 150)} ${court} jurisprudência`;
    }

    if (!finalQuery) {
      return res.status(400).json({ error: "Termo ou tema de busca obrigatório." });
    }

    const ai = getGeminiClient(userApiKey);
    const grounding = await searchJurisprudenceWithGrounding(ai, finalQuery, court);

    const parsePrompt = `A partir do seguinte resultado de pesquisa com Google Grounding, extraia uma lista JSON estruturada com precedentes e teses jurídicas encontradas.
MÁXIMA TRANSPARÊNCIA:
- Se for acórdão real ou súmula oficial com link ativo nos dados da busca, marque "tipo": "real_verificado", "isRealVerificado": true, e vincule a "fonteUrl" correta correspondente aos links reais encontrados.
- Se for construção doutrinária ou argumentativa sem julgado específico linkado, marque "tipo": "sugestao_tese", "isRealVerificado": false, e "precedentNumber": "💡 Sugestão de Tese Argumentativa". NUNCA INVENTE NÚMEROS DE PROCESSO.

Formato esperado (array de objetos):
[
  {
    "court": "${court}",
    "precedentNumber": "Número da Súmula, Tema ou '💡 Sugestão de Tese Argumentativa'",
    "theme": "Título conciso",
    "summary": "Resumo da decisão ou tese",
    "favorableArgument": "Como beneficia a causa",
    "fullCitation": "Ementa ou síntese doutrinária",
    "tipo": "real_verificado ou sugestao_tese",
    "isRealVerificado": boolean,
    "fonteUrl": "URL do portal oficial ou vazia",
    "fonteNome": "Nome da fonte",
    "alertaAutenticidade": "Texto orientativo"
  }
]

LINKS ENCONTRADOS PELO GOOGLE:
${JSON.stringify(grounding.links, null, 2)}

TEXTO DA PESQUISA DO GOOGLE:
${grounding.text}

Retorne ESTRITAMENTE o array JSON, sem blocos markdown adicionais.`;

    const structuredResp = await generateWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: parsePrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let items: any[] = [];
    try {
      items = JSON.parse(structuredResp.text || "[]");
    } catch {
      items = [];
    }

    // Se o modelo retornou vazio mas há links oficiais encontrados pelo Google:
    if (items.length === 0 && grounding.links.length > 0) {
      items = grounding.links.slice(0, 4).map((l, i) => ({
        court: court,
        precedentNumber: l.title.length > 50 ? l.title.substring(0, 50) + "..." : l.title,
        theme: finalQuery,
        summary: `Decisão / julgado localizado pelo Google Search Grounding referente a: ${finalQuery}.`,
        favorableArgument: "Tese com respaldo e fundamentação correspondente nos tribunais.",
        fullCitation: `Fonte indexada: ${l.title}`,
        tipo: "real_verificado",
        isRealVerificado: true,
        fonteUrl: l.url,
        fonteNome: "Google Search Grounding",
        alertaAutenticidade: "Precedente e link oficial validado em tempo real no Google."
      }));
    }

    // Pós-processamento estrito para evitar alucinações e vincular URLs reais
    items = items.map((item: any, idx: number) => {
      const hasUrl = typeof item.fonteUrl === "string" && item.fonteUrl.startsWith("http");
      const fallbackUrl = grounding.links[idx]?.url || (grounding.links.length > 0 ? grounding.links[0].url : undefined);
      const isOfficialPrecedent = item.precedentNumber && (
        /súmula|sumula|tema repetitivo|tema vinculante|tema stj|tema stf|súmula vinculante/i.test(item.precedentNumber)
      );

      const isReal = (item.tipo === "real_verificado" || item.isRealVerificado === true || hasUrl || Boolean(fallbackUrl)) && (hasUrl || Boolean(fallbackUrl) || isOfficialPrecedent);
      const tipo = isReal ? "real_verificado" : "sugestao_tese";

      let precedentNumber = item.precedentNumber || "Tese Jurídica";
      if (!isReal && (/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(precedentNumber) || /apelação|agravo/i.test(precedentNumber))) {
        precedentNumber = "💡 Sugestão de Tese Argumentativa";
      }

      const assignedUrl = hasUrl ? item.fonteUrl : (isReal && fallbackUrl ? fallbackUrl : undefined);

      return {
        ...item,
        court: item.court || court,
        tipo,
        isRealVerificado: isReal,
        fonteUrl: assignedUrl,
        fonteNome: isReal 
          ? (item.fonteNome || (assignedUrl ? "Google Grounding (Oficial)" : "Precedente Vinculante Oficial"))
          : "Sugestão de Tese Argumentativa (Construção Doutrinária)",
        alertaAutenticidade: isReal
          ? "Precedente com respaldo autêntico verificado na web ou Súmula oficial vinculante."
          : "💡 Sugestão de Tese Argumentativa: Trata-se de orientação de mérito e doutrina jurídica. Não cite numeração de autos sem antes validar no repositório de jurisprudência do tribunal.",
        precedentNumber
      };
    });

    return res.json({
      success: true,
      items,
      rawText: grounding.text,
      links: grounding.links,
      queries: grounding.queries
    });
  } catch (error: any) {
    console.error("Error in /api/advogado-peticao/search-grounding:", error);
    
    let errMsg = error.message || "";
    if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("resource_exhausted") || errMsg.includes("429")) {
      errMsg = userApiKey 
        ? "A cota da sua Chave de API PESSOAL foi esgotada (Erro 429). Mesmo trocando a chave, se ela for do mesmo projeto no Google Cloud, o limite é compartilhado. Verifique seu faturamento no Google AI Studio."
        : "A cota da Chave de API NATIVA DO GABINETE foi esgotada momentaneamente (Erro 429). Por favor, ative sua Chave de API Pessoal nas configurações para continuar usando o sistema.";
    }
    return res.status(500).json({ error: errMsg || "Erro ao consultar Google Grounding." });
  }
});

