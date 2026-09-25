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

  if (lower.length < 3 || lower.length > 95) return true;

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
    lower.includes("autos do processo")
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
  if (proceduralNoise.some((term) => normalized.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) {
    return true;
  }

  if (/^(a|o|as|os|da|do|das|dos|de|em|para|por)\s+(designa|solicita|requer|pede|realiza|marca|abre|julga|converte|alega|aduz|mant)/i.test(lower)) {
    return true;
  }

  return false;
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

  // 1. Número do Processo (CNJ com pontuação ou dígitos)
  let processNumber = "";
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

  // 2. Extração do Autor / Promovente / Requerente / Embargante
  let author = "";
  const authorPatterns = [
    // Padrão Cabeçalho TJGO / PROJUDI: "PROMOVENTE: NOME DA PESSOA"
    /(?:promovente|requerente|polo\s+ativo|embargante|exequente|impetrante)\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?=\s*(?:\n|promovido|requerido|réu|ré|polo\s+passivo|embargado|executado|cpf|cnpj|advogad|procurad|ação|autos|juiz|$))/i,
    // "Autor(a): Nome"
    /(?:autor(?:a)?)\s*:\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?=\s*(?:\n|réu|ré|requerido|promovido|polo\s+passivo|cpf|cnpj|advogad|procurad|$))/i,
    // "ação ... proposta por NOME em face de"
    /(?:instaurad[oa]|propost[oa]|ajuizad[oa]|promovid[oa]|movid[oa])\s+por\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s+em\s+face|\s+contra|\s+desfavor)/i,
    // "NOME, devidamente qualificado(a)... ajuizou..."
    /^([A-ZÁ-Ú][A-ZÁ-Ú\s]{3,65}?)\s*,\s*(?:brasileir[oa]|estadocivil|maior|inscrit[oa]|portador[oa]|residente|domiciliad[oa]|por\s+seu\s+advogado)/im,
  ];

  for (const pat of authorPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      let candidate = match[1].replace(/[\*\_]/g, "").trim();
      candidate = candidate.replace(/^(?:o\s+|a\s+)?(?:autor(?:a)?|promovente|requerente|embargante)\s+/i, "").trim();
      if (!isInvalidPartyName(candidate)) {
        author = candidate;
        break;
      }
    }
  }

  // 3. Extração do Réu / Promovido / Requerido / Embargado
  let defendant = "";
  const defendantPatterns = [
    // Padrão Cabeçalho TJGO / PROJUDI: "PROMOVIDO: NOME DA PESSOA OU EMPRESA"
    /(?:promovid[oa]|requerid[oa]|polo\s+passivo|embargad[oa]|executad[oa]|impetrad[oa])\s*[:\-]\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?=\s*(?:\n|promovente|requerente|autor|polo\s+ativo|cpf|cnpj|advogad|procurad|ação|autos|juiz|$))/i,
    // "Réu / Ré: Nome"
    /(?:réu|ré)\s*:\s*([A-ZÁ-Ú][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?=\s*(?:\n|autor|promovente|requerente|cpf|cnpj|advogad|$))/i,
    // "em face de / contra NOME"
    /(?:em\s+face\s+d[eao]s?|contra\s+(?:o|a)?|desfavor\s+d[eao]s?)\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s*,\s*tombad|\s*,\s*todos|[,\.\n]|\s+visando|\s+pretendendo)/i,
    // Dispositivo anterior: "condenar o réu NOME a pagar..."
    /(?:condenar\s+(?:o|a)?\s+(?:requerid[oa]|promovid[oa]|demandad[oa]|executad[oa]|réu|ré)?\s*)([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s+(?:a|ao|para|em)\s+pagar|\s*,\s*a\s+pagar|[,\.\n])/i
  ];

  for (const pat of defendantPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      let candidate = match[1].replace(/[\*\_]/g, "").trim();
      candidate = candidate.replace(/^(?:a\s+)?(?:ré|réu|requerid[oa]|promovid[oa]|embargad[oa])\s+/i, "").trim();
      if (!isInvalidPartyName(candidate)) {
        defendant = candidate;
        break;
      }
    }
  }

  // 4. Comarca e Vara
  let judicialUnit = "";
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

  // 5. DETECÇÃO CRONOLÓGICA DA MARCHA E QUESTÕES PROCESSUAIS PENDENTES
  const lowerText = text.toLowerCase();

  // A) Verificar se já existe SENTENÇA proferida nos autos
  const hasSentencaProferida = (
    /(?:^|\n|\b)(?:mov(?:imentação)?|evento)\s*[\d\.\s-]*[-–:]?\s*(?:sentença|sentenca)/i.test(lowerText) ||
    /(?:julgo\s+(?:procedente|improcedente|parcialmente\s+procedente)|resolvo\s+o\s+mérito|extingo\s+o\s+processo\s+com\s+resolução|dispositivo\s+da\s+sentença)/i.test(lowerText) ||
    /(?:proferida\s+a\s+sentença|publicada\s+a\s+sentença|certidão\s+de\s+publicação\s+da\s+sentença|após\s+a\s+sentença)/i.test(lowerText) ||
    /(?:trata-se\s+de\s+embargos\s+de\s+declaração\s+opostos\s+em\s+face\s+da\s+sentença)/i.test(lowerText)
  );

  // B) Verificar se há EMBARGOS DE DECLARAÇÃO pendentes de apreciação
  let embargosMovimentacao = "";
  const mMovEmbargos = lowerText.match(/(?:mov(?:imentação)?|evento)\s*(\d+)[\s\S]{1,60}?(?:embargos\s+de\s+declaração|embargos\s+declaratórios)/i) ||
                       lowerText.match(/(?:embargos\s+de\s+declaração|embargos\s+declaratórios)[\s\S]{1,60}?(?:no\s+mov(?:imentação)?|no\s+evento)\s*(\d+)/i);
  if (mMovEmbargos && mMovEmbargos[1]) {
    embargosMovimentacao = `mov. ${mMovEmbargos[1]}`;
  }

  const hasEmbargosDeclaracao = (
    Boolean(embargosMovimentacao) ||
    /(?:embargos\s+de\s+declaração|embargos\s+declaratórios|opõe\s+embargos|opostos\s+embargos|interpostos\s+embargos)/i.test(lowerText) ||
    /(?:art(?:igo)?\.?\s*1\.?022|art(?:igo)?\.?\s*1022)[^\.\n]*?(?:omissão|contradição|obscuridade|erro\s+material)/i.test(lowerText) ||
    lowerText.includes("efeitos infringentes") ||
    lowerText.includes("acolhimento dos presentes declaratórios")
  );

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

  let suggestedActType: "embargos" | "decisao" | "despacho" | "sentenca" = "sentenca";
  let pendingMatterDescription = "";

  if (hasSentencaProferida && hasEmbargosDeclaracao) {
    suggestedActType = "embargos";
    pendingMatterDescription = `Sentença já proferida nos autos. Questão pendente: Julgamento dos Embargos de Declaração ${embargosMovimentacao ? `(${embargosMovimentacao})` : "opostos"} contra a sentença (art. 1.022 do CPC).`;
  } else if (hasSentencaProferida && hasCumprimentoSentenca) {
    suggestedActType = "decisao";
    pendingMatterDescription = "Processo na fase executiva (Cumprimento de Sentença). Questão pendente: Decisão interlocutória de atos executivos.";
  } else if (!hasContestacao && hasUrgentRequest) {
    suggestedActType = "decisao";
    pendingMatterDescription = "Fase postulatória inicial. Questão pendente: Apreciação de Pedido Liminar / Tutela Provisória de Urgência (art. 300 do CPC).";
  } else if (hasSaneamentoPendente && !hasSentencaProferida) {
    suggestedActType = "decisao";
    pendingMatterDescription = "Processo instruído com réplica e especificação de provas. Questão pendente: Decisão de Saneamento e Organização (art. 357 do CPC).";
  } else {
    suggestedActType = "sentenca";
    pendingMatterDescription = "Processo maduro para resolução de mérito. Questão pendente: Sentença Judicial de Mérito (art. 487 do CPC).";
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
