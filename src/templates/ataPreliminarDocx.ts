// Exporta os mesmos blocos da ata preliminar para Word (.docx), no layout do Termo de Audiência: brasão e cabeçalho repetidos em todas as páginas,
// rodapé com número da página e nome do juiz. A biblioteca só é carregada quando o usuário clica em "Word".
import type { Bloco } from "./ataPreliminarModelo";
import { BRASAO_GOIAS_BASE64 } from "./brasaoGoias";

const base64ParaBytes = (b64: string) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

export async function blocosParaDocx(bl: Bloco[], opts: { juiz?: string } = {}): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, Header, Footer, ImageRun, PageNumber, TabStopType, BorderStyle } = await import("docx");
  const FONTE = "Candara";
  const run = (text: string, o: any = {}) => new TextRun({ text, font: FONTE, size: 23, ...o });
  // trechos entre [colchetes] (campos a completar) ficam destacados em amarelo
  const runsCampos = (texto: string, o: any = {}) => texto.split(/(\[[^\]]{1,300}\])/).filter(Boolean).map((t) => (/^\[[^\]]+\]$/.test(t) ? run(t, { ...o, highlight: "yellow" }) : run(t, o)));
  const corpo: any[] = [];
  let cabecalho: string[] = [];
  for (const x of bl) {
    if (x.tipo === "cabecalho") { cabecalho = x.linhas; continue; }
    if (x.tipo === "titulo") corpo.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 520, after: 360 }, children: [run(x.texto, { bold: true, size: 34 })] }));
    else if (x.tipo === "meta") corpo.push(new Paragraph({ spacing: { after: 20 }, children: [run(x.rotulo + " "), ...runsCampos(x.valor, { bold: true })] }));
    else if (x.tipo === "secao") corpo.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 400, after: 160 }, children: [run(x.texto, { bold: true, size: 24 })] }));
    else if (x.tipo === "paragrafo") corpo.push(new Paragraph({
      alignment: x.destaque === "corpo" ? AlignmentType.JUSTIFIED : AlignmentType.LEFT, spacing: { after: 80 }, indent: x.destaque === "corpo" ? { firstLine: 560 } : undefined,
      shading: x.destaque === "conferir" ? { type: ShadingType.CLEAR, fill: "FDECEA" } : x.destaque === "aviso" ? { type: ShadingType.CLEAR, fill: "F2F2F2" } : undefined,
      children: x.destaque === "corpo" ? runsCampos(x.texto) : [run(x.texto, { size: x.destaque === "aviso" ? 18 : 23, italics: x.destaque === "vazio", bold: x.destaque === "conferir" })],
    }));
    else if (x.tipo === "lista") x.itens.forEach((i) => corpo.push(new Paragraph({ bullet: { level: 0 }, shading: i.conferir ? { type: ShadingType.CLEAR, fill: "FFF6D6" } : undefined, children: [run(i.texto, { size: 21, bold: i.nivel === "alto" })] })));
    else if (x.tipo === "quadro") {
      corpo.push(new Paragraph({ spacing: { before: 160, after: 40 }, shading: { type: ShadingType.CLEAR, fill: "FFF1D6" }, border: { top: { style: BorderStyle.SINGLE, size: 8, color: "B45309", space: 4 }, left: { style: BorderStyle.SINGLE, size: 8, color: "B45309", space: 4 }, right: { style: BorderStyle.SINGLE, size: 8, color: "B45309", space: 4 } }, children: [run(x.titulo, { bold: true, size: 22 })] }));
      x.itens.forEach((i, k) => corpo.push(new Paragraph({ bullet: { level: 0 }, shading: { type: ShadingType.CLEAR, fill: "FFF1D6" }, border: k === x.itens.length - 1 ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: "B45309", space: 4 } } : undefined, children: [run(i.texto, { size: 21, bold: !!i.alerta })] })));
    }
    else if (x.tipo === "assinatura") x.linhas.forEach((l, i) => corpo.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: i === 0 ? 700 : 0 }, children: [run(l, { bold: i === 0 })] })));
    else {
      const cel = (t: string, cab = false, conf = false) => new TableCell({ shading: cab ? { type: ShadingType.CLEAR, fill: "ECECEC" } : conf ? { type: ShadingType.CLEAR, fill: "FFF6D6" } : undefined, children: [new Paragraph({ children: [run(t, { bold: cab, size: 19 })] })] });
      corpo.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: x.colunas.map((c) => cel(c, true)) }), ...x.linhas.map((l) => new TableRow({ cantSplit: true, children: l.celulas.map((c) => cel(c, false, !!l.conferir)) }))] }));
      corpo.push(new Paragraph({ children: [] }));
    }
  }
  const header = new Header({ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "jpg", data: base64ParaBytes(BRASAO_GOIAS_BASE64), transformation: { width: 50, height: 65 } })] }),
    ...cabecalho.map((l) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: l, font: "Courier New", bold: true, size: 19 })] })),
  ] });
  const juiz = (opts.juiz || "").replace(/^dr\.?a?\s+/i, "").trim() || "[nome do Juiz]";
  const footer = new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: 9300 }],
    border: { top: { style: "single" as any, size: 6, color: "777777", space: 4 } },
    children: [new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16 }), new TextRun({ text: `\t${juiz} — Juiz de Direito`, font: "Arial", size: 16 })],
  })] });
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1300, bottom: 1250, left: 1250, right: 1250 } } }, headers: { default: header }, footers: { default: footer }, children: corpo }] });
  return Packer.toBlob(doc);
}
