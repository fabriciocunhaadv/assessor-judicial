import { SavedAnalysis, ProcessDossier } from "../types";

/**
 * Normaliza o número do processo para agrupamento unificado.
 * Remove prefixos (ex: "Processo nº", "Autos nº"), pontuações e espaços.
 * Se tiver 7 ou mais dígitos (padrão CNJ ou TJ), retorna a sequência pura de dígitos.
 */
export function normalizeProcessNumber(num?: string): string {
  if (!num) return "";
  const cleaned = num.trim();
  
  // Remove prefixos comuns
  const withoutPrefix = cleaned
    .replace(/^(processo|autos|proc\.?|n[ºo°]?\s*:?\s*)/i, "")
    .trim();

  // Se contiver números suficientes para identificar o processo
  const digits = withoutPrefix.replace(/\D/g, "");
  if (digits.length >= 7) {
    return digits;
  }

  // Fallback para texto limpo e uniforme
  return withoutPrefix.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Formata um número CNJ puro de 20 dígitos se aplicável:
 * NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function formatProcessCnj(raw: string): string {
  if (!raw) return "Processo s/ nº";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 20) {
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
  }
  return raw;
}

/**
 * Agrupa uma lista de SavedAnalysis em Dossiês Processuais únicos,
 * eliminando qualquer duplicidade visual no histórico e organizando a linha do tempo cronológica.
 */
export function groupAnalysesIntoDossiers(analyses: SavedAnalysis[]): ProcessDossier[] {
  if (!analyses || analyses.length === 0) return [];

  const dossiersMap = new Map<string, SavedAnalysis[]>();

  analyses.forEach((analysis) => {
    const rawNumber =
      analysis.processNumber ||
      analysis.result?.minute?.processNumber ||
      "";

    const normKey = normalizeProcessNumber(rawNumber);
    
    // Se não houver número identificado, agrupa por ID individual
    const key =
      normKey &&
      normKey !== "semnumero" &&
      normKey !== "autosdoprocesso" &&
      normKey !== "extrairautomaticamentedosautos"
        ? normKey
        : `orphan_${analysis.id}`;

    if (!dossiersMap.has(key)) {
      dossiersMap.set(key, []);
    }
    dossiersMap.get(key)!.push(analysis);
  });

  const dossiers: ProcessDossier[] = [];

  dossiersMap.forEach((items, key) => {
    // Ordena do mais recente para o mais antigo para visualização rápida
    const sortedDesc = [...items].sort((a, b) => (b.date || 0) - (a.date || 0));
    // Ordena do mais antigo para o mais recente para a linha do tempo evolutiva
    const sortedChronological = [...items].sort((a, b) => (a.date || 0) - (b.date || 0));

    const newest = sortedDesc[0];
    const oldest = sortedChronological[0];

    // Encontra o melhor número formatado do processo
    const bestProcessNumber =
      items.find(
        (i) =>
          i.processNumber &&
          i.processNumber !== "Sem Número" &&
          i.processNumber.trim().length > 5 &&
          !i.processNumber.toLowerCase().includes("extrair")
      )?.processNumber ||
      newest.result?.minute?.processNumber ||
      newest.processNumber ||
      "Processo s/ nº";

    // Encontra as melhores partes
    const bestParties =
      items.find(
        (i) =>
          (i.result?.minute?.parties?.author && i.result.minute.parties.author !== "Parte Autora") ||
          (i.result?.minute?.parties?.defendant && i.result.minute.parties.defendant !== "Parte Ré")
      )?.result?.minute?.parties ||
      newest.result?.minute?.parties || { author: "Parte Autora", defendant: "Parte Ré" };

    // Tipos de atos proferidos
    const actTypesSet = new Set<string>();
    items.forEach((item) => {
      const actTitle = item.result?.minute?.title || item.promptTitle || "MINUTA";
      actTypesSet.add(actTitle.toUpperCase().trim());
    });

    // Encontra a melhor Unidade Judiciária / Comarca / Vara
    const bestJudicialUnit =
      items.find((i) => i.result?.minute?.judicialUnit && i.result.minute.judicialUnit.trim().length > 0)
        ?.result?.minute?.judicialUnit ||
      items.find((i) => i.result?.minute?.comarca && i.result.minute.comarca.trim().length > 0)
        ?.result?.minute?.comarca ||
      newest.result?.minute?.judicialUnit ||
      "";

    const bestComarca =
      items.find((i) => i.result?.minute?.comarca && i.result.minute.comarca.trim().length > 0)
        ?.result?.minute?.comarca ||
      newest.result?.minute?.comarca ||
      "";

    const bestVara =
      items.find((i) => i.result?.minute?.vara && i.result.minute.vara.trim().length > 0)
        ?.result?.minute?.vara ||
      newest.result?.minute?.vara ||
      "";

    const bestUnitId =
      items.find((i) => i.unitId && i.unitId.trim().length > 0)?.unitId ||
      newest.unitId ||
      "montes_claros";

    // Criadores que atuaram no processo
    const creatorsSet = new Set<string>();
    items.forEach((item) => {
      if (item.creatorName) creatorsSet.add(item.creatorName);
      else if (item.creatorEmail) creatorsSet.add(item.creatorEmail.split("@")[0]);
    });

    // Paradigmas utilizados
    const paradigmsList: { id?: string; title: string; decisionType?: string }[] = [];
    items.forEach((item) => {
      if (item.result?.paradigmUsed && item.result.paradigmUsed.title) {
        if (!paradigmsList.some((p) => p.title === item.result.paradigmUsed?.title)) {
          paradigmsList.push(item.result.paradigmUsed);
        }
      }
    });

    const hasChat = items.some((item) => item.chatMessages && item.chatMessages.length > 0);

    dossiers.push({
      id: key,
      processNumber: formatProcessCnj(bestProcessNumber),
      normalizedNumber: key.startsWith("orphan_") ? "" : key,
      parties: bestParties,
      judicialUnit: bestJudicialUnit,
      comarca: bestComarca,
      vara: bestVara,
      unitId: bestUnitId,
      totalActs: items.length,
      actTypes: Array.from(actTypesSet),
      lastDate: newest.date || Date.now(),
      firstDate: oldest.date || Date.now(),
      analyses: sortedChronological, // cronológico para a linha do tempo (Ato 1 -> Ato 2)
      creators: Array.from(creatorsSet),
      paradigmsUsed: paradigmsList,
      hasChat,
    });
  });

  // Ordena os dossiês pela data da última movimentação/minuta (mais recente no topo)
  return dossiers.sort((a, b) => b.lastDate - a.lastDate);
}

/**
 * Busca um dossiê correspondente a um número de processo informado
 */
export function findDossierForProcess(
  processNum: string,
  analyses: SavedAnalysis[]
): ProcessDossier | null {
  if (!processNum || !analyses || analyses.length === 0) return null;
  const norm = normalizeProcessNumber(processNum);
  if (!norm || norm.length < 5) return null;

  const dossiers = groupAnalysesIntoDossiers(analyses);
  return dossiers.find((d) => d.normalizedNumber && d.normalizedNumber === norm) || null;
}

/**
 * Gera um resumo estruturado dos atos prévios deste mesmo processo para alimentar
 * a inteligência artificial com memória contínua e garantir harmonia decisória.
 */
export function getProcessActsSummaryForPrompt(dossier: ProcessDossier): string {
  if (!dossier || dossier.analyses.length === 0) return "";

  const lines: string[] = [
    `=== MEMÓRIA PROCESSUAL DO GABINETE (HISTÓRICO DE ATOS PRÉVIOS DESTE MESMO PROCESSO Nº ${dossier.processNumber}) ===`,
    `Total de atos anteriores elaborados neste gabinete: ${dossier.analyses.length}`,
  ];

  dossier.analyses.forEach((act, index) => {
    const actNumber = index + 1;
    const title = act.result?.minute?.title || act.promptTitle || `Ato Judicial #${actNumber}`;
    const dateStr = new Date(act.date).toLocaleDateString("pt-BR");
    const author = act.creatorName || "Assessor";
    const paradigmInfo = act.result?.paradigmUsed ? ` (Paradigma aplicado: ${act.result.paradigmUsed.title})` : "";
    
    lines.push(`\n[ATO ${actNumber} - ${title} • Data: ${dateStr} • Elaborado por: ${author}${paradigmInfo}]`);
    
    if (act.result?.minute?.fundamentacao) {
      // Pega um excerto relevante da fundamentação prévia
      const fundPreview = act.result.minute.fundamentacao.slice(0, 500).replace(/\n+/g, " ");
      lines.push(`Resumo da Fundamentação prévia: "${fundPreview}..."`);
    }

    if (act.result?.minute?.dispositivo) {
      const dispPreview = act.result.minute.dispositivo.slice(0, 400).replace(/\n+/g, " ");
      lines.push(`Dispositivo decidido anteriormente: "${dispPreview}"`);
    }
  });

  lines.push(
    `\nDIRETRIZ DE COERÊNCIA DECISÓRIA: Mantenha rigorosa harmonia com os fatos fixados e o entendimento já delineado nos atos anteriores acima. Se o novo ato for uma sentença, confirme ou revogue expressamente a tutela outrora apreciada com fundamentação concatenada.`
  );

  return lines.join("\n");
}
