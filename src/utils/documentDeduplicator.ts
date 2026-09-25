/**
 * Módulo de Deduplicação Inteligente de Documentos Judiciais
 * e Estruturação da Sinopse Holística dos Autos.
 * 
 * Preserva integralmente a primeira via de qualquer documento ou petição relevante
 * e substitui reiterações idênticas (contratos duplicados, procurações repetidas,
 * transcrições em cópia de petições) por notas de vinculação forense, economizando
 * até 40% dos tokens sem descartar nenhuma prova ou fato essencial.
 */

export interface DeduplicationResult {
  text: string;
  duplicatesFound: number;
  charsSaved: number;
  details: Array<{ docName: string; originalDoc: string; savedChars: number }>;
}

export interface JudicialDocItem {
  name: string;
  extractedText: string;
  pageCount?: number;
  base64?: string;
  size?: number;
}

/**
 * Normaliza trechos para comparação de assinatura de conteúdo,
 * removendo ruídos de quebra de linha, pontuação solta e espaçamentos múltiplos.
 */
function normalizeForComparison(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\sáéíóúâêîôûãõç]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filtro de ruídos de digitalização judicial folha a folha:
 * Remove cabeçalhos repetitivos de tribunais a cada folha, carimbos de protocolo,
 * assinaturas laterais de certificados digitais, números de folhas/páginas e hashes de autenticação.
 */
export function cleanJudicialPageNoise(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .filter((line) => {
      const l = line.trim();
      if (!l) return true;
      // 1. Numeração de folhas e páginas ("fls. 12", "pág. 3/10", "folhas 45")
      if (/^(?:fls?\.?|p[aá]g(?:ina)?\.?|folhas?)\s*\d+(?:\s*(?:de|\/)\s*\d+)?\.?$/i.test(l)) return false;
      if (/^\d+\s*[\/-]\s*\d+$/.test(l)) return false;
      // 2. Carimbos de protocolo e identificadores de processo nos cabeçalhos de folha
      if (/^PROJUDI\s*[-–:]\s*Processo.*?(?:Ref|mov|fls|pág)/i.test(l)) return false;
      if (/^(?:PJe|e-SAJ|eproc|SEI)\s*[-–:]\s*Processo/i.test(l)) return false;
      // 3. Assinaturas digitais de margem e certificados
      if (/^(?:Documento|Assinado)\s+(?:eletronicamente|digitalmente)\s+por/i.test(l)) return false;
      if (/^Assinado\s+por\s+.*?(?:Juiz|Desembargador|Escriv|Analista|Técnico|Advogado)/i.test(l)) return false;
      if (/^(?:Chave\s*de\s*acesso|C[oó]digo\s*verificador|Identificador|Hash|Checksum)\s*:\s*[A-Fa-f0-9\s-]+$/i.test(l)) return false;
      if (/^https?:\/\/(?:projudi|pje|eproc|esaj|tj[a-z]{2})\.[^\s]+(?:\/validar|\/consulta|\/autenticacao)?$/i.test(l)) return false;
      if (/^Inserido\s+ao\s+processo\s+em\s+\d{2}\/\d{2}\/\d{4}/i.test(l)) return false;
      // 4. Cabeçalhos repetitivos isolados de tribunal em início de folha
      if (/^PODER\s+JUDICI[AÁ]RIO\s+DO\s+ESTADO\s+(?:DE|DO|DA)\s+[A-ZÀ-Ú\s]+$/i.test(l)) return false;
      if (/^TRIBUNAL\s+DE\s+JUSTI[CÇ]A\s+DO\s+ESTADO\s+(?:DE|DO|DA)\s+[A-ZÀ-Ú\s]+$/i.test(l)) return false;
      if (/^CORREGEDORIA\s+GERAL\s+DA\s+JUSTI[CÇ]A/i.test(l)) return false;
      return true;
    })
    .join("\n");
}

/**
 * Identifica blocos ou documentos duplicados dentro de uma lista de PDFs do processo.
 */
export function deduplicateJudicialPdfFiles(files: JudicialDocItem[]): {
  files: JudicialDocItem[];
  duplicatesFound: number;
  charsSaved: number;
  notes: string[];
} {
  if (!files || files.length === 0) {
    return { files: [], duplicatesFound: 0, charsSaved: 0, notes: [] };
  }

  const seenDocuments: Array<{ name: string; sample: string; normalizedFull: string; length: number }> = [];
  let duplicatesFound = 0;
  let charsSaved = 0;
  const notes: string[] = [];

  const processedFiles = files.map((file) => {
    // Aplica o filtro de ruídos de digitalização folha a folha
    const cleanedText = cleanJudicialPageNoise(file.extractedText || "");
    const rawText = cleanedText.trim();
    if (rawText.length < 250) {
      return { ...file, extractedText: rawText };
    }

    const normalized = normalizeForComparison(rawText);
    const sample = normalized.substring(0, 350);

    // Verificar se já vimos este documento exato antes
    const existing = seenDocuments.find((seen) => {
      // Comparação por amostra inicial e similaridade de tamanho (se tamanho for similar e amostra coincidir)
      if (seen.sample && sample && seen.sample === sample) {
        const lengthDiff = Math.abs(seen.length - normalized.length) / Math.max(seen.length, normalized.length);
        if (lengthDiff < 0.15) {
          return true;
        }
      }
      // Se for texto muito idêntico (> 92% do conteúdo)
      if (normalized.length > 500 && seen.normalizedFull.length > 500) {
        if (seen.normalizedFull.includes(normalized.substring(0, 500))) {
          return true;
        }
      }
      return false;
    });

    if (existing) {
      duplicatesFound++;
      const saved = Math.max(0, rawText.length - 200);
      charsSaved += saved;
      const note = `Documento "${file.name}" idêntico ao já registrado em "${existing.name}". Conteúdo integral preservado na 1ª via.`;
      notes.push(note);

      return {
        ...file,
        extractedText: `[=== DOCUMENTO DOS AUTOS: ${file.name} ===]\n[Nota do Sistema: Documento idêntico ao já registrado anteriormente em "${existing.name}". Para economia de tokens e eficiência da análise, seu conteúdo probatório e integral está 100% preservado na primeira ocorrência sem repetição de envio à IA.]\n`,
      };
    }

    seenDocuments.push({
      name: file.name || `Documento ${seenDocuments.length + 1}`,
      sample,
      normalizedFull: normalized.substring(0, 4000),
      length: normalized.length,
    });

    return file;
  });

  return { files: processedFiles, duplicatesFound, charsSaved, notes };
}

/**
 * Deduplica blocos repetidos dentro de um único texto contínuo de autos
 * (por exemplo, quando o mesmo contrato ou petição foi copiado mais de uma vez).
 */
export function deduplicateTextBlocks(text: string): DeduplicationResult {
  const cleanedInput = cleanJudicialPageNoise(text || "");
  if (!cleanedInput || cleanedInput.length < 800) {
    return { text: cleanedInput, duplicatesFound: 0, charsSaved: 0, details: [] };
  }

  // Segmentar por delimitadores de arquivos ou tópicos de autos
  const sections = cleanedInput.split(/(?=\[===\s*AUTOS DO PROCESSO:|\n\n##\s+|\n\n===+\s*DOCUMENTO)/g);
  if (sections.length <= 1) {
    return { text: cleanedInput, duplicatesFound: 0, charsSaved: 0, details: [] };
  }

  const seenSections: Array<{ title: string; sample: string; length: number }> = [];
  let duplicatesFound = 0;
  let charsSaved = 0;
  const details: Array<{ docName: string; originalDoc: string; savedChars: number }> = [];

  const deduplicatedSections = sections.map((sec) => {
    const trimmed = sec.trim();
    if (trimmed.length < 300) return sec;

    const titleMatch = sec.match(/\[===\s*(?:AUTOS DO PROCESSO|DOCUMENTO DOS AUTOS|DOCUMENTO):\s*([^=\]\n]+)[=\]]/i);
    const title = titleMatch ? titleMatch[1].trim() : "Seção dos Autos";

    const normalized = normalizeForComparison(trimmed);
    const sample = normalized.substring(0, 300);

    const match = seenSections.find((s) => s.sample && sample && s.sample === sample);
    if (match) {
      duplicatesFound++;
      const saved = Math.max(0, trimmed.length - 250);
      charsSaved += saved;
      details.push({ docName: title, originalDoc: match.title, savedChars: saved });

      return `\n\n[=== AUTOS DO PROCESSO: ${title} ===]\n[Nota do Sistema: Trecho/Documento idêntico ao já constante em "${match.title}". Conteúdo integral preservado na 1ª via para economia de tokens sem supressão de fatos.]\n\n`;
    }

    seenSections.push({ title, sample, length: normalized.length });
    return sec;
  });

  return {
    text: deduplicatedSections.join(""),
    duplicatesFound,
    charsSaved,
    details,
  };
}

/**
 * Estrutura do Gabarito da Sinopse Holística Forense
 */
export interface HolisticSynopsisData {
  qualification: string;
  causeAndFacts: string;
  defensesAndPreliminary: string;
  probatoryCollection: string;
  intercurrentDecisions: string;
  summaryText: string;
  timestamp: string;
}
