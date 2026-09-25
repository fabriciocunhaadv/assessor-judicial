import { SavedAnalysis } from "../types";

export interface CategoryDefinition {
  category: string;
  label: string;
  badgeColor: string;
  icon?: string;
}

export const AVAILABLE_PROCESS_CATEGORIES: CategoryDefinition[] = [
  {
    category: "civel",
    label: "Cível & JEC",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  },
  {
    category: "criminal",
    label: "Vara Criminal",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  },
  {
    category: "familia",
    label: "Família & Sucessões",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
  {
    category: "fazenda",
    label: "Fazenda Pública",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    category: "infancia",
    label: "Infância & Juventude",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
  },
  {
    category: "outros",
    label: "Área Geral / Outros",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
];

export function detectPromptCategory(item: SavedAnalysis): CategoryDefinition {
  // 1. Explicit saved promptCategory (Absolute Priority)
  const rawCat = (item.promptCategory || "").toLowerCase().trim();
  const explicitVara = (item.result?.minute?.vara || "").toLowerCase().trim();

  if (rawCat === "criminal" || explicitVara.includes("criminal") || explicitVara.includes("penal")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "criminal")!;
  }
  if (rawCat === "familia" || explicitVara.includes("família") || explicitVara.includes("familia") || explicitVara.includes("sucessões") || explicitVara.includes("sucessoes")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "familia")!;
  }
  if (rawCat === "fazenda" || explicitVara.includes("fazenda")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "fazenda")!;
  }
  if (rawCat === "infancia" || explicitVara.includes("infância") || explicitVara.includes("infancia") || explicitVara.includes("juventude")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "infancia")!;
  }
  if (rawCat === "civel" || explicitVara.includes("cível") || explicitVara.includes("civel") || explicitVara.includes("juizado")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "civel")!;
  }
  if (rawCat === "outros") {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "outros")!;
  }

  // 2. Search in promptTitle and minute title/content
  const textToScan = `${item.promptTitle || ""} ${item.result?.minute?.title || ""} ${item.result?.minute?.fundamentacao || ""}`.toLowerCase();

  if (textToScan.includes("criminal") || textToScan.includes("penal") || textToScan.includes("delito") || textToScan.includes("acusado") || textToScan.includes("denúncia") || textToScan.includes("flagrante") || textToScan.includes("art. 155") || textToScan.includes("art. 157") || textToScan.includes("art. 33")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "criminal")!;
  }

  if (textToScan.includes("família") || textToScan.includes("familia") || textToScan.includes("alimentos") || textToScan.includes("divórcio") || textToScan.includes("guarda") || textToScan.includes("curatela") || textToScan.includes("interdição") || textToScan.includes("inventário")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "familia")!;
  }

  if (textToScan.includes("fazenda") || textToScan.includes("faz.pub") || textToScan.includes("fazenda pública") || textToScan.includes("estado de goiás") || textToScan.includes("município") || textToScan.includes("lei 12.153")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "fazenda")!;
  }

  if (textToScan.includes("infância") || textToScan.includes("infancia") || textToScan.includes("juventude") || textToScan.includes("eca") || textToScan.includes("menor")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "infancia")!;
  }

  if (textToScan.includes("cível") || textToScan.includes("civel") || textToScan.includes("jec") || textToScan.includes("consumidor") || textToScan.includes("bancário") || textToScan.includes("juizado especial cível") || textToScan.includes("execução") || textToScan.includes("promissória")) {
    return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "civel")!;
  }

  return AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === "outros")!;
}

