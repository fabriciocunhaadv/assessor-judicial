import * as pdfjsLib from "pdfjs-dist";
import "./pdfExtractor"; // configura o worker do pdf.js
import { getApiHeaders } from "./apiKeyManager";

// o pdf.js novo usa Map.getOrInsert*/WeakMap.getOrInsert*, que navegadores um pouco mais antigos ainda não têm
for (const C of [Map, WeakMap] as any[]) {
  if (!C.prototype.getOrInsertComputed) {
    C.prototype.getOrInsertComputed = function (k: any, fn: (k: any) => any) { if (!this.has(k)) this.set(k, fn(k)); return this.get(k); };
  }
  if (!C.prototype.getOrInsert) {
    C.prototype.getOrInsert = function (k: any, v: any) { if (!this.has(k)) this.set(k, v); return this.get(k); };
  }
}

export interface PaginaImagem {
  pagina: number;
  data: string; // JPEG em base64, sem prefixo
}

export interface ResultadoOcr {
  textos: Record<number, string>;
  emBranco: number[];
  falhas: number[];
}

async function abrirPdf(file: File): Promise<any> {
  const buf = await file.arrayBuffer();
  return (pdfjsLib as any).getDocument({ data: new Uint8Array(buf), useSystemFonts: true, disableFontFace: true, stopAtErrors: false }).promise;
}

async function renderizar(pdf: any, numero: number, escala: number, qualidade: number): Promise<string> {
  const page = await pdf.getPage(numero);
  try {
    const viewport = page.getViewport({ scale: escala });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const url = canvas.toDataURL("image/jpeg", qualidade);
    canvas.width = canvas.height = 0;
    return url.split("base64,")[1] || "";
  } finally {
    try { page.cleanup(); } catch { /* ignora */ }
  }
}

/** Renderiza as páginas indicadas como JPEG (leitura visual direta pela IA). */
export async function renderizarPaginas(
  file: File,
  paginas: number[],
  onProgress?: (feitas: number, total: number) => void,
  escala = 1.3,
  qualidade = 0.65
): Promise<PaginaImagem[]> {
  const pdf = await abrirPdf(file);
  const out: PaginaImagem[] = [];
  try {
    for (let i = 0; i < paginas.length; i++) {
      try {
        const data = await renderizar(pdf, paginas[i], escala, qualidade);
        if (data) out.push({ pagina: paginas[i], data });
      } catch (e) {
        console.warn("Falha ao renderizar página", paginas[i], e);
      }
      onProgress?.(i + 1, paginas.length);
    }
  } finally {
    try { await pdf.destroy(); } catch { /* ignora */ }
  }
  return out;
}

/** OCR das páginas sem texto: renderiza e pede a transcrição à IA (lotes de 5 páginas). */
export async function ocrPaginas(
  file: File,
  paginas: number[],
  onProgress?: (feitas: number, total: number) => void
): Promise<ResultadoOcr> {
  const resultado: ResultadoOcr = { textos: {}, emBranco: [], falhas: [] };
  const pdf = await abrirPdf(file);
  try {
    const LOTE = 5;
    for (let i = 0; i < paginas.length; i += LOTE) {
      const grupo = paginas.slice(i, i + LOTE);
      const imagens: PaginaImagem[] = [];
      for (const n of grupo) {
        try {
          const data = await renderizar(pdf, n, 1.6, 0.7);
          if (data) imagens.push({ pagina: n, data });
          else resultado.falhas.push(n);
        } catch (e) {
          console.warn("Falha ao renderizar página", n, e);
          resultado.falhas.push(n);
        }
      }
      let lido = false;
      if (imagens.length > 0) {
        try {
          const r = await fetch("/api/ocr-paginas", {
            method: "POST",
            headers: getApiHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ images: imagens }),
          });
          const txt = await r.text();
          let j: any = {};
          try { j = JSON.parse(txt.trim()); } catch { /* resposta incompleta */ }
          if (r.ok && Array.isArray(j.paginas)) {
            lido = true;
            const vistas = new Set<number>();
            for (const p of j.paginas) {
              vistas.add(p.pagina);
              if (p.emBranco || !String(p.texto || "").trim()) resultado.emBranco.push(p.pagina);
              else resultado.textos[p.pagina] = String(p.texto).trim();
            }
            for (const im of imagens) if (!vistas.has(im.pagina)) resultado.falhas.push(im.pagina);
          }
        } catch (e) {
          console.warn("Falha no OCR do lote", grupo, e);
        }
      }
      if (!lido) for (const im of imagens) if (!resultado.falhas.includes(im.pagina)) resultado.falhas.push(im.pagina);
      onProgress?.(Math.min(i + LOTE, paginas.length), paginas.length);
    }
  } finally {
    try { await pdf.destroy(); } catch { /* ignora */ }
  }
  return resultado;
}

/** Texto das páginas lidas por OCR, no formato dos autos, para acrescentar ao texto extraído. */
export function blocoOcr(textos: Record<number, string>): string {
  const nums = Object.keys(textos).map(Number).sort((a, b) => a - b);
  if (nums.length === 0) return "";
  return "\n\n[=== PÁGINAS LIDAS POR OCR (IA visual) ===]\n" + nums.map((n) => `[Página ${n} - OCR]\n${textos[n]}`).join("\n\n");
}
