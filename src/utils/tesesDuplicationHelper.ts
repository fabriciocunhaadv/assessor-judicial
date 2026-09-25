import { JudgeParadigmModel } from "../data/defaultParadigms";

export interface CadernoMatchInfo {
  isMatched: boolean;
  matchType: "total" | "partial" | "none";
  matchedTopicHeader?: string;
  matchedSnippet?: string;
  fullMatchedBlock?: string;
  similarityRatio: number; // 0.0 a 1.0
}

export type CadernoMatchResult = CadernoMatchInfo;

export interface DuplicateCheckResult {
  hasDuplicateRisk: boolean;
  duplicateType: "exact" | "high_overlap" | "partial_overlap" | "none";
  warningMessage: string;
  matchedTopicHeader?: string;
  matchedSnippet?: string;
}

/**
 * Normaliza um texto para comparação jurídica (remove pontuações repetidas, espaços extras e caixa baixa).
 */
export function normalizeJuridicalText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\sáéíóúâêîôûãõçàü]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Divide o Caderno de Teses em blocos / tópicos lógicos baseados em divisores ou numerações de tópicos.
 */
export function splitCadernoIntoTopics(cadernoText: string): { title: string; fullContent: string; raw: string }[] {
  if (!cadernoText || !cadernoText.trim()) return [];

  // Quebra por linhas divisorias '---' ou por numeração de início de tópico ex: '1. ', '2. ', '1. [TESE'
  const lines = cadernoText.split("\n");
  const topics: { title: string; fullContent: string; raw: string }[] = [];
  let currentTitle = "Diretrizes Iniciais";
  let currentLines: string[] = [];

  const flushTopic = () => {
    if (currentLines.length > 0) {
      const full = currentLines.join("\n").trim();
      if (full.length > 10) {
        topics.push({
          title: currentTitle,
          fullContent: full,
          raw: full,
        });
      }
      currentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Identifica novos cabeçalhos de tópicos
    const isTopicHeader =
      /^(\d+)\.\s+\[?TESE\s+/i.test(trimmed) ||
      /^(\d+)\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{4,}/.test(trimmed) ||
      /^---\s*$/.test(trimmed) ||
      /^##\s+/.test(trimmed);

    if (isTopicHeader && currentLines.length > 0) {
      flushTopic();
      currentTitle = trimmed.replace(/^---\s*$/, "").replace(/^##\s*/, "") || "Tópico do Caderno";
    }

    currentLines.push(line);
  }

  flushTopic();
  return topics;
}

/**
 * Analisa o Caderno de Teses e detecta se o Modelo Paradigma já foi injetado (Integral, Parcial ou Não Injetado),
 * retornando o trecho exato localizado no Caderno de Teses.
 */
export function analyzeModelCadernoStatus(
  model: { title: string; fullText: string; summary?: string; keyHighlights?: string[] },
  cadernoText: string
): CadernoMatchInfo {
  if (!cadernoText || !cadernoText.trim() || !model) {
    return { isMatched: false, matchType: "none", similarityRatio: 0 };
  }

  const normCaderno = normalizeJuridicalText(cadernoText);
  const normTitle = normalizeJuridicalText(model.title);
  const normFullText = normalizeJuridicalText(model.fullText);

  // 1. Verifica correspondência direta do título no caderno
  const titleInCaderno = normTitle.length > 10 && normCaderno.includes(normTitle);

  // 2. Extrai sentenças-chave ou parágrafos do texto do modelo para checagem
  const paragraphs = model.fullText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  let matchedParagraphsCount = 0;
  let sampleMatchedSnippet = "";
  let matchedTopicHeader = "";

  const topics = splitCadernoIntoTopics(cadernoText);

  for (const topic of topics) {
    const normTopic = normalizeJuridicalText(topic.fullContent);

    // Se o tópico tem o título do modelo
    if (normTitle.length > 10 && normTopic.includes(normTitle)) {
      matchedTopicHeader = topic.title;
      sampleMatchedSnippet = topic.fullContent;
      break;
    }

    // Checa parágrafos coincidentes
    for (const p of paragraphs) {
      const normP = normalizeJuridicalText(p);
      if (normP.length > 50 && normTopic.includes(normP.substring(0, Math.min(120, normP.length)))) {
        matchedParagraphsCount++;
        if (!sampleMatchedSnippet) {
          sampleMatchedSnippet = topic.fullContent;
          matchedTopicHeader = topic.title;
        }
      }
    }
  }

  // 3. Verifica resumo
  let summaryMatched = false;
  if (model.summary && model.summary.trim().length > 25) {
    const normSummary = normalizeJuridicalText(model.summary);
    if (normCaderno.includes(normSummary.substring(0, Math.min(100, normSummary.length)))) {
      summaryMatched = true;
      if (!sampleMatchedSnippet) {
        sampleMatchedSnippet = model.summary;
      }
    }
  }

  // Avaliação de grau de correspondência
  const totalParagraphs = Math.max(1, paragraphs.length);
  const ratio = matchedParagraphsCount / totalParagraphs;

  // Se o texto integral está quase todo no caderno
  if (ratio >= 0.7 || (normFullText.length > 100 && normCaderno.includes(normFullText.substring(0, Math.min(300, normFullText.length))))) {
    return {
      isMatched: true,
      matchType: "total",
      matchedTopicHeader: matchedTopicHeader || `Tópico com "${model.title.slice(0, 50)}..."`,
      matchedSnippet: sampleMatchedSnippet || model.fullText.slice(0, 400),
      fullMatchedBlock: sampleMatchedSnippet,
      similarityRatio: Math.max(ratio, 0.9),
    };
  }

  // Se o título ou partes/resumo constam
  if (titleInCaderno || ratio > 0 || summaryMatched) {
    return {
      isMatched: true,
      matchType: "partial",
      matchedTopicHeader: matchedTopicHeader || `Tópico no Caderno`,
      matchedSnippet: sampleMatchedSnippet || (summaryMatched ? model.summary : `Trecho localizado correspondente a "${model.title.slice(0, 50)}..."`),
      fullMatchedBlock: sampleMatchedSnippet,
      similarityRatio: Math.max(ratio, titleInCaderno ? 0.6 : 0.4),
    };
  }

  return {
    isMatched: false,
    matchType: "none",
    similarityRatio: 0,
  };
}

/**
 * Checa em tempo real se o texto que o usuário está prestes a injetar no Caderno já existe ou possui forte sobreposição.
 */
export function checkDuplicateBeforeInjection(
  textToInject: string,
  cadernoText: string
): {
  hasDuplicateRisk: boolean;
  duplicateType: "exact" | "high_overlap" | "partial_overlap" | "none";
  warningMessage: string;
  matchedTopicHeader?: string;
  matchedSnippet?: string;
} {
  if (!textToInject || !textToInject.trim() || !cadernoText || !cadernoText.trim()) {
    return {
      hasDuplicateRisk: false,
      duplicateType: "none",
      warningMessage: "",
    };
  }

  const normInject = normalizeJuridicalText(textToInject);
  const normCaderno = normalizeJuridicalText(cadernoText);

  // 1. Verificação de correspondência exata ou quase total (>85% do texto a injetar)
  if (normInject.length > 40 && normCaderno.includes(normInject)) {
    return {
      hasDuplicateRisk: true,
      duplicateType: "exact",
      warningMessage:
        "⚠️ Este texto integral já consta cadastrado no Caderno de Teses! Você pode editar a redação abaixo para adicionar novas teses ou especificidades antes de lançar.",
      matchedSnippet: textToInject.slice(0, 300),
    };
  }

  // 2. Quebra por tópicos do Caderno para verificar sobreposição substancial
  const topics = splitCadernoIntoTopics(cadernoText);
  const injectSentences = textToInject
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);

  let overlappingSentences = 0;
  let overlappingTopicHeader = "";
  let overlappingTopicSnippet = "";

  for (const topic of topics) {
    const normTopic = normalizeJuridicalText(topic.fullContent);
    let matchedInTopic = 0;

    for (const sent of injectSentences) {
      const normSent = normalizeJuridicalText(sent);
      if (normSent.length > 30 && normTopic.includes(normSent)) {
        matchedInTopic++;
      }
    }

    if (matchedInTopic > overlappingSentences) {
      overlappingSentences = matchedInTopic;
      overlappingTopicHeader = topic.title;
      overlappingTopicSnippet = topic.fullContent;
    }
  }

  const overlapRatio = injectSentences.length > 0 ? overlappingSentences / injectSentences.length : 0;

  if (overlapRatio >= 0.6) {
    return {
      hasDuplicateRisk: true,
      duplicateType: "high_overlap",
      warningMessage: `⚠️ Alta sobreposição detectada (${Math.round(overlapRatio * 100)}% de similaridade) com o tópico "${overlappingTopicHeader.slice(0, 45)}...". Revise ou edite o texto abaixo para evitar duplicidade de orientações.`,
      matchedTopicHeader: overlappingTopicHeader,
      matchedSnippet: overlappingTopicSnippet.slice(0, 250),
    };
  }

  if (overlapRatio >= 0.3) {
    return {
      hasDuplicateRisk: true,
      duplicateType: "partial_overlap",
      warningMessage: `💡 Aviso: Foram identificados trechos semelhantes já existentes no tópico "${overlappingTopicHeader.slice(0, 45)}...". Você pode editar livremente a prévia abaixo antes de confirmar o lançamento.`,
      matchedTopicHeader: overlappingTopicHeader,
      matchedSnippet: overlappingTopicSnippet.slice(0, 250),
    };
  }

  return {
    hasDuplicateRisk: false,
    duplicateType: "none",
    warningMessage: "",
  };
}
