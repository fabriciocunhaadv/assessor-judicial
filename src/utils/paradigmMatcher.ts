import { JudgeParadigmModel } from "../data/defaultParadigms";

export interface ParadigmMatchResult {
  paradigm: JudgeParadigmModel;
  confidenceScore: number; // 0 to 100
  matchLevel: "altissima" | "alta" | "media" | "baixa" | "nula";
  isRecommended: boolean; // True ONLY if confidenceScore >= 96%
  matchedKeywords: string[];
  reason: string;
  recommendedAction: string;
}

interface KeywordRule {
  term: string;
  weight: number;
  label: string;
}

// Dicionário temático com termos jurídicos ponderados
const THEMATIC_RULES: { category: string; rules: KeywordRule[] }[] = [
  {
    category: "RMC / RCC / Cartão de Crédito Consignado",
    rules: [
      { term: "rmc", weight: 35, label: "Reserva de Margem Consignável (RMC)" },
      { term: "rcc", weight: 35, label: "Reserva de Cartão Consignado (RCC)" },
      { term: "cartao de credito consignado", weight: 30, label: "Cartão de Crédito Consignado" },
      { term: "margem consignavel", weight: 25, label: "Margem Consignável" },
      { term: "vicio de consentimento", weight: 20, label: "Vício de Consentimento" },
      { term: "saque complementar", weight: 25, label: "Saque Complementar / TED" },
      { term: "utilizacao do cartao", weight: 20, label: "Utilização do Plástico / Compras" },
      { term: "fatura", weight: 15, label: "Faturas do Cartão" },
      { term: "desconto em folha", weight: 15, label: "Desconto em Benefício/Folha" },
      { term: "rotativo", weight: 15, label: "Crédito Rotativo" },
    ],
  },
  {
    category: "Negativação Indevida / Dano Moral / SPC / SERASA",
    rules: [
      { term: "negativacao indevida", weight: 35, label: "Negativação Indevida" },
      { term: "inscricao indevida", weight: 35, label: "Inscrição Indevida em Órgãos de Proteção" },
      { term: "serasa", weight: 25, label: "Apontamento SERASA" },
      { term: "spc", weight: 25, label: "Apontamento SPC / Boa Vista" },
      { term: "dano moral in re ipsa", weight: 30, label: "Dano Moral In Re Ipsa" },
      { term: "declaracao de inexistencia de debito", weight: 25, label: "Inexistência de Débito" },
      { term: "fraude", weight: 20, label: "Alegação de Fraude / Terceiro" },
      { term: "ausencia de contratacao", weight: 25, label: "Ausência de Contratação" },
      { term: "spc/serasa", weight: 25, label: "Órgãos de Restrição" },
    ],
  },
  {
    category: "Extinção sem Mérito / Comprovante de Endereço / Pressupostos",
    rules: [
      { term: "comprovante de endereco", weight: 35, label: "Comprovante de Endereço" },
      { term: "comprovante de residencia", weight: 35, label: "Comprovante de Residência" },
      { term: "emenda a inicial", weight: 30, label: "Emenda à Petição Inicial" },
      { term: "extincao sem resolucao", weight: 30, label: "Extinção sem Resolução do Mérito" },
      { term: "art. 485", weight: 25, label: "Artigo 485 do CPC" },
      { term: "enunciado 89 do fonaje", weight: 30, label: "Enunciado 89 do FONAJE" },
      { term: "competencia territorial", weight: 25, label: "Competência Territorial / Domicílio" },
      { term: "indefiro a peticao inicial", weight: 30, label: "Indeferimento da Inicial" },
      { term: "inercia", weight: 20, label: "Inércia da Parte Autora" },
    ],
  },
  {
    category: "Tutela de Urgência / Liminar / Suspensão de Cobrança",
    rules: [
      { term: "tutela de urgencia", weight: 35, label: "Tutela de Urgência / Liminar" },
      { term: "tutela provisoria", weight: 35, label: "Tutela Provisória de Urgência" },
      { term: "suspensao dos descontos", weight: 30, label: "Suspensão de Descontos" },
      { term: "fumus boni iuris", weight: 25, label: "Fumus Boni Iuris" },
      { term: "periculum in mora", weight: 25, label: "Periculum in Mora" },
      { term: "probabilidade do direito", weight: 25, label: "Probabilidade do Direito" },
      { term: "perigo de dano", weight: 25, label: "Perigo de Dano" },
      { term: "multa diaria", weight: 20, label: "Astreintes / Multa Diária" },
      { term: "art. 300 do cpc", weight: 25, label: "Artigo 300 do CPC" },
      { term: "abstencao de negativacao", weight: 25, label: "Abstenção de Negativação" },
    ],
  },
  {
    category: "Servidor Público / Fazenda Pública / Insalubridade",
    rules: [
      { term: "adicional de insalubridade", weight: 35, label: "Adicional de Insalubridade" },
      { term: "servidor publico", weight: 25, label: "Servidor Público / Agente Comunitário" },
      { term: "municipio de", weight: 20, label: "Polo Passivo Fazendário" },
      { term: "laudo pericial", weight: 25, label: "Laudo Pericial / LTCAT" },
      { term: "lei 11.350", weight: 30, label: "Lei Federal 11.350/2006 (ACS/ACE)" },
      { term: "fazenda publica", weight: 25, label: "Fazenda Pública Municipal/Estadual" },
      { term: "piso salarial", weight: 25, label: "Piso Salarial Nacional" },
    ],
  },
  {
    category: "Direito do Consumidor / Energia Elétrica / Concessionária",
    rules: [
      { term: "equatorial", weight: 30, label: "Concessionária de Energia (Equatorial/Enel)" },
      { term: "interrupcao de energia", weight: 35, label: "Interrupção do Fornecimento de Energia" },
      { term: "queda de energia", weight: 30, label: "Queda de Energia / Oscilação" },
      { term: "queima de aparelho", weight: 30, label: "Queima de Aparelhos Elétricos" },
      { term: "saneago", weight: 30, label: "Concessionária de Saneamento" },
      { term: "corte indevido", weight: 35, label: "Corte Indevido de Serviço Essencial" },
    ],
  },
];

/** Remove diacritics and normalize string */
export function normalizeTextForSearch(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract CNJ numbers from text */
function extractCnjNumbers(text: string): string[] {
  const matches = text.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g) || [];
  return Array.from(new Set(matches));
}

/**
 * Automatically inspects process context (PDF text or pasted text) and detects matching paradigm models
 */
export function detectMatchingParadigms(
  processContextText: string,
  paradigms: JudgeParadigmModel[],
  processNumber?: string
): ParadigmMatchResult[] {
  if (!processContextText && !processNumber) return [];
  if (!paradigms || paradigms.length === 0) return [];

  const normContext = normalizeTextForSearch(processContextText);
  const contextCnjs = extractCnjNumbers(processContextText);
  if (processNumber) {
    contextCnjs.push(processNumber.trim());
  }

  const results: ParadigmMatchResult[] = [];

  for (const paradigm of paradigms) {
    let score = 0;
    const matchedKeywords: string[] = [];
    let matchReasonParts: string[] = [];

    // 1. Process Number direct match (High value: +60)
    if (paradigm.processNumber) {
      const paradigmCnjClean = paradigm.processNumber.replace(/\D/g, "");
      const isExactCnj = contextCnjs.some(
        (cnj) => cnj.replace(/\D/g, "") === paradigmCnjClean && paradigmCnjClean.length > 5
      );
      if (isExactCnj) {
        score += 65;
        matchedKeywords.push(`Processo Paradigma ${paradigm.processNumber}`);
        matchReasonParts.push("Identificação exata do número do processo de referência");
      }
    }

    const normTitle = normalizeTextForSearch(paradigm.title);
    const normSummary = normalizeTextForSearch(paradigm.summary || "");
    const normCategory = normalizeTextForSearch(paradigm.category || "");
    const normParadigmText = normalizeTextForSearch(paradigm.fullText);

    // 2. Check thematic rules
    for (const group of THEMATIC_RULES) {
      const groupCategoryNorm = normalizeTextForSearch(group.category);
      const isCategoryAligned =
        normCategory.includes(groupCategoryNorm) ||
        normTitle.includes(groupCategoryNorm) ||
        group.rules.some((r) => normTitle.includes(r.term) || normSummary.includes(r.term));

      if (isCategoryAligned) {
        let groupPoints = 0;
        for (const rule of group.rules) {
          if (normContext.includes(rule.term)) {
            // Context has this term
            groupPoints += rule.weight;
            if (!matchedKeywords.includes(rule.label)) {
              matchedKeywords.push(rule.label);
            }
          }
        }

        if (groupPoints > 0) {
          score += Math.min(50, groupPoints);
          matchReasonParts.push(`Identificada matéria de ${group.category}`);
        }
      }
    }

    // 3. Direct Word N-gram overlap between Paradigm Title/Summary and Context
    const titleWords = normTitle.split(/\s+/).filter((w) => w.length > 4);
    let titleOverlap = 0;
    for (const w of titleWords) {
      if (normContext.includes(w)) {
        titleOverlap += 8;
      }
    }
    score += Math.min(30, titleOverlap);

    // 4. Decision type matching
    if (paradigm.decisionType) {
      if (paradigm.decisionType === "improcedencia" && normContext.includes("improcedente")) {
        score += 10;
      } else if (paradigm.decisionType === "procedencia" && (normContext.includes("procedente") || normContext.includes("dano moral"))) {
        score += 10;
      } else if (paradigm.decisionType === "tutela_deferida" && (normContext.includes("tutela") || normContext.includes("liminar"))) {
        score += 15;
      } else if (paradigm.decisionType === "extincao_sem_merito" && (normContext.includes("extincao") || normContext.includes("sem resolucao"))) {
        score += 15;
      }
    }

    // Cap score between 0 and 99% (100% when exact identical)
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    const isRecommended = finalScore >= 96;

    const matchLevel: "altissima" | "alta" | "media" | "baixa" | "nula" =
      finalScore >= 96
        ? "altissima"
        : finalScore >= 70
        ? "alta"
        : finalScore >= 40
        ? "media"
        : finalScore > 0
        ? "baixa"
        : "nula";

    const uniqueReasons = Array.from(new Set(matchReasonParts));
    const reasonText =
      uniqueReasons.length > 0
        ? uniqueReasons.join(" • ")
        : finalScore === 0
        ? "Nenhum termo, matéria jurídica ou número de processo coincidente com este modelo nos autos."
        : `Afinidade temática identificada com ${paradigm.title}`;

    results.push({
      paradigm,
      confidenceScore: finalScore,
      matchLevel,
      isRecommended,
      matchedKeywords: matchedKeywords.slice(0, 5),
      reason: reasonText,
      recommendedAction: isRecommended
        ? `⚡ Vincular e Aplicar "${paradigm.title}" (Recomendado • Afinidade ${finalScore}% >= 96%)`
        : `Não vincular (Afinidade de ${finalScore}% abaixo de 96% - risco de divergência)`,
    });
  }

  // Sort by highest confidence score
  return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Returns the single top best match if it meets the minimum confidence threshold (>= 40%)
 */
export function detectBestMatchingParadigm(
  processContextText: string,
  paradigms: JudgeParadigmModel[],
  processNumber?: string
): ParadigmMatchResult | null {
  const matches = detectMatchingParadigms(processContextText, paradigms, processNumber);
  if (matches.length > 0 && matches[0].confidenceScore >= 40) {
    return matches[0];
  }
  return null;
}
