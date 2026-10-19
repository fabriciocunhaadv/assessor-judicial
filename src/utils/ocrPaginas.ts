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
  motivo?: string; // por que falhou (para mostrar ao usuário)
}

function comPrazo<T>(p: Promise<T>, ms: number, oque: string): Promise<T> {
  return new Promise<T>((ok, no) => {
    const t = setTimeout(() => no(new Error(`${oque} demorou mais de ${Math.round(ms / 1000)} s`)), ms);
    p.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); no(e); });
  });
}

/** Abre o PDF uma única vez (arquivos grandes demoram); o chamador deve fechar com pdf.destroy(). */
export async function abrirPdf(file: File): Promise<any> {
  if (file.size > (Number((globalThis as any).__PDF_LIMITE_MB) || 120) * 1024 * 1024) {      // arquivo enorme: o leitor busca só os trechos de que precisa
    const url = URL.createObjectURL(file);
    const doc: any = await comPrazo<any>((pdfjsLib as any).getDocument({ url, disableAutoFetch: true, rangeChunkSize: 1 << 20, useSystemFonts: true, disableFontFace: true, stopAtErrors: false }).promise, 180_000, "A abertura do PDF");
    const fechar = doc.destroy?.bind(doc); doc.destroy = async () => { try { await fechar?.(); } finally { URL.revokeObjectURL(url); } };
    return doc;
  }
  const buf = await comPrazo(file.arrayBuffer(), 180_000, "A leitura do arquivo PDF");
  return comPrazo((pdfjsLib as any).getDocument({ data: new Uint8Array(buf), useSystemFonts: true, disableFontFace: true, stopAtErrors: false }).promise, 180_000, "A abertura do PDF");
}

async function renderizar(pdf: any, numero: number, escala: number, qualidade: number, medida?: { branco: boolean }): Promise<string> {
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
    if (medida) {      // página em branco de verdade (quase nenhum pixel escuro): não precisa de OCR nem gasta cota
      try {
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let escuros = 0;
        for (let i = 0; i < px.length; i += 16) if (px[i] < 200 || px[i + 1] < 200 || px[i + 2] < 200) escuros++;
        medida.branco = escuros / (px.length / 16) < 0.0003;
      } catch { medida.branco = false; }
    }
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
  fonte: File | any,
  paginas: number[],
  onProgress?: (feitas: number, total: number) => void
): Promise<ResultadoOcr> {
  const resultado: ResultadoOcr = { textos: {}, emBranco: [], falhas: [] };
  const jaAberto = typeof (fonte as any)?.getPage === "function"; // documento do pdf.js já aberto: não fecha aqui
  let pdf: any;
  try { pdf = jaAberto ? fonte : await abrirPdf(fonte); }
  catch (e: any) { resultado.falhas.push(...paginas); resultado.motivo = `não foi possível abrir o PDF (${e?.message || e})`; return resultado; }
  try {
    const LOTE = 5;
    for (let i = 0; i < paginas.length; i += LOTE) {
      const grupo = paginas.slice(i, i + LOTE);
      const imagens: PaginaImagem[] = [];
      for (const n of grupo) {
        try {
          const medida = { branco: false };
          const data = await comPrazo(renderizar(pdf, n, 1.6, 0.7, medida), 60_000, `A renderização da página ${n}`);
          if (medida.branco) resultado.emBranco.push(n);
          else if (data) imagens.push({ pagina: n, data });
          else resultado.falhas.push(n);
        } catch (e) {
          console.warn("Falha ao renderizar página", n, e);
          resultado.motivo = `falha ao preparar a página ${n} (${(e as any)?.message || e})`;
          resultado.falhas.push(n);
        }
      }
      let lido = false;
      if (imagens.length > 0) {
        try {
          const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 240_000);
          let r: Response, txt: string;
          try {
            r = await fetch("/api/ocr-paginas", {
              method: "POST",
              headers: getApiHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({ images: imagens }),
              signal: ctl.signal,
            });
            txt = await r.text();
          } finally { clearTimeout(to); }
          let j: any = {};
          try { j = JSON.parse(txt.trim()); } catch { /* resposta incompleta */ }
          if (!(r.ok && Array.isArray(j.paginas))) resultado.motivo = `a IA não respondeu (${typeof j.error === "string" ? j.error.slice(0, 160) : "HTTP " + r.status})`;
          if (r.ok && Array.isArray(j.paginas)) {
            lido = true;
            try {      // o OCR por IA também consome tokens: entra no painel de uso
              const u = j.usage; if (u && (u.totalTokenCount || u.promptTokenCount)) void import("./apiUsageTracker").then((m) => m.recordApiExecution({ label: "OCR de páginas (leitura por IA)", model: j.modelUsed || undefined, promptTokens: u.promptTokenCount, outputTokens: u.candidatesTokenCount, totalTokens: u.totalTokenCount, module: "minuta" })).catch(() => {});
            } catch { /* sem registro */ }
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
          resultado.motivo = `a chamada à IA falhou (${(e as any)?.message || e})`;
        }
      }
      if (!lido) for (const im of imagens) if (!resultado.falhas.includes(im.pagina)) resultado.falhas.push(im.pagina);
      onProgress?.(Math.min(i + LOTE, paginas.length), paginas.length);
    }
  } finally {
    if (!jaAberto) { try { await pdf.destroy(); } catch { /* ignora */ } }
  }
  return resultado;
}

/** Texto das páginas lidas por OCR, no formato dos autos, para acrescentar ao texto extraído. */
export function blocoOcr(textos: Record<number, string>): string {
  const nums = Object.keys(textos).map(Number).sort((a, b) => a - b);
  if (nums.length === 0) return "";
  return "\n\n[=== PÁGINAS LIDAS POR OCR (IA visual) ===]\n" + nums.map((n) => `[Página ${n} - OCR]\n${textos[n]}`).join("\n\n");
}
