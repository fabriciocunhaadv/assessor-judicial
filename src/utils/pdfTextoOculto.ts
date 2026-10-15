// TEXTO ESCONDIDO NO PDF: o texto que está em cor BRANCA (ou quase) é invisível a quem lê a página, mas a IA o lê normalmente.
// É a forma mais comum de "prompt injection" em PDF. Percorre as instruções de desenho de cada página (pdf.js) acompanhando a cor de preenchimento
// e junta o que foi escrito em branco. Texto invisível de OCR (modo de renderização 3) NÃO é tratado como escondido: é a camada normal de PDFs escaneados.
// Sem importar o pdf.js: quem chama (navegador ou servidor) passa o documento já carregado e o objeto pdfjs (OPS).

export interface TextoOculto { pagina: number; texto: string; cor: string }
export const MARCA_OCULTO = "[TEXTO ESCONDIDO EM FONTE BRANCA";

const ehBranca = (c: any): boolean => {
  const m = typeof c === "string" ? c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i) : null;
  return !!m && [m[1], m[2], m[3]].every((h) => parseInt(h, 16) >= 0xf0);
};

export async function textoOcultoDeDocumento(pdf: any, pdfjs: any, opts: { maxPaginas?: number; orcamentoMs?: number } = {}): Promise<TextoOculto[]> {
  const out: TextoOculto[] = [];
  const O = pdfjs.OPS, t0 = Date.now();
  const COR = new Set([O.setFillRGBColor, O.setFillGray, O.setFillColor, O.setFillColorN, O.setFillCMYKColor].filter((x: any) => x != null));
  const TEXTO = new Set([O.showText, O.showSpacedText, O.nextLineShowText, O.nextLineSetSpacingShowText].filter((x: any) => x != null));
  const n = Math.min(pdf.numPages || 0, opts.maxPaginas ?? 600);
  for (let p = 1; p <= n; p++) {
    if (Date.now() - t0 > (opts.orcamentoMs ?? 30000)) break;
    let ol: any;
    try { const page = await pdf.getPage(p); ol = await page.getOperatorList(); page.cleanup?.(); } catch { continue; }
    let cor = "#000000", modo = 0; const pilha: [string, number][] = []; let acumulado = "";
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], a = ol.argsArray[i];
      if (fn === O.save) pilha.push([cor, modo]);
      else if (fn === O.restore) { const s = pilha.pop(); if (s) [cor, modo] = s; }
      else if (COR.has(fn)) { if (typeof a?.[0] === "string") cor = a[0].toLowerCase(); }
      else if (fn === O.setTextRenderingMode) modo = Number(a?.[0]) || 0;
      else if (TEXTO.has(fn) && ehBranca(cor) && modo !== 3 && modo !== 7) {
        const g = Array.isArray(a?.[0]) ? a[0] : [];
        for (const x of g) if (x && typeof x === "object" && typeof x.unicode === "string") acumulado += x.unicode;
      }
    }
    const t = acumulado.replace(/\s+/g, " ").trim();
    if (t.replace(/\s/g, "").length >= 6) out.push({ pagina: p, texto: t, cor: "branca" });
  }
  return out;
}

// Texto que entra junto com o texto dos autos: a IA vê o trecho identificado como escondido e o detector o reconhece pela marca.
export const blocoTextoOculto = (lista: TextoOculto[]): string =>
  lista.map((x) => `\n${MARCA_OCULTO} — pág. ${x.pagina} do arquivo]: ${x.texto.slice(0, 600)}\n`).join("");
