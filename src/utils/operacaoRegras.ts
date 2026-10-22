// Regras puras (sem Firebase) do Monitor de operação: área da matéria e anomalias. Ficam separadas para poderem ser testadas sozinhas.
export type ResultadoOperacao = "ok" | "erro" | "segundo_plano" | "nao_gravado";
export type GravidadeAnomalia = "alta" | "atencao";

export interface AnomaliaOperacao { codigo: string; gravidade: GravidadeAnomalia; texto: string }

const sem = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Área da matéria que um texto (nome da unidade ou do prompt) indica; "" quando não dá para saber. */
export function areaDoTexto(texto: string): string {
  const t = sem(texto);
  if (/juizado.*fazendas?\s+publicas?|fazendas?\s+publicas?.*juizado|faz\.?\s*pub/.test(t)) return "fazenda";
  if (/infracional/.test(t)) return "infancia";
  if (/inf[aâ]ncia|infancia|juventude/.test(t)) return "infancia";
  if (/familia|sucess/.test(t)) return "familia";
  if (/execucao fiscal|exec\.? fiscal/.test(t)) return "fazenda";
  if (/fazendas?\s+publicas?/.test(t)) return "fazenda";
  if (/eleitoral/.test(t)) return "eleitoral";
  const crim = /criminal|penal/.test(t), civ = /civel|civil/.test(t) || /juizado especial(?! criminal)/.test(t);
  if (crim && civ) return "";                  // unidade que cobre as duas matérias (ex.: "Cível e Criminal"): não dá para acusar nada
  if (crim) return "criminal";
  if (civ || /juizado/.test(t)) return "civel";
  return "";
}

/** Regras que apontam operações suspeitas. Funciona só com o que o Studio sabe (unidade, prompt, origem). */
export function detectarAnomalias(e: { unitName: string; promptTitle: string; promptCategory: string; promptEhPadraoDaLista: boolean; origem: string; resultado: ResultadoOperacao; erro: string; modulo: string }): AnomaliaOperacao[] {
  const out: AnomaliaOperacao[] = [];
  const areaUnidade = areaDoTexto(e.unitName), areaPrompt = areaDoTexto(e.promptTitle) || areaDoTexto(e.promptCategory === "outros" ? "" : e.promptCategory);
  if (areaUnidade && areaPrompt && areaUnidade !== areaPrompt)
    out.push({ codigo: "prompt_incompativel_unidade", gravidade: "alta", texto: `Prompt de ${areaPrompt} (“${e.promptTitle}”) usado numa unidade de ${areaUnidade} (“${e.unitName}”).` });
  if (e.origem === "esteira" && e.promptEhPadraoDaLista)
    out.push({ codigo: "esteira_prompt_padrao", gravidade: "atencao", texto: `A esteira rodou com “${e.promptTitle}”, que é o primeiro prompt da lista (o padrão do Studio): se a extensão não escolheu o prompt da serventia, a análise saiu com o prompt errado.` });
  if (e.resultado === "nao_gravado") out.push({ codigo: "nao_gravado_no_historico", gravidade: "alta", texto: "A minuta foi gerada mas NÃO foi gravada no Histórico." });
  if (e.resultado === "segundo_plano" && e.modulo === "turbo") out.push({ codigo: "turbo_foi_para_segundo_plano", gravidade: "atencao", texto: "O Turbo falhou e o processo foi para o segundo plano (análise normal)." });
  if (e.resultado === "erro") out.push({ codigo: "falha_na_operacao", gravidade: "atencao", texto: `Falha na operação: ${e.erro || "sem detalhe"}.` });
  return out;
}

