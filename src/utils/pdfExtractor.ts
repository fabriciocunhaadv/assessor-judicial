import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { cleanJudicialPdfText } from "./judicialTextCleaner";
import { getApiHeaders } from "./apiKeyManager";

// Configure worker properly with exact version match for browser / sandboxed iframes
try {
  if (typeof window !== "undefined") {
    // Priority 1: Vite bundled local worker asset
    // Priority 2: jsDelivr CDN with exact 6.2.108 version match
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorker ||
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "6.2.108"}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn("Could not set pdf workerSrc", e);
  if (typeof window !== "undefined") {
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs`;
  }
}

export interface ExtractedPdfResult {
  text: string;
  pageCount: number;
  hasText: boolean;
}

interface TextItemInfo {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isRotated: boolean;
}

// Convert file to base64 helper
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = (reader.result as string) || "";
      resolve(res.includes("base64,") ? res.split("base64,")[1] : res);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// Fallback to server endpoint /api/extract-pdf-text
async function extractViaServer(file: File): Promise<ExtractedPdfResult | null> {
  try {
    const base64 = await fileToBase64(file);
    const res = await fetch("/api/extract-pdf-text", {
      method: "POST",
      headers: getApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        base64,
        fileName: file.name,
      }),
    });

    if (!res.ok) {
      console.warn("Server PDF extraction returned non-ok status:", res.status);
      return null;
    }

    let data: any = {};
    try {
      const resText = await res.text();
      data = JSON.parse(resText);
    } catch {
      console.warn("Parse error");
      return null;
    }
    if (data && data.text && typeof data.text === "string" && data.text.trim().length > 0) {
      const cleaned = cleanJudicialPdfText(data.text);
      return {
        text: cleaned,
        pageCount: data.pageCount || 1,
        hasText: cleaned.length > 20,
      };
    }
    return null;
  } catch (err) {
    console.warn("Server PDF extraction failed:", err);
    return null;
  }
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPdfResult> {
  let pdf: any = null;
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Helper with timeout to prevent hanging promises
    const loadWithTimeout = (promise: Promise<any>, ms: number = 60000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout carregando PDF.js")), ms)),
      ]);
    };

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
        disableFontFace: true, // Speeds up extraction by 5x-10x
        stopAtErrors: false,
      });
      pdf = await loadWithTimeout(loadingTask.promise, 60000);
    } catch (loadErr: any) {
      console.warn("PDF.js standard load failed or timed out, retrying fallback:", loadErr);
      try {
        const fallbackTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer.slice(0)),
          useSystemFonts: false,
          disableFontFace: true,
          stopAtErrors: false,
        });
        pdf = await loadWithTimeout(fallbackTask.promise, 45000);
      } catch (fbErr) {
        console.warn("PDF.js fallback also failed, proceeding to server extraction:", fbErr);
        pdf = null;
      }
    }

    if (!pdf) {
      // Direct server extraction fallback
      const serverResult = await extractViaServer(file);
      if (serverResult && serverResult.hasText) {
        return serverResult;
      }
      return { text: "", pageCount: 0, hasText: false };
    }

    const numPages = pdf.numPages || 1;
    const pageParagraphs: string[] = [];

    // Determine which pages to extract for massive dossier optimization:
    // Court dossiers can reach 400-1000 pages (mostly bank statements, medical images or receipts).
    // The core judicial parts are:
    // 1. Initial 70 pages (Petição inicial, emendas, procuração, primeiras decisões/liminares, citação)
    // 2. Final 70 pages (Contestação, réplica, laudos periciais, manifestações finais, saneador)
    // 3. Any intermediate page that contains legal markers (Petição, Contestação, Laudo, Decisão, etc.)
    const pagesToRead: number[] = [];
    if (numPages <= 160) {
      for (let i = 1; i <= numPages; i++) pagesToRead.push(i);
    } else {
      // Mammoth dossier (e.g. 484 pages):
      // Read first 70 pages (Initial & first events)
      for (let i = 1; i <= Math.min(70, numPages); i++) pagesToRead.push(i);
      // Sample middle pages every 2 pages to capture any intermediate motions
      const middleStart = 71;
      const middleEnd = Math.max(71, numPages - 70);
      for (let i = middleStart; i <= middleEnd; i += 2) pagesToRead.push(i);
      // Read all last 70 pages (Contestation, Reply, Saneador, Expert reports)
      const lastStart = Math.max(middleEnd + 1, numPages - 70 + 1);
      for (let i = lastStart; i <= numPages; i++) {
        if (!pagesToRead.includes(i)) pagesToRead.push(i);
      }
      pagesToRead.sort((a, b) => a - b);
    }

    for (let idx = 0; idx < pagesToRead.length; idx++) {
      const i = pagesToRead[idx];

      // Yield event loop every 5 pages to keep UI fluid and responsive
      if (idx % 5 === 0) {
        await new Promise((r) => setTimeout(r, 0));
        if (onProgress) {
          onProgress(idx + 1, pagesToRead.length);
        }
      }

      let page: any = null;
      try {
        page = await pdf.getPage(i);
        const viewport = page.getViewport ? page.getViewport({ scale: 1.0 }) : { width: 595, height: 842 };
        const textContent = await page.getTextContent();
        const styles = textContent.styles || {};

        const pageHeight = viewport.height || 842; // default A4 height points
        const pageWidth = viewport.width || 595;   // default A4 width points

        // Margins for signature, header, footer and lateral margin exclusion
        const topHeaderThreshold = pageHeight - Math.max(pageHeight * 0.10, 55); // Top 10% or 55pt
        const bottomFooterThreshold = Math.max(pageHeight * 0.08, 45);           // Bottom 8% or 45pt
        const leftLateralMargin = Math.max(pageWidth * 0.08, 38);                // Left 8% or 38pt
        const rightLateralMargin = pageWidth - Math.max(pageWidth * 0.08, 38);   // Right 8% or 38pt

        const items: TextItemInfo[] = [];

        for (const rawItem of textContent.items) {
          // @ts-ignore
          const item = rawItem as any;
          const str = (item.str || "").trim();
          if (!str) continue;

          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          const scaleX = transform[0];
          const skewY = transform[1];
          const skewX = transform[2];
          const scaleY = transform[3];
          const posX = transform[4];
          const posY = transform[5];

          // 1. In Brazilian judicial PDFs, ALL rotated text is a vertical lateral signature/watermark stamp
          const isRotated =
            Math.abs(skewY) > 0.02 ||
            Math.abs(skewX) > 0.02 ||
            (Math.abs(scaleX) < 0.1 && Math.abs(scaleY) < 0.1);

          if (isRotated) {
            continue;
          }

          // 2. Discard explicit Projudi/PJe/e-SAJ system stamps and barcodes
          const isSystemBarcodeOrCode =
            /^https?:\/\/(?:projudi|pje|eproc|esaj|tj[a-z]{2})\.[^\s]+$/i.test(str) ||
            /^Localizar\s*pelo\s*c[oó]digo\s*:\s*\d+$/i.test(str) ||
            /^(?:Chave\s*de\s*acesso|C[oó]digo\s*verificador|Identificador|Hash)\s*:\s*[A-Fa-f0-9\s-]+$/i.test(str);

          if (isSystemBarcodeOrCode) {
            continue;
          }

          const fontName = item.fontName || "";
          const fontStyle = ((styles as any)[fontName] || {}) as any;
          const fontFamily = (fontStyle.fontFamily || fontName || "").toLowerCase();

          const isBold =
            fontFamily.includes("bold") ||
            fontFamily.includes("black") ||
            fontFamily.includes("heavy") ||
            fontFamily.includes("semibold") ||
            fontFamily.includes("w7") ||
            fontFamily.includes("w8") ||
            fontFamily.includes("w9") ||
            /b(?:old)?/i.test(fontName);

          const isItalic =
            fontFamily.includes("italic") ||
            fontFamily.includes("oblique");

          const isUnderline =
            fontFamily.includes("underline") ||
            /under/i.test(fontName);

          const fontSize = Math.sqrt(scaleX * scaleX + skewY * skewY) || 10;

          items.push({
            str: item.str,
            x: posX,
            y: posY,
            width: item.width || (item.str.length * (fontSize * 0.5)),
            height: item.height || fontSize,
            fontSize,
            isBold,
            isItalic,
            isUnderline,
            isRotated,
          });
        }

        if (items.length === 0) continue;

        // Calculate average / base left margin of the page to detect indented quotes (recuo de 4cm / citações / ementas)
        const leftPositions = items
          .filter((it) => it.str.trim().length > 3)
          .map((it) => it.x)
          .sort((a, b) => a - b);
        const baseLeftMargin = leftPositions.length > 5 ? leftPositions[Math.floor(leftPositions.length * 0.15)] : 50;

        // Group items into horizontal lines (sorting by Y descending, then X ascending)
        items.sort((a, b) => {
          const yDiff = b.y - a.y;
          if (Math.abs(yDiff) > 3) {
            return yDiff;
          }
          return a.x - b.x;
        });

        const lines: { text: string; isBoldLine: boolean; isHeading: boolean }[] = [];
        let currentLineItems: TextItemInfo[] = [];
        let currentLineY = items[0].y;

        for (const item of items) {
          if (Math.abs(item.y - currentLineY) <= 3.5) {
            currentLineItems.push(item);
          } else {
            if (currentLineItems.length > 0) {
              const formatted = formatLine(currentLineItems);
              if (formatted.text && !isNoiseLine(formatted.text)) {
                lines.push(formatted);
              }
            }
            currentLineItems = [item];
            currentLineY = item.y;
          }
        }

        if (currentLineItems.length > 0) {
          const formatted = formatLine(currentLineItems);
          if (formatted.text && !isNoiseLine(formatted.text)) {
            lines.push(formatted);
          }
        }

        // Group lines of the page into structured paragraphs and headings (continuous flowing text)
        const pageTextBlocks: string[] = [];
        let currentPara = "";

        for (const lineObj of lines) {
          const lText = lineObj.text.trim();
          if (!lText) continue;

          // Headings, major topics and section separators (ex: "I - FUNDAMENTAÇÃO", "SENTENÇA", "DISPOSITIVO")
          if (lineObj.isHeading) {
            if (currentPara) {
              pageTextBlocks.push(currentPara.trim());
              currentPara = "";
            }
            pageTextBlocks.push(lText);
            continue;
          }

          // Bullet points or numbered list items
          const isListItem = /^(?:[-*•]|\d+[.)])\s+/.test(lText);
          if (isListItem) {
            if (currentPara) {
              pageTextBlocks.push(currentPara.trim());
              currentPara = "";
            }
            currentPara = lText;
            continue;
          }

          if (!currentPara) {
            currentPara = lText;
          } else {
            if (currentPara.endsWith("-")) {
              currentPara = currentPara.slice(0, -1) + lText;
            } else {
              currentPara += " " + lText;
            }
          }
        }

        if (currentPara) {
          pageTextBlocks.push(currentPara.trim());
        }

        if (pageTextBlocks.length > 0) {
          // If the last paragraph of previous page was incomplete (e.g. ended with comma or no terminal punctuation)
          // and current page starts with continuation (lowercase or continuation sentence), fuse them!
          if (pageParagraphs.length > 0 && pageTextBlocks.length > 0) {
            const lastPageText = pageParagraphs[pageParagraphs.length - 1];
            const firstParaOfCurrentPage = pageTextBlocks[0];

            const endsWithOpenClause = /[,;—–-]\s*$/i.test(lastPageText) ||
              (!/[.?!:;]\s*(?:\*\*|\*)?$/i.test(lastPageText) && !lastPageText.endsWith("\n"));
            const startsWithContinuation = /^[a-zà-ÿ0-9]/i.test(firstParaOfCurrentPage) &&
              !/^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|\d+)\s*[-–.]/i.test(firstParaOfCurrentPage) &&
              !/^(?:\*\*|\*|#)*(?:RELAT[OÓ]RIO|FUNDAMENTA[CÇ][AÃ]O|DISPOSITIVO|DECIS[AÃ]O|SENTEN[CÇ]A|DESPACHO)/i.test(firstParaOfCurrentPage);

            if (endsWithOpenClause && startsWithContinuation) {
              pageParagraphs[pageParagraphs.length - 1] = `${lastPageText} ${firstParaOfCurrentPage}`;
              pageTextBlocks.shift(); // removed fused first block
            }
          }

          if (pageTextBlocks.length > 0) {
            pageParagraphs.push(`[Página ${i} de ${numPages}]\n` + pageTextBlocks.join("\n\n"));
          }
        }
      } catch (pageErr) {
        console.warn(`Erro ao ler página ${i}:`, pageErr);
      } finally {
        if (page && typeof page.cleanup === "function") {
          try {
            page.cleanup();
          } catch {}
        }
      }
    }

    // Clean up pdf instance
    if (pdf && typeof pdf.destroy === "function") {
      try {
        await pdf.destroy();
      } catch {}
    }

    // Join all pages seamlessly without artificial page break headers
    const rawJoinedText = pageParagraphs.join("\n\n");
    const cleanedText = cleanJudicialPdfText(rawJoinedText);

    return {
      text: cleanedText,
      pageCount: numPages,
      hasText: cleanedText.length > 30,
    };
  } catch (error) {
    console.error("PDF Extraction failed:", error);
    return {
      text: "",
      pageCount: 0,
      hasText: false,
    };
  }
}

/**
 * Filter out system noise lines (digital signatures, publication notices, barcodes, page counter footers)
 * PRESERVE all movements, events, files, petitions, and substantive judicial content.
 */
function isNoiseLine(line: string): boolean {
  const clean = line.replace(/[*_#]/g, "").trim();
  if (!clean) return true;

  // IMPORTANT: DO NOT filter out "Movimentação X:", "Evento X:", "Arquivo X:" or "Processo nº"
  // They are crucial for chronological fact-evidence mapping and procedural history!
  if (/^(?:Movimenta[cç][aã]o|Mov\.?|Evento|Ev\.?|Arquivo|Peti[cç][aã]o|Certid[aã]o|Laudo|Termo|Decis[aã]o|Despacho|Senten[cç]a)\s*\d*\s*:/i.test(clean)) {
    return false;
  }

  // 1. Projudi / PJe metadata stamps that contain only timestamps or server usernames without legal content
  if (/^Usu[aá]rio\s*:\s*[A-Za-zÀ-ÿ\s]+-\s*Data\s*:\s*\d{2}\/\d{2}\/\d{4}/i.test(clean)) return true;
  if (/^Data\s*:\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/i.test(clean)) return true;

  // 2. Lateral & footer digital signature stamps
  if (/^Documento\s+Assinado\s+(?:e\s+Publicado\s+)?Digitalmente/i.test(clean)) return true;
  if (/^Assinado\s+por\s+[A-ZÁ-Ú\s._-]+$/i.test(clean)) return true;
  if (/^Localizar\s+pelo\s+c[oó]digo\s*:\s*\d+/i.test(clean)) return true;
  if (/^(?:no\s+endere[cç]o\s*:\s*)?https?:\/\/(?:projudi|pje|eproc|esaj)/i.test(clean)) return true;
  if (/^(?:Este documento [ée] c[oó]pia do original|Documento assinado digitalmente nos termos)/i.test(clean)) return true;
  if (/^Certifica[cç][aã]o\s+Digital\s+ICP-Brasil/i.test(clean)) return true;

  // 3. Isolated page numbers or hash codes
  if (/^(?:p[aá]g\.\s*\d+\/\d+|p[aá]gina\s+\d+\s+de\s+\d+|folha\s+\d+\/\d+)$/i.test(clean)) return true;
  if (/^(?:Chave\s+de\s+acesso|C[oó]digo\s+verificador|Identificador|Hash)\s*:\s*[A-Za-z0-9_-]+$/i.test(clean)) return true;

  return false;
}

/**
 * Format a single line of items, adding Markdown bold/italic/underline where needed
 */
function formatLine(
  items: TextItemInfo[]
): { text: string; isBoldLine: boolean; isHeading: boolean } {
  // Sort items left to right
  items.sort((a, b) => a.x - b.x);

  const meaningfulItems = items.filter((it) => it.str.trim().length > 0);
  if (meaningfulItems.length === 0) {
    return { text: "", isBoldLine: false, isHeading: false };
  }

  const boldItemsCount = meaningfulItems.filter((it) => it.isBold).length;
  const isBoldLine = meaningfulItems.length > 0 && boldItemsCount === meaningfulItems.length;

  let lineStr = "";
  let isCurrentlyBold = false;
  let isCurrentlyItalic = false;
  let isCurrentlyUnderline = false;
  let lastItem: TextItemInfo | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const textChunk = item.str;
    if (!textChunk) continue;

    // Check if we need to insert space before chunk
    let needsSpaceBefore = false;
    if (lastItem) {
      const gap = item.x - (lastItem.x + (lastItem.width || 0));
      const endsWithNonSpace = lineStr.length > 0 && !/\s$/.test(lineStr.replace(/[*_<>/]/g, ""));
      const startsWithNonSpace = !/^\s/.test(textChunk);

      if (gap > 1.2 || (endsWithNonSpace && startsWithNonSpace && gap > -2)) {
        // Do not insert space if chunk is right-attached punctuation
        const isAttachedPunctuation = /^[.,;:!?\)\]\/%]/.test(textChunk.trim());
        if (!isAttachedPunctuation) {
          needsSpaceBefore = true;
        }
      }
    }

    if (isBoldLine) {
      if (needsSpaceBefore && !lineStr.endsWith(" ") && !textChunk.startsWith(" ")) {
        lineStr += " ";
      }
      lineStr += textChunk;
      lastItem = item;
      continue;
    }

    // Toggle bold
    if (item.isBold && !isCurrentlyBold) {
      if (needsSpaceBefore && !lineStr.endsWith(" ")) {
        lineStr += " ";
        needsSpaceBefore = false;
      }
      lineStr += "**";
      isCurrentlyBold = true;
    } else if (!item.isBold && isCurrentlyBold) {
      lineStr += "**";
      isCurrentlyBold = false;
      if (needsSpaceBefore && !lineStr.endsWith(" ") && !textChunk.startsWith(" ")) {
        lineStr += " ";
        needsSpaceBefore = false;
      }
    }

    // Toggle italic
    if (item.isItalic && !isCurrentlyItalic) {
      if (needsSpaceBefore && !lineStr.endsWith(" ")) {
        lineStr += " ";
        needsSpaceBefore = false;
      }
      lineStr += "*";
      isCurrentlyItalic = true;
    } else if (!item.isItalic && isCurrentlyItalic) {
      lineStr += "*";
      isCurrentlyItalic = false;
      if (needsSpaceBefore && !lineStr.endsWith(" ") && !textChunk.startsWith(" ")) {
        lineStr += " ";
        needsSpaceBefore = false;
      }
    }

    // Toggle underline
    if (item.isUnderline && !isCurrentlyUnderline) {
      if (needsSpaceBefore && !lineStr.endsWith(" ")) {
        lineStr += " ";
        needsSpaceBefore = false;
      }
      lineStr += "<u>";
      isCurrentlyUnderline = true;
    } else if (!item.isUnderline && isCurrentlyUnderline) {
      lineStr += "</u>";
      isCurrentlyUnderline = false;
      if (needsSpaceBefore && !lineStr.endsWith(" ") && !textChunk.startsWith(" ")) {
        lineStr += " ";
        needsSpaceBefore = false;
      }
    }

    if (needsSpaceBefore && !lineStr.endsWith(" ") && !textChunk.startsWith(" ")) {
      lineStr += " ";
    }

    lineStr += textChunk;
    lastItem = item;
  }

  if (isCurrentlyUnderline) lineStr += "</u>";
  if (isCurrentlyItalic) lineStr += "*";
  if (isCurrentlyBold) lineStr += "**";

  // Clean glued words around markdown tags
  let normalized = lineStr
    .replace(/([A-Za-z0-9À-ÿ])\*\*([A-Za-z0-9À-ÿ])/g, "$1 **$2")
    .replace(/([A-Za-z0-9À-ÿ])\*([A-Za-z0-9À-ÿ])/g, "$1 *$2")
    .replace(/\s{2,}/g, " ");

  let trimmedLine = normalized.trim();

  // If the whole line is bold, wrap cleanly
  if (isBoldLine && trimmedLine && !trimmedLine.startsWith("**")) {
    trimmedLine = `**${trimmedLine}**`;
  }

  // Check if line is a judicial heading (Relatório, Fundamentação, Dispositivo, Tópicos I, II, 1., 2.)
  const isHeading =
    /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|\d+)\s*[-–.]\s+[A-ZÁ-Ú\s]{3,}/i.test(trimmedLine) ||
    /^(?:\*\*|\*|#)*(?:RELAT[OÓ]RIO|FUNDAMENTA[CÇ][AÃ]O|DISPOSITIVO|DECIS[AÃ]O|SENTEN[CÇ]A|DESPACHO|VISTOS,? ETC\.?|DECIDO\.?|AC[OÓ]RD[AÃ]O|EMENTA)\.?\s*(?:\*\*|\*)*$/i.test(trimmedLine);

  return {
    text: trimmedLine,
    isBoldLine,
    isHeading,
  };
}
