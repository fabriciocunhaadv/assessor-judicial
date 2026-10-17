import { lerPaginas } from "./db";

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface AchadoBusca { arquivo: number; pagina: number; trecho: string }

async function todasAsPaginas(jobId: string) { return lerPaginas(jobId, 1, 99_999_999); }

function trechoEm(texto: string, norm: string, palavra: string): string {
  const i = norm.indexOf(palavra);
  if (i < 0) return texto.slice(0, 140).replace(/\s+/g, " ");
  const a = Math.max(0, i - 70), b = Math.min(texto.length, i + palavra.length + 90);
  return (a > 0 ? "…" : "") + texto.slice(a, b).replace(/\s+/g, " ") + (b < texto.length ? "…" : "");
}

/** Pesquisa uma ou mais palavras (todas na mesma página, sem diferenciar acentos nem maiúsculas) no índice completo do processo. */
export async function pesquisarIndice(jobId: string, termo: string, max = 40): Promise<{ total: number; achados: AchadoBusca[] }> {
  const palavras = semAcento(termo).split(/\s+/).filter((w) => w.length >= 2);
  if (palavras.length === 0) return { total: 0, achados: [] };
  const paginas = await todasAsPaginas(jobId);
  const achados: AchadoBusca[] = []; let total = 0;
  for (const p of paginas) {
    const norm = semAcento(p.texto);
    if (palavras.every((w) => norm.includes(w))) { total++; if (achados.length < max) achados.push({ arquivo: p.arquivo, pagina: p.pagina, trecho: trechoEm(p.texto, norm, palavras[0]) }); }
  }
  return { total, achados };
}

/** Procura vários termos de uma vez (lê o índice uma só vez). */
export async function procurarTermos(jobId: string, termos: string[], maxPorTermo = 6): Promise<Record<string, { total: number; achados: AchadoBusca[] }>> {
  const paginas = await todasAsPaginas(jobId);
  const norm = paginas.map((p) => semAcento(p.texto));
  const out: Record<string, { total: number; achados: AchadoBusca[] }> = {};
  for (const t of termos) {
    const palavras = semAcento(t).split(/\s+/).filter((w) => w.length >= 2);
    const r = { total: 0, achados: [] as AchadoBusca[] };
    paginas.forEach((p, i) => { if (palavras.length && palavras.every((w) => norm[i].includes(w))) { r.total++; if (r.achados.length < maxPorTermo) r.achados.push({ arquivo: p.arquivo, pagina: p.pagina, trecho: trechoEm(p.texto, norm[i], palavras[0]) }); } });
    out[t] = r;
  }
  return out;
}
