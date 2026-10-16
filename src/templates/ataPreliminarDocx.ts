// Exporta os mesmos blocos da ata preliminar para Word (.docx). A biblioteca só é carregada quando o usuário clica em "Word".
import type { Bloco } from "./ataPreliminarModelo";

export async function blocosParaDocx(bl: Bloco[]): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType } = await import("docx");
  const filhos: any[] = [];
  for (const x of bl) {
    if (x.tipo === "brasao") filhos.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: x.texto, bold: true, size: 24 })] }));
    else if (x.tipo === "titulo") filhos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 120 }, children: [new TextRun({ text: x.texto, bold: true, size: 28 })] }));
    else if (x.tipo === "subtitulo") filhos.push(new Paragraph({ spacing: { before: 280, after: 80 }, border: { bottom: { style: "single" as any, size: 6, color: "999999", space: 1 } }, children: [new TextRun({ text: x.texto, bold: true, size: 24 })] }));
    else if (x.tipo === "paragrafo") filhos.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 }, shading: x.destaque === "conferir" ? { type: ShadingType.CLEAR, fill: "FDECEA" } : x.destaque === "aviso" ? { type: ShadingType.CLEAR, fill: "F2F2F2" } : undefined, children: [new TextRun({ text: x.texto, size: x.destaque === "aviso" ? 19 : 24, italics: x.destaque === "vazio", bold: x.destaque === "conferir" })] }));
    else if (x.tipo === "lista") x.itens.forEach((i) => filhos.push(new Paragraph({ bullet: { level: 0 }, shading: i.conferir ? { type: ShadingType.CLEAR, fill: "FFF6D6" } : undefined, children: [new TextRun({ text: i.texto, size: 22, bold: i.nivel === "alto" })] })));
    else {
      const cel = (t: string, cab = false, conf = false) => new TableCell({ shading: cab ? { type: ShadingType.CLEAR, fill: "E9E9E9" } : conf ? { type: ShadingType.CLEAR, fill: "FFF6D6" } : undefined, children: [new Paragraph({ children: [new TextRun({ text: t, bold: cab, size: 20 })] })] });
      filhos.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: x.colunas.map((c) => cel(c, true)) }), ...x.linhas.map((l) => new TableRow({ cantSplit: true, children: l.celulas.map((c) => cel(c, false, !!l.conferir)) }))] }));
      filhos.push(new Paragraph({ children: [] }));
    }
  }
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: filhos }] });
  return Packer.toBlob(doc);
}
