import type { JudicialUnit } from "../types";

const norm = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ");
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface UnidadeSugerida { candidatas: JudicialUnit[]; principal: JudicialUnit | null }

/** Procura nos autos o nome da comarca de cada unidade do usuário (palavra inteira, sem acento). `principal` só existe quando uma comarca se destaca (aparece no cabeçalho ou bem mais vezes). */
export function detectarUnidadeDosAutos(texto: string, unidades: JudicialUnit[]): UnidadeSugerida {
  const alvo = norm(String(texto || "").slice(0, 10000));
  const cabecalho = alvo.slice(0, 2500);
  if (!alvo.trim() || !unidades?.length) return { candidatas: [], principal: null };
  const porComarca = new Map<string, { unidades: JudicialUnit[]; total: number; noCabecalho: number; formal: number }>();
  for (const u of unidades) {
    if (!u?.name) continue;
    const comarca = norm(u.name.split("/")[0].trim());
    if (comarca.length < 4) continue;
    let g = porComarca.get(comarca);
    if (!g) {
      const re = new RegExp(`(?<![a-z0-9])${escapar(comarca)}(?![a-z0-9])`, "g");
      g = { unidades: [], total: (alvo.match(re) || []).length, noCabecalho: (cabecalho.match(re) || []).length,
        // citação formal da comarca ("Comarca de X", "Vara ... de X", "Juizado de X"), mais confiável que um nome citado de passagem
        formal: (alvo.match(new RegExp(`(?:comarca|foro|juizo|vara|juizado)[^.\\n]{0,40}?(?<![a-z0-9])${escapar(comarca)}(?![a-z0-9])`, "g")) || []).length };
      porComarca.set(comarca, g);
    }
    g.unidades.push(u);
  }
  const achadas = [...porComarca.values()].filter((g) => g.total > 0);
  const candidatas = achadas.flatMap((g) => g.unidades);
  if (achadas.length === 0) return { candidatas: [], principal: null };
  let escolhida = achadas.length === 1 ? achadas[0] : null;
  if (!escolhida) {
    const formais = achadas.filter((g) => g.formal > 0);
    const noCab = achadas.filter((g) => g.noCabecalho > 0);
    if (formais.length === 1) escolhida = formais[0];
    else if (noCab.length === 1) escolhida = noCab[0];
    else {
      const ordem = [...achadas].sort((a, b) => b.total - a.total);
      if (ordem[0].total >= ordem[1].total * 2) escolhida = ordem[0];
    }
  }
  return { candidatas, principal: escolhida && escolhida.unidades.length === 1 ? escolhida.unidades[0] : null };
}

/** Deve avisar? Só quando a unidade ativa não é compatível com o que os autos indicam. */
export function unidadesParaAvisar(s: UnidadeSugerida, ativaId?: string | null): JudicialUnit[] {
  if (!s.candidatas.length) return [];
  if (s.candidatas.some((u) => u.id === ativaId)) {
    // a ativa também aparece nos autos: só avisa se outra comarca se destacou claramente
    return s.principal && s.principal.id !== ativaId ? [s.principal] : [];
  }
  return s.principal ? [s.principal] : s.candidatas;
}
