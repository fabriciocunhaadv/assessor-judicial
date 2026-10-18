// Divide autos acima do limite da leitura em lotes em PARTES de até `limite` páginas (por posição física das páginas no processo).
export interface PdfParaDividir { nome: string; texto: string; pageCount: number; semTexto?: number[]; naoLidas?: number[] }
export interface ParteDosAutos {
  indice: number; total: number;
  de: number; ate: number;           // posições físicas (1..totalPaginas) cobertas por esta parte
  totalPaginas: number;
  fontes: { nome: string; texto: string; pageCount: number; semTexto: number[]; naoLidas: number[]; totalOriginal: number; origem: number; paginaInicial: number }[];
}

const PAGINA = /\[Página (\d+)(?: de (\d+))?\]\n?/g;

function paginasDoTexto(texto: string): { n: number; texto: string }[] {
  const marcas: { i: number; fim: number; n: number }[] = []; let m: RegExpExecArray | null;
  PAGINA.lastIndex = 0;
  while ((m = PAGINA.exec(texto))) marcas.push({ i: m.index, fim: m.index + m[0].length, n: Number(m[1]) });
  return marcas.map((mk, k) => ({ n: mk.n, texto: texto.slice(mk.fim, k + 1 < marcas.length ? marcas[k + 1].i : texto.length).trim() })).filter((p) => p.texto.length > 0);
}

export function quantasPartes(totalPaginas: number, limite: number): number { return Math.max(1, Math.ceil(totalPaginas / limite)); }

export function dividirEmPartes(pdfs: PdfParaDividir[], limite: number): ParteDosAutos[] {
  const total = pdfs.reduce((n, p) => n + (p.pageCount || 0), 0);
  const k = quantasPartes(total, limite);
  const tam = Math.ceil(total / k);
  const partes: ParteDosAutos[] = [];
  let offset = 0;
  const porPdf = pdfs.map((p) => ({ p, pags: paginasDoTexto(p.texto), ini: 0 }));
  for (const x of porPdf) { x.ini = offset; offset += x.p.pageCount || 0; }
  for (let i = 0; i < k; i++) {
    const de = i * tam + 1, ate = Math.min(total, (i + 1) * tam);
    const fontes: ParteDosAutos["fontes"] = [];
    for (const x of porPdf) {
      const a = Math.max(de, x.ini + 1), b = Math.min(ate, x.ini + (x.p.pageCount || 0));
      if (a > b) continue;                                   // este PDF não tem páginas nesta parte
      const locais = { de: a - x.ini, ate: b - x.ini };       // páginas do próprio PDF
      const dentro = x.pags.filter((pg) => pg.n >= locais.de && pg.n <= locais.ate);
      const nome = pdfs.length === 1 && k === 1 ? x.p.nome : `${x.p.nome} (págs. ${locais.de}–${locais.ate})`;
      fontes.push({
        nome,
        texto: dentro.map((pg) => `[Página ${pg.n} de ${x.p.pageCount}]\n${pg.texto}`).join("\n\n"),
        pageCount: locais.ate - locais.de + 1,
        semTexto: (x.p.semTexto || []).filter((n) => n >= locais.de && n <= locais.ate),
        naoLidas: (x.p.naoLidas || []).filter((n) => n >= locais.de && n <= locais.ate),
        totalOriginal: x.p.pageCount,
        origem: porPdf.indexOf(x),
        paginaInicial: locais.de,
      });
    }
    partes.push({ indice: i + 1, total: k, de, ate, totalPaginas: total, fontes });
  }
  return partes;
}
