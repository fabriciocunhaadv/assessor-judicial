import type { FontesConsultadas } from "../types";

/** Junta as fontes consultadas da 1ª e da 2ª etapa (a 2ª etapa vem numa requisição separada). */
export function unirFontes(a?: FontesConsultadas | null, b?: FontesConsultadas | null): FontesConsultadas | undefined {
  if (!a && !b) return undefined;
  const un = (x?: string[], y?: string[]) => [...new Set([...(x || []), ...(y || [])])];
  return { legislacao: un(a?.legislacao, b?.legislacao), naoLocalizados: un(a?.naoLocalizados, b?.naoLocalizados), indisponiveis: un(a?.indisponiveis, b?.indisponiveis), locais: un(a?.locais, b?.locais), precedentes: un(a?.precedentes, b?.precedentes) };
}
