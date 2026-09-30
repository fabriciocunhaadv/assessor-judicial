/**
 * Utilitário especializado na extração automática de metadados processuais de autos judiciais (PDF/Texto):
 * - Número do Processo (padrão CNJ: 0000000-00.0000.0.00.0000 ou 20 dígitos);
 * - Partes (Promovente/Autor/Requerente/Embargante/Exequente e Promovido/Réu/Requerido/Embargado/Executado);
 * - Comarca e Vara / Unidade Judiciária;
 * - Detecção da Marcha Processual e Questões Pendentes de Julgamento:
 *   * Sentença prévia proferida nos autos;
 *   * Embargos de Declaração pendentes de julgamento (ex.: mov. 55);
 *   * Cumprimento de sentença / Execução;
 *   * Fase inicial postulatória / Tutela de urgência pendente;
 *   * Fase saneadora (art. 357 do CPC).
 */

export interface JudicialExtractedMetadata {
  processNumber: string;
  author: string;
  defendant: string;
  judicialUnit: string;
  hasSentencaProferida: boolean;
  hasEmbargosDeclaracao: boolean;
  embargosMovimentacao?: string;
  pendingMatterDescription: string;
  suggestedActType: "embargos" | "decisao" | "despacho" | "sentenca";
}

// Filtro estrito para rejeitar expressões narrativas, predicados e ruídos que não são nomes de partes
export function isInvalidPartyName(val: any): boolean {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  const normalized = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (lower.length < 3 || lower.length > 150) return true;

  // Termos genéricos ou marcadores de placeholder
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
    lower.includes("identificado na") ||
    lower.includes("identificado no") ||
    lower.includes("identificado nos") ||
    lower.includes("conforme inicial") ||
    lower.includes("autos do processo")
  ) {
    return true;
  }

  // Expressões genéricas de suposta autoria, delitos ou narrativa fática
  if (
    normalized.includes("suposto autor") ||
    normalized.includes("suposta autora") ||
    normalized.includes("suposto infrator") ||
    normalized.includes("suposta autoria") ||
    normalized.includes("pela pratica") ||
    normalized.includes("pelo delito") ||
    normalized.includes("pelo crime") ||
    normalized.includes("pela conduta") ||
    normalized.includes("pelo cometimento") ||
    normalized.includes("pelo fato") ||
    normalized.includes("do delito") ||
    normalized.includes("do crime") ||
    normalized.includes("da conduta") ||
    normalized.includes("da infracao") ||
    normalized.includes("termo circunstanciado") ||
    normalized.includes("inquerito") ||
    normalized.includes("boletim de ocorrencia") ||
    normalized.includes("registro de atendimento") ||
    normalized.includes("a apurar") ||
    normalized.includes("em apuracao") ||
    normalized.includes("nao identificado") ||
    normalized.includes("desconhecid") ||
    normalized.includes("fato delituoso") ||
    normalized.includes("imobiliari") ||
    normalized.includes("individualizad") ||
    normalized.includes("benfeitori") ||
    normalized.includes("fracao ideal") ||
    normalized.includes("fracoes ideais") ||
    normalized.includes("loteamento") ||
    normalized.includes("matricula") ||
    normalized.includes("usucapiao") ||
    normalized.includes("reintegracao") ||
    normalized.includes("interdito proibitorio") ||
    normalized.includes("despejo") ||
    normalized.includes("danos morais") ||
    normalized.includes("danos materiais") ||
    normalized.includes("lucros cessantes") ||
    normalized.includes("obrigacao de fazer") ||
    normalized.includes("cobranca de") ||
    normalized.includes("declaratoria de")
  ) {
    return true;
  }

  // Rejeição estrita de andamentos processuais e peticionamentos de eventos
  if (
    /\b(?:apresentou|peticionou|juntou|manifestou|manifestação|manifestacao|requereu|informou|protocolou|cadastrou|expediu|certificou|intimou|citou)\b/i.test(normalized) ||
    /\b(?:no\s+mov|na\s+mov|no\s+evento|no\s+arq|mov\b|evento\b)\b/i.test(normalized) ||
    /(?:apresentou\s+manifesta|peticionou\s+no|juntou\s+peti|em\s+curso\s+de\s+prazo)/i.test(normalized)
  ) {
    return true;
  }

  // Fatos, relações afetivas e predicados da petição inicial (NUNCA são nomes de partes)
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
  if (narrativeVerbs.some((v) => normalized.includes(v))) {
    return true;
  }

  // Ruídos procedimentais (Ministério Público é parte legítima no polo ativo, logo NÃO deve constar aqui)
  const proceduralNoise = [
    "designacao", "designação", "audiencia", "audiência", "instrucao", "instrução",
    "conciliacao", "conciliação", "julgamento", "despacho", "decisao", "decisão",
    "sentenca", "sentença", "certidao", "certidão", "intimacao", "intimação",
    "citacao", "citação", "contestacao", "contestação", "impugnacao", "impugnação",
    "mandado", "peticao", "petição", "requerimento", "cumprimento", "execucao", "execução",
    "preclusao", "preclusão", "recurso", "apelacao", "apelação", "agravo", "embargos",
    "movimentacao", "movimentação", "evento", "autos", "secretaria", "vara", "comarca",
    "juizado", "tribunal", "prazo",
    "procuracao", "procuração", "conclusao", "conclusão", "arquivamento"
  ];
  if (proceduralNoise.some((term) => normalized.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
    return true;
  }

  if (/^(a|o|as|os|da|do|das|dos|de|em|para|por)\s+(designa|solicita|requer|pede|realiza|marca|abre|julga|converte|alega|aduz|mant)/i.test(lower)) {
    return true;
  }

  return false;
}

function cleanCandidateParty(val: string): string {
  if (!val) return "";
  let s = val.replace(/[\*\_]/g, "").trim();
  s = s.replace(/^(?:em\s+face\s+d[eao]s?|contra|em\s+desfavor\s+d[eao]s?|desfavor\s+d[eao]s?)\s*[:\-]?\s*/i, "").trim();
  s = s.replace(/^(?:o\s+|a\s+|os\s+|as\s+)?(?:autor(?:a)?|promovente|requerente|embargante|exequente|promovid[oa](?:\([^\)]+\)|s)?|requerid[oa](?:\([^\)]+\)|s)?|executad[oa](?:\([^\)]+\)|s)?|embargad[oa](?:\([^\)]+\)|s)?|r[eé]u(?:\/r[eé])?|r[eé]|autor(?:a)?\s+do\s+fato|supost[oa]\s+autor(?:a)?(?:\s+do\s+fato)?|infrator(?:a)?|investigad[oa]|indiciad[oa]|acusad[oa]|noticiad[oa]|v[ií]tima|ofendid[oa]|noticiante|comunicante)\s*[:\-]?\s*/i, "").trim();
  s = s.replace(/^(?:de|do|da|dos|das)\s+/i, "").trim();
  s = s.replace(/\s+(?:Processo\b|\d{7}[-.]|Movimenta[cç]|Arquivo\s*\d|P[aá]gina|\d{2}\/\d{2}\/\d{4}).*$/i, "").trim();
  s = s.replace(/\s*(?:\([^\)]+\)|\[[^\]]+\])\s*$/, "").trim(); // Remove trailing (CPF: ...), (OAB: ...), etc.
  s = s.replace(/[,\.\-–:]+$/, "").trim();
  return s;
}

/**
 * Extração de dados da Capa do Processo (1ª página do PDF - Projudi, PJe, e-SAJ, etc.):
 * - Identifica com precisão cirúrgica: Número do Processo, Juízo/Vara, Polo Ativo e Polo Passivo
 */
export function extractFromCoverPage(text: string): { processNumber: string; author: string; defendant: string; judicialUnit: string } {
  const result = { processNumber: "", author: "", defendant: "", judicialUnit: "" };
  if (!text || typeof text !== "string") return result;

  // Capa do Processo: primeiros 8.000 caracteres ou antes da página 2
  const page2Idx = text.indexOf("[Página 2");
  const rawScope = page2Idx > 0 ? text.slice(0, page2Idx + 500) : text.slice(0, 8000);

  // Normalizar removendo formatação markdown de negrito e itálico para permitir cruzamento textual límpido
  const cleanScope = rawScope.replace(/[\*\_]/g, "");

  // 1. Processo Nº na Capa
  const procMatch = cleanScope.match(/(?:Processo\s*(?:N[º°o]|\.)?\s*[:\-]?\s*|Autos\s*(?:n[º°o]|\.)?\s*[:\-]?\s*)(\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})/i)
    || cleanScope.match(/\b(\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})\b/);
  if (procMatch && procMatch[1]) {
    result.processNumber = procMatch[1].replace(/\s+/g, "");
  }

  // 2. Juízo / Vara na Capa (suporta colons simples, líder de pontos, traços ou quebra)
  const unitMatch = cleanScope.match(/(?:Ju[ií]zo|Vara|[OÓ]rg[aã]o\s+Julgador)\s*[\.\:\-\s]{1,40}[:\-]?\s*([A-Za-zÁ-Úá-ú0-9\s\-\/\,]{4,100}?)(?=\s*(?:\n|Prioridade|Tipo\s+A[cç][aã]o|Segredo|Fase|Data|Valor|2\.|$))/i);
  if (unitMatch && unitMatch[1]) {
    result.judicialUnit = unitMatch[1].trim();
  }

  // Seção de Partes (Projudi / PJe / TJGO)
  // Verifica se há colunas horizontais lado a lado: "Polo Ativo Polo Passivo\nNOME_AUTOR NOME_REU"
  const colMatch = cleanScope.match(/Polo\s+Ativo\s+Polo\s+Passivo\s*\n\s*([A-ZÁ-Ú][A-Za-zÁ-Ú0-9\s\.\-\&\/]{2,80}?)\s{2,}([A-ZÁ-Ú][A-Za-zÁ-Ú0-9\s\.\-\&\/]{2,80})/i);
  if (colMatch && colMatch[1] && colMatch[2]) {
    const cAuth = cleanCandidateParty(colMatch[1]);
    const cDef = cleanCandidateParty(colMatch[2]);
    if (!isInvalidPartyName(cAuth)) result.author = cAuth;
    if (!isInvalidPartyName(cDef)) result.defendant = cDef;
    if (result.author && result.defendant) return result;
  }

  // 3. Polo Ativo na Capa (ex.: "Polo Ativo VANDERSON BORGES Polo Passivo ...", com ou sem dois pontos, com pontilhado ou quebra)
  const authPatterns = [
    /(?:polo\s+ativo|promovente(?:s)?|requerente(?:s)?|exequente(?:s)?|autor(?:a)?)\s*[\.\:\-\s]{1,40}\s*([A-ZÁ-Ú][A-Za-zÁ-Ú0-9 \t\.\-\&\/]{2,90}?)(?=\s*(?:\r?\n|\[|\(|polo\s+passivo|promovid|requerid|r[eé]u|r[eé]|advogad|procurad|oab|cpf|cnpj|valor|classe|assunto|\d+\.|$))/i,
    /(?:polo\s+ativo|promovente(?:s)?|requerente(?:s)?|exequente(?:s)?|autor(?:a)?)\s*[\.\:\-\s]{1,40}\s*([A-ZÁ-Ú][A-Za-zÁ-Ú0-9\s\.\-\&\/]{2,110}?)(?=\s*(?:\n|\[|polo\s+passivo|promovid|requerid|r[eé]u|r[eé]|advogad|procurad|oab|cpf|cnpj|valor|classe|assunto|\d+\.|$))/i,
    /(?:PROJUDI|PJe)\s*[-–:].*?(?:promovente|autor(?:a)?|polo\s+ativo)(?:\s*\([^\)]+\))?\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Ú0-9\s\.\-\&\/]{2,110})/i
  ];
  for (const pat of authPatterns) {
    const m = cleanScope.match(pat);
    if (m && m[1]) {
      const clean = cleanCandidateParty(m[1]);
      if (!isInvalidPartyName(clean) && clean.toLowerCase() !== "polo passivo") {
        result.author = clean;
        break;
      }
    }
  }

  // 4. Polo Passivo na Capa (ex.: "Polo Passivo MARLENE LEANDRO COUTO ...", com ou sem dois pontos, com pontilhado ou quebra)
  const defPatterns = [
    /(?:polo\s+passivo|promovid[oa](?:s)?|requerid[oa](?:s)?|executad[oa](?:s)?|r[eé]u|r[eé]|autor(?:a)?\s+do\s+fato|infrator(?:a)?)\s*[\.\:\-\s]{1,40}\s*([A-ZÁ-Ú][A-Za-zÁ-Ú0-9 \t\.\-\&\/]{2,90}?)(?=\s*(?:\r?\n|\[|\(|polo\s+ativo|advogad|procurad|oab|cpf|cnpj|terceir|interessad|valor|classe|assunto|\d+\.|$))/i,
    /(?:polo\s+passivo|promovid[oa](?:s)?|requerid[oa](?:s)?|executad[oa](?:s)?|r[eé]u|r[eé]|autor(?:a)?\s+do\s+fato|infrator(?:a)?)\s*[\.\:\-\s]{1,40}\s*([A-ZÁ-Ú][A-Za-zÁ-Ú0-9\s\.\-\&\/]{2,110}?)(?=\s*(?:\n|\[|polo\s+ativo|advogad|procurad|oab|cpf|cnpj|terceir|interessad|valor|classe|assunto|\d+\.|$))/i,
    /(?:PROJUDI|PJe)\s*[-–:].*?(?:promovid[oa]|requerid[oa]|r[eé]u|r[eé]|polo\s+passivo)(?:\s*\([^\)]+\))?\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Ú0-9\s\.\-\&\/]{2,110})/i
  ];
  for (const pat of defPatterns) {
    const m = cleanScope.match(pat);
    if (m && m[1]) {
      const clean = cleanCandidateParty(m[1]);
      if (!isInvalidPartyName(clean) && clean.toLowerCase() !== "polo ativo") {
        result.defendant = clean;
        break;
      }
    }
  }

  return result;
}

export function extractJudicialMetadataFromText(text: string): JudicialExtractedMetadata {
  if (!text || typeof text !== "string") {
    return {
      processNumber: "",
      author: "",
      defendant: "",
      judicialUnit: "",
      hasSentencaProferida: false,
      hasEmbargosDeclaracao: false,
      pendingMatterDescription: "",
      suggestedActType: "sentenca",
    };
  }

  // 0. Prioridade máxima absoluta: Extração direta da Capa do Processo (1ª página do PDF)
  const coverMeta = extractFromCoverPage(text);
  let processNumber = coverMeta.processNumber;
  let author = coverMeta.author;
  let defendant = coverMeta.defendant;
  let judicialUnit = coverMeta.judicialUnit;

  // 1. Número do Processo: Fallback se não localizado na Capa
  if (!processNumber) {
    const headerMatch = text.match(/(?:Processo\s*(?:N[º°o]|\.)?\s*[:\-]?\s*|Autos\s*(?:n[º°o]|\.)?\s*[:\-]?\s*)(\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})/i);
    if (headerMatch && headerMatch[1]) {
      processNumber = headerMatch[1].replace(/\s+/g, "");
    } else {
      const cnjRegex = /\b(\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})\b/;
      const mCnj = text.match(cnjRegex);
      if (mCnj && mCnj[1]) {
        processNumber = mCnj[1].replace(/\s+/g, "");
      } else {
        const mDigits = text.match(/\b(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})\b/);
        if (mDigits) {
          processNumber = `${mDigits[1]}-${mDigits[2]}.${mDigits[3]}.${mDigits[4]}.${mDigits[5]}.${mDigits[6]}`;
        }
      }
    }
  }

  // 2. Extração do Autor / Promovente / Requerente / Vítima / Ministério Público: Fallback se não localizado na Capa
  if (!author) {
    const authorPatterns = [
      // Padrão Capa TJGO / PROJUDI com quebra de linha: "Polo Ativo\nNOME DO AUTOR" ou com dois pontos "Polo Ativo: NOME"
      /(?:polo\s+ativo|promovente|requerente|exequente|embargante|impetrante|v[ií]tima|ofendid[oa]|noticiante|comunicante|querelante)(?:\s*\([^\)]+\))?\s*[:\-\n]+\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,110}?)(?=\s*(?:\n\s*(?:polo\s+passivo|promovido|requerido|réu|ré|embargado|executado|autor\s+do\s+fato|suposto\s+autor|infrator|investigado|acusado|cpf|cnpj|advogad|procurad|ação|autos|juiz|1\.|2\.|3\.)|$))/i,
      // "Autor(a): Nome" ou "Vítima: Nome" ou "Noticiante: Nome"
      /(?:autor(?:a)?|v[ií]tima|ofendid[oa]|noticiante|comunicante|querelante)(?:\s*\([^\)]+\))?\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,110}?)(?=\s*(?:\n|réu|ré|requerido|promovido|polo\s+passivo|autor\s+do\s+fato|infrator|cpf|cnpj|advogad|procurad|$))/i,
      // Identificação direta de Ministério Público no Polo Ativo
      /(?:polo\s+ativo|promovente|requerente|autor(?:a)?)\s*[:\-]?\s*(Minist[eé]rio\s+P[uú]blico(?:\s+do\s+Estado\s+de\s+[A-Za-zÁ-Úá-ú]+|\s+Federal)?|Justi[cç]a\s+P[uú]blica)/i,
      // "ação ... deflagrada / proposta / ajuizada por NOME em face de"
      /(?:instaurad[oa]|propost[oa]|ajuizad[oa]|promovid[oa]|movid[oa]|deflagrad[oa])\s+por\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,110}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s+em\s+face|\s+contra|\s+desfavor)/i,
      // "NOME, devidamente qualificado(a)... ajuizou..."
      /^([A-ZÁ-Ú][A-ZÁ-Ú\s]{3,90}?)\s*,\s*(?:brasileir[oa]|estadocivil|maior|inscrit[oa]|portador[oa]|residente|domiciliad[oa]|por\s+seu\s+advogado)/im,
    ];

    for (const pat of authorPatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        let candidate = cleanCandidateParty(match[1]);
        if (!isInvalidPartyName(candidate)) {
          author = candidate;
          break;
        }
      }
    }
  }

  // Se não localizou autor nominal, mas o feito é TCO / Criminal / Inquérito e cita o Ministério Público ou Justiça Pública
  if (!author) {
    const isCriminalOrTco = /(?:termo\s+circunstanciado|tco\b|inqu[eé]rito|a[cç][aã]o\s+penal|jecrim|juizado\s+especial\s+criminal|delito|infração\s+penal)/i.test(text);
    if (isCriminalOrTco) {
      if (/Minist[eé]rio\s+P[uú]blico\s+do\s+Estado\s+de\s+Goi[aá]s|MPGO/i.test(text)) {
        author = "Ministério Público do Estado de Goiás";
      } else if (/Justi[cç]a\s+P[uú]blica/i.test(text)) {
        author = "Justiça Pública";
      } else {
        author = "Ministério Público do Estado de Goiás";
      }
    }
  }

  // 3. Extração do Réu / Promovido / Requerido / Autor do Fato / Infrator: Fallback se não localizado na Capa
  if (!defendant) {
    const defendantPatterns = [
      // Padrão 1: Tópicos expressos de polo passivo na Petição Inicial ou Capa: "Requerido(a): Nome", "Promovido(a): Nome", "Polo Passivo: Nome", "Réu: Nome"
      /(?:polo\s+passivo|promovid[oa](?:\([^\)]+\)|s)?|requerid[oa](?:\([^\)]+\)|s)?|executad[oa](?:\([^\)]+\)|s)?|embargad[oa](?:\([^\)]+\)|s)?|impetrad[oa](?:\([^\)]+\)|s)?|r[eé]u(?:\/r[eé])?|autor(?:a)?\s+do\s+fato|infrator(?:a)?|acusad[oa]|investigad[oa])\s*[:\-\n]+\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,140}?)(?=\s*(?:\r?\n\s*(?:polo\s+ativo|promovente|requerente|autor|embargante|executado|v[ií]tima|ofendid|cpf|cnpj|advogad|procurad|ação|autos|juiz|3\.|4\.|advogado|oab|valor|comarca|vara)|,\s*(?:pessoa\s+jur[ií]dica|inscrit|brasileir|portador|com\s+sede|residente|qualificad)|$))/i,

      // Padrão 2: Preâmbulo da Petição Inicial - "em face de / do / da", "em desfavor de / do / da", "contra" (com ou sem dois pontos, com ou sem quebra de linha)
      /(?:em\s+face\s+d[eao]s?|em\s+desfavor\s+d[eao]s?|desfavor\s+d[eao]s?|contra\s+(?:o|a|os|as)?)\s*[:\-]?\s*\n?\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,140}?)(?=\s*(?:,\s*(?:partes?\s+)?devidamente|,\s*(?:pessoa\s+jur[ií]dica|inscrit[oa]|brasileir[oa]|portador[oa]|com\s+sede|residente|maior|domiciliad|ambos|tombad)|,\s*qualificad|\s+devidamente\s+qualificad|\s+pessoa\s+jur[ií]dica|\s+inscrit[oa]\s+no\s+(?:cnpj|cpf)|\s+brasileir[oa]|\s+visando|\s+pretendendo|\r?\n\s*\r?\n|\r?\n\s*(?:pelos?\s+fatos|vem|perante|vem\s+respeitosamente)|$))/i,

      // Padrão 3: "ação ... deflagrada / proposta / movida em face de / contra NOME"
      /(?:instaurad[oa]|propost[oa]|ajuizad[oa]|promovid[oa]|movid[oa]|deflagrad[oa])\s+(?:por\s+[^\n,]+?\s+)?(?:em\s+face\s+d[eao]s?|contra|em\s+desfavor\s+d[eao]s?)\s*[:\-]?\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,140}?)(?=[,\n]|\s+qualificad|\s+pessoa\s+jur[ií]dica|\s+visando)/i,

      // Padrão 4: Padrão específico para TCO / JECRIM / Criminal: "Autor do Fato: Nome" ou "Suposto Autor do Fato: Nome" ou "Infrator: Nome"
      /(?:autor(?:a)?\s+do\s+fato|supost[oa]\s+autor(?:a)?(?:\s+do\s+fato)?|infrator(?:a)?|noticiad[oa]|indiciad[oa]|investigad[oa]|acusad[oa]|denunciad[oa]|querelad[oa]|envolvido(?:\s*\(autor\s+do\s+fato\))?)(?:\s*\([^\)]+\))?\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,140}?)(?=\s*(?:\n|v[ií]tima|ofendid|noticiante|comunicante|promovente|cpf|cnpj|advogad|autos|$))/i,

      // Padrão 5: "Réu / Ré: Nome"
      /(?:réu|ré)\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,140}?)(?=\s*(?:\n|autor|promovente|requerente|v[ií]tima|cpf|cnpj|advogad|$))/i,

      // Padrão 6: Dispositivo anterior: "condenar o réu NOME a pagar..."
      /(?:condenar\s+(?:o|a)?\s+(?:requerid[oa]|promovid[oa]|demandad[oa]|executad[oa]|réu|ré)?\s*)([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,140}?)(?:\s+(?:a|ao|para|em)\s+pagar|\s*,\s*a\s+pagar|[,\.\n])/i
    ];

    for (const pat of defendantPatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        let candidate = cleanCandidateParty(match[1]);
        if (!isInvalidPartyName(candidate)) {
          defendant = candidate;
          break;
        }
      }
    }
  }

  // 4. Comarca e Vara: Fallback se não localizado na Capa
  if (!judicialUnit) {
    const unitPatterns = [
      /(?:Vara\s+[A-Za-zÁ-Úá-ú\s]{3,40}?\s+da\s+Comarca\s+de\s+[A-ZÁ-Ú][A-Za-zÁ-Úá-ú\s]{3,30})/i,
      /(?:Juizado\s+Especial\s+[A-Za-zÁ-Úá-ú\s]{3,40}?\s+da\s+Comarca\s+de\s+[A-ZÁ-Ú][A-Za-zÁ-Úá-ú\s]{3,30})/i,
      /(?:Comarca\s+de\s+[A-ZÁ-Ú][A-Za-zÁ-Úá-ú\s]{3,30}\s*[-–]\s*(?:GO|Goiás|TJGO))/i,
      /(?:Poder\s+Judiciário\s+do\s+Estado\s+de\s+Goiás[^\n]*)/i
    ];
    for (const pat of unitPatterns) {
      const match = text.match(pat);
      if (match && match[0]) {
        judicialUnit = match[0].replace(/[\*\_]/g, "").trim();
        break;
      }
    }
  }

  // 5. DETECÇÃO CRONOLÓGICA DA MARCHA E QUESTÕES PROCESSUAIS PENDENTES
  const lowerText = text.toLowerCase();

  // A) Verificar se já existe SENTENÇA proferida especificamente nos autos deste processo
  const hasSentencaProferida = (
    /(?:^|\n|\b)(?:mov(?:imentação)?|evento)\s*[\d\.\s-]*[-–:]?\s*(?:sentença|sentenca)/i.test(lowerText) ||
    /(?:sentença\s+proferida\s+n[oa]\s+mov|certidão\s+de\s+publicação\s+da\s+sentença)/i.test(lowerText)
  );

  // B) Verificar se há petição formal de EMBARGOS DE DECLARAÇÃO pendente
  let embargosMovimentacao = "";
  const mMovEmbargos = lowerText.match(/(?:mov(?:imentação)?|evento)\s*(\d+)[\s\S]{1,60}?(?:petição\s*[-–:]?\s*embargos\s+de\s+declaração|petição\s+de\s+embargos\s+declaratórios)/i) ||
                       lowerText.match(/(?:petição\s*[-–:]?\s*embargos\s+de\s+declaração)[\s\S]{1,60}?(?:no\s+mov(?:imentação)?|no\s+evento)\s*(\d+)/i);
  if (mMovEmbargos && mMovEmbargos[1]) {
    embargosMovimentacao = `mov. ${mMovEmbargos[1]}`;
  }

  const hasEmbargosDeclaracao = Boolean(embargosMovimentacao) && /(?:petição\s*[-–:]?\s*embargos\s+de\s+declaração|opostos\s+embargos\s+de\s+declaração\s+em\s+face\s+da\s+sentença)/i.test(lowerText);

  // C) Verificar se há Cumprimento de Sentença
  const hasCumprimentoSentenca = (
    lowerText.includes("cumprimento de sentença") ||
    lowerText.includes("impugnação ao cumprimento") ||
    lowerText.includes("bloqueio sisbajud") ||
    lowerText.includes("bloqueio renajud")
  );

  // D) Verificar se está em Fase Saneadora (art. 357 CPC)
  const hasSaneamentoPendente = (
    lowerText.includes("especificação de provas") ||
    lowerText.includes("saneamento e organização") ||
    lowerText.includes("pontos controvertidos")
  );

  // E) Verificar se há Pedido Liminar / Tutela de Urgência pendente de apreciação inicial
  const hasUrgentRequest = (
    lowerText.includes("tutela de urgência") ||
    lowerText.includes("tutela provisória") ||
    lowerText.includes("medida liminar") ||
    lowerText.includes("inaudita altera parte")
  );

  const hasContestacao = (
    /(?:^|\n|\b)(?:peça\s+de\s+|da\s+)?contestação(?:\s+apresentada|\s+d[eao]\s+ré|\s+d[eao]\s+requerid|\s*[-–:]|\s+ao\s+pedido|\s+à\s+ação)/i.test(lowerText) ||
    /(?:mov(?:imentação)?|evento)\s*[\d\.\s-]*[-–:]?\s*(?:contestação|defesa\s+apresentada)/i.test(lowerText)
  );

  // Ordem de análise das coisas pendentes no PDF: Despacho / Decisão / Sentença
  let suggestedActType: "embargos" | "decisao" | "despacho" | "sentenca" = "sentenca";
  let pendingMatterDescription = "";

  if (!hasContestacao) {
    // Fase inicial (sem defesa nos autos)
    if (hasUrgentRequest) {
      suggestedActType = "decisao";
      pendingMatterDescription = "Fase postulatória inicial. Questão pendente: Apreciação de Pedido Liminar / Tutela Provisória de Urgência (art. 300 do CPC) e Gratuidade da Justiça.";
    } else {
      suggestedActType = "despacho";
      pendingMatterDescription = "Fase postulatória inicial. Questão pendente: Despacho de Recebimento, Citação do Réu e Designação de Audiência de Conciliação (art. 334 do CPC).";
    }
  } else if (hasSaneamentoPendente && !hasSentencaProferida) {
    suggestedActType = "decisao";
    pendingMatterDescription = "Processo na fase de saneamento. Questão pendente: Decisão de Saneamento e Organização (art. 357 do CPC).";
  } else if (hasSentencaProferida && hasCumprimentoSentenca) {
    suggestedActType = "decisao";
    pendingMatterDescription = "Processo na fase executiva (Cumprimento de Sentença). Questão pendente: Decisão interlocutória de atos executivos.";
  } else if (hasSentencaProferida && hasEmbargosDeclaracao && embargosMovimentacao) {
    // Apenas se houver petição formal recente de embargos identificada com movimentação
    suggestedActType = "embargos";
    pendingMatterDescription = `Sentença proferida nos autos. Questão pendente: Julgamento dos Embargos de Declaração (${embargosMovimentacao}) contra a sentença (art. 1.022 do CPC).`;
  } else {
    suggestedActType = "sentenca";
    pendingMatterDescription = "Processo instruído e maduro para julgamento. Questão pendente: Sentença Judicial de Mérito (art. 487 do CPC).";
  }

  return {
    processNumber,
    author,
    defendant,
    judicialUnit,
    hasSentencaProferida,
    hasEmbargosDeclaracao,
    embargosMovimentacao,
    pendingMatterDescription,
    suggestedActType,
  };
}
