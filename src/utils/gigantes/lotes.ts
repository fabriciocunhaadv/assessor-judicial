import type { LoteGig, PaginaGig } from "./db";
import { textoParaIa } from "./triagem";

export const CPT = 3.2;                       // caracteres por token (mesma estimativa do servidor)
export const ALVO_LOTE_CHARS = 280_000;        // ~88 mil tokens: cabe na janela de 250 mil tokens/min da chave gratuita
export const LIMIAR_FINAL_CHARS = 200_000;     // ~62 mil tokens de fichas: cabe junto com as peças essenciais na minuta final
export const MAX_FUSAO_CHARS = 180_000;        // máximo de fichas por chamada de fusão

export const cabecalhoPagina = (p: PaginaGig, nomes: string[], totais: number[]) =>
  `[Arquivo ${p.arquivo + 1}: ${nomes[p.arquivo] || ""}]\n[Página ${p.pagina} de ${totais[p.arquivo] || p.pagina}]\n`;

export function textoDoLote(paginas: PaginaGig[], nomes: string[], totais: number[]): string {
  return paginas
    .map((p) => ({ p, t: textoParaIa(p) }))
    .filter((x) => x.t)
    .map((x) => cabecalhoPagina(x.p, nomes, totais) + x.t.replace(/^\[P[aá]gina[^\]]*\]\s*/i, ""))
    .join("\n\n");
}

/** Divide as páginas (já classificadas) em lotes contíguos de ~ALVO_LOTE_CHARS caracteres enviados à IA. */
export function montarLotes(paginas: PaginaGig[], nomes: string[], totais: number[]): LoteGig[] {
  const lotes: LoteGig[] = [];
  let ini = -1, chars = 0, fim = -1;
  const fechar = () => {
    if (ini < 0 || chars === 0) { ini = -1; chars = 0; return; }
    lotes.push({ i: lotes.length, de: ini, ate: fim, chars, rotulo: `págs. ${ini}-${fim} do processo` });
    ini = -1; chars = 0;
  };
  for (const p of paginas) {
    const n = textoParaIa(p).length + 80;
    if (p.tipo === "repetida") { if (ini >= 0) fim = p.n; continue; }
    if (ini >= 0 && chars + n > ALVO_LOTE_CHARS) fechar();
    if (ini < 0) ini = p.n;
    chars += n; fim = p.n;
  }
  fechar();
  return lotes;
}

const LISTAS = ["cronologia", "partes", "pedidos", "alegacoesAutor", "alegacoesReu", "provas", "decisoes", "valores", "pontosControvertidos", "lacunas"] as const;
const ROTULOS: Record<string, string> = {
  cronologia: "CRONOLOGIA", partes: "PARTES", pedidos: "PEDIDOS", alegacoesAutor: "ALEGAÇÕES DO AUTOR", alegacoesReu: "DEFESA E ALEGAÇÕES DO RÉU",
  provas: "PROVAS E DOCUMENTOS", decisoes: "DECISÕES E DESPACHOS", valores: "VALORES E CÁLCULOS", pontosControvertidos: "PONTOS CONTROVERTIDOS", lacunas: "LACUNAS DE LEITURA",
};

export function normalizarFicha(f: any): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const k of LISTAS) {
    const v = f?.[k];
    out[k] = (Array.isArray(v) ? v : v ? [v] : []).map((x: any) => (typeof x === "string" ? x : JSON.stringify(x))).filter(Boolean);
  }
  return out;
}

export function fichaParaTexto(f: any): string {
  const n = normalizarFicha(f);
  return LISTAS.filter((k) => n[k].length > 0).map((k) => `## ${ROTULOS[k]}\n${n[k].map((x) => `- ${x}`).join("\n")}`).join("\n\n");
}

export const tamanhoFicha = (f: any) => JSON.stringify(normalizarFicha(f)).length;

/** Agrupa fichas consecutivas em grupos de até `max` caracteres (cada grupo vira uma chamada de fusão). */
export function agruparFichas(tamanhos: number[], max = MAX_FUSAO_CHARS): number[][] {
  const grupos: number[][] = []; let atual: number[] = []; let soma = 0;
  tamanhos.forEach((t, i) => {
    if (atual.length >= 2 && soma + t > max) { grupos.push(atual); atual = []; soma = 0; }
    atual.push(i); soma += t;
  });
  if (atual.length) grupos.push(atual);
  return grupos;
}
