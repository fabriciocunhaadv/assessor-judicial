import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { MinuteData } from "../types";

export function getCleanPartyNames(minute: MinuteData) {
  const isInvalid = (val?: string) => {
    if (!val || typeof val !== "string") return true;
    const lower = val.trim().toLowerCase();
    const normalized = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.length < 3 || lower.length > 90) return true;
    if (
      lower.includes("parte autora") ||
      lower.includes("parte re") ||
      lower.includes("parte ré") ||
      lower.includes("partes devidamente") ||
      lower.includes("qualificad") ||
      lower === "autor" ||
      lower === "autora" ||
      lower === "réu" ||
      lower === "reu" ||
      lower === "ré" ||
      lower.includes("extrair") ||
      lower.includes("nao informado") ||
      lower.includes("não informado") ||
      lower.includes("autos do processo")
    ) {
      return true;
    }
    const proceduralNoise = [
      "designacao", "audiencia", "instrucao", "conciliacao", "julgamento",
      "despacho", "decisao", "sentenca", "certidao", "intimacao", "citacao",
      "contestacao", "impugnacao", "mandado", "peticao", "requerimento",
      "cumprimento", "execucao", "recurso", "apelacao", "agravo", "embargos",
      "movimentacao", "evento", "autos", "secretaria", "vara", "comarca",
      "procuracao", "conclusao", "arquivamento"
    ];
    if (proceduralNoise.some(term => normalized.includes(term))) {
      return true;
    }
    if (/^(a|o|as|os|da|do|das|dos|de|em|para|por)\s+(designa|solicita|requer|pede|realiza|marca|abre|julga|converte)/i.test(lower)) {
      return true;
    }
    return false;
  };

  const rel = [minute?.relatorio, minute?.dispositivo, minute?.fullFormattedText, minute?.fundamentacao].filter(Boolean).join("\n");

  let author = minute?.parties?.author?.trim() || "";
  if (isInvalid(author)) {
    const mAuth = rel.match(/(?:instaurad[oa]|propost[oa]|ajuizad[oa]|promovid[oa]|movid[oa])\s+por\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s+em\s+face|\s+contra|\s+desfavor)/i)
      || rel.match(/(?:polo\s+ativo|promovente|requerente|autor(?:a)?|exequente)[\s:]+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s+em\s+face|\s+contra)/i);
    if (mAuth && mAuth[1] && !isInvalid(mAuth[1].trim())) {
      author = mAuth[1].replace(/[\*\_]/g, "").trim();
    } else {
      author = "Parte Autora";
    }
  }

  let defendant = minute?.parties?.defendant?.trim() || "";
  if (isInvalid(defendant)) {
    const mDef = rel.match(/(?:em\s+face\s+d[eao]s?|contra\s+(?:o|a)?|desfavor\s+d[eao]s?)\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s*,\s*tombad|\s*,\s*todos|[,\.\n]|\s+visando|\s+pretendendo)/i)
      || rel.match(/(?:polo\s+passivo|promovid[oa]|requerid[oa]|executad[oa]|réu|ré)[\s:]+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s*,\s*qualificad)/i)
      || rel.match(/(?:condenar\s+(?:o|a)?\s+(?:requerid[oa]|promovid[oa]|demandad[oa]|executad[oa]|réu|ré)?\s*)([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s+(?:a|ao|para|em)\s+pagar|\s*,\s*a\s+pagar|[,\.\n])/i);
    if (mDef && mDef[1] && !isInvalid(mDef[1].trim())) {
      defendant = mDef[1].replace(/[\*\_]/g, "").trim();
    } else {
      defendant = "Parte Ré";
    }
  }

  return { author, defendant };
}

export async function copyMinuteToClipboard(minute: MinuteData): Promise<boolean> {
  const parties = getCleanPartyNames(minute);
  const plainText = minute.fullFormattedText || `${minute.header}\n\n${minute.title}\n\nProcesso: ${minute.processNumber}\nAutor: ${parties.author}\nRéu: ${parties.defendant}\n\nRELATÓRIO\n${minute.relatorio}\n\nFUNDAMENTAÇÃO\n${minute.fundamentacao}\n\nDISPOSITIVO\n${minute.dispositivo}\n\n${minute.closing || ""}`;

  const parseMarkdown = (text: string) => {
    if (!text) return "";
    let parsed = text;
    // Bold
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Newlines to BR
    parsed = parsed.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
    return parsed;
  };

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #111827; max-width: 800px; margin: 0 auto;">
      <p style="text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 20px;">
        PODER JUDICIÁRIO DO ESTADO DE GOIÁS<br/>
        COMARCA DE GOIÂNIA - JUIZADO ESPECIAL CÍVEL
      </p>
      
      <p style="text-align: center; font-weight: bold; font-size: 14pt; margin: 24px 0; text-transform: uppercase; letter-spacing: 1px;">
        ${minute.title}
      </p>

      <p style="margin-bottom: 16px;">
        <strong>Processo nº:</strong> ${minute.processNumber}<br/>
        <strong>Promovente (Autor):</strong> ${minute.parties?.author}<br/>
        <strong>Promovido (Réu):</strong> ${minute.parties?.defendant}
      </p>

      <p style="font-weight: bold; font-size: 12pt; margin-top: 24px; margin-bottom: 8px;">
        I - RELATÓRIO
      </p>
      <div style="text-align: justify; text-indent: 2.5cm; margin-bottom: 16px;">
        ${parseMarkdown(minute.relatorio)}
      </div>

      <p style="font-weight: bold; font-size: 12pt; margin-top: 24px; margin-bottom: 8px;">
        II - FUNDAMENTAÇÃO
      </p>
      <div style="text-align: justify; text-indent: 2.5cm; margin-bottom: 16px;">
        ${parseMarkdown(minute.fundamentacao)}
      </div>

      <p style="font-weight: bold; font-size: 12pt; margin-top: 24px; margin-bottom: 8px;">
        III - DISPOSITIVO
      </p>
      <div style="text-align: justify; text-indent: 2.5cm; margin-bottom: 24px;">
        ${parseMarkdown(minute.dispositivo)}
      </div>

      <p style="text-align: center; margin-top: 36px; font-weight: bold;">
        ${parseMarkdown(minute.closing || "Goiânia - GO, data da assinatura eletrônica.\n\nJuiz(a) de Direito")}
      </p>
    </div>
  `;

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([htmlContent], { type: "text/html" });
      const blobText = new Blob([plainText], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ]);
      return true;
    } else {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard API rich copy fallback to standard text copy:", err);
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}

function parseMarkdownToTextRuns(text: string): TextRun[] {
  // Simple parser for **bold** and *italic*
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*)/).filter(t => Boolean(t && t.trim().length > 0));
  return tokens.map(token => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return new TextRun({ text: token.slice(2, -2), bold: true, font: "Arial", size: 22 });
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return new TextRun({ text: token.slice(1, -1), italics: true, font: "Arial", size: 22 });
    }
    return new TextRun({ text: token, font: "Arial", size: 22 });
  });
}

export async function exportMinuteToDocx(minute: MinuteData): Promise<void> {
  const parties = getCleanPartyNames(minute);
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 2.5 cm
              bottom: 1440,
              left: 1700, // 3.0 cm
              right: 1134, // 2.0 cm
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "PODER JUDICIÁRIO DO ESTADO DE GOIÁS",
                bold: true,
                size: 24, // 12pt
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "TRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS - JUIZADO ESPECIAL CÍVEL",
                size: 20, // 10pt
                font: "Arial",
                color: "555555",
              }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: minute.title || "ATO JUDICIAL",
                bold: true,
                size: 28, // 14pt
                font: "Arial",
              }),
            ],
            spacing: { before: 200, after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Processo nº: ", bold: true, font: "Arial", size: 22 }),
              new TextRun({ text: minute.processNumber || "Nos autos", font: "Arial", size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Promovente: ", bold: true, font: "Arial", size: 22 }),
              new TextRun({ text: parties.author || "", font: "Arial", size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Promovido: ", bold: true, font: "Arial", size: 22 }),
              new TextRun({ text: parties.defendant || "", font: "Arial", size: 22 }),
            ],
            spacing: { after: 300 },
          }),

          // Section 1: Relatório
          new Paragraph({
            children: [
              new TextRun({
                text: "I - RELATÓRIO",
                bold: true,
                font: "Arial",
                size: 24,
              }),
            ],
            spacing: { before: 200, after: 120 },
          }),
          ...minute.relatorio.split("\n\n").map(
            (p) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 1440 }, // ~2.5cm tab
                spacing: { line: 360, after: 160 }, // 1.5 line spacing
                children: parseMarkdownToTextRuns(p.replace(/\n/g, " ")),
              })
          ),

          // Section 2: Fundamentação
          new Paragraph({
            children: [
              new TextRun({
                text: "II - FUNDAMENTAÇÃO",
                bold: true,
                font: "Arial",
                size: 24,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          ...minute.fundamentacao.split("\n\n").map(
            (p) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 1440 },
                spacing: { line: 360, after: 160 },
                children: parseMarkdownToTextRuns(p.replace(/\n/g, " ")),
              })
          ),

          // Section 3: Dispositivo
          new Paragraph({
            children: [
              new TextRun({
                text: "III - DISPOSITIVO",
                bold: true,
                font: "Arial",
                size: 24,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
          ...minute.dispositivo.split("\n\n").map(
            (p) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: 1440 },
                spacing: { line: 360, after: 160 },
                children: parseMarkdownToTextRuns(p.replace(/\n/g, " ")),
              })
          ),

          // Closing
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: minute.closing || "Goiânia - GO, data da assinatura digital.\n\nJuiz(a) de Direito",
                font: "Arial",
                size: 22,
                bold: true,
              }),
            ],
            spacing: { before: 500 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (minute.title || "Minuta_TJGO").replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanProc = (minute.processNumber || "Processo").replace(/[^a-zA-Z0-9_-]/g, "_");
  saveAs(blob, `Minuta_${cleanTitle}_${cleanProc}.docx`);
}

export function printFormattedMinute(minute: MinuteData): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const parties = getCleanPartyNames(minute);

  const content = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8"/>
      <title>${minute.title} - ${minute.processNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 2.5cm 2cm 2.5cm 3cm;
        }
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          font-weight: bold;
          margin-bottom: 25px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .title {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin: 20px 0;
          text-transform: uppercase;
        }
        .meta-box {
          margin-bottom: 20px;
          padding: 10px 0;
        }
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 24px;
          margin-bottom: 8px;
        }
        p {
          text-align: justify;
          text-indent: 2.5cm;
          margin-bottom: 12px;
          margin-top: 0;
        }
        .closing {
          text-align: center;
          margin-top: 40px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        PODER JUDICIÁRIO DO ESTADO DE GOIÁS<br/>
        TRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS<br/>
        JUIZADO ESPECIAL CÍVEL
      </div>

      <div class="title">${minute.title}</div>

      <div class="meta-box">
        <div><strong>Processo nº:</strong> ${minute.processNumber}</div>
        <div><strong>Promovente:</strong> ${parties.author}</div>
        <div><strong>Promovido:</strong> ${parties.defendant}</div>
      </div>

      <div class="section-title">I - RELATÓRIO</div>
      ${minute.relatorio.split('\n\n').map(p => `<p>${p}</p>`).join('')}

      <div class="section-title">II - FUNDAMENTAÇÃO</div>
      ${minute.fundamentacao.split('\n\n').map(p => `<p>${p}</p>`).join('')}

      <div class="section-title">III - DISPOSITIVO</div>
      ${minute.dispositivo.split('\n\n').map(p => `<p>${p}</p>`).join('')}

      <div class="closing">
        ${(minute.closing || "Goiânia - GO, data da assinatura eletrônica.<br/><br/>Juiz(a) de Direito").replace(/\n/g, '<br/>')}
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
}

/**
 * Exporta o Termo de Assentada / Ata de Audiência diretamente para Word (.docx)
 * com formatação judicial contínua e elegante.
 */
export async function exportHearingMinutesToDocx(
  processNumber: string,
  minutesText: string,
  _title: string = "Termo de Audiência"
): Promise<void> {
  if (!minutesText) return;

  const paragraphs: Paragraph[] = [];
  const rawLines = minutesText.split("\n");

  let isInBody = false;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      // Espaço entre blocos
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: "" })],
        })
      );
      continue;
    }

    const upper = trimmed.toUpperCase();

    // 1. Cabeçalho Centralizado do Tribunal
    const isMainHeader =
      upper.startsWith("PODER JUDICIÁRIO") ||
      upper.startsWith("COMARCA DE") ||
      upper.includes("AUDIÊNCIA DE INSTRUÇÃO") ||
      upper.includes("TERMO DE AUDIÊNCIA");

    if (isMainHeader && !isInBody) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: upper.includes("AUDIÊNCIA") ? 240 : 100 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              underline: upper.includes("AUDIÊNCIA") ? {} : undefined,
              size: 24, // 12pt
              font: "Times New Roman",
            }),
          ],
        })
      );
      continue;
    }

    // 2. Início do Corpo da Ata ("ABERTA A AUDIÊNCIA:")
    if (upper.startsWith("ABERTA A AUDIÊNCIA")) {
      isInBody = true;
    }

    // 3. Assinatura Final Centralizada (Juiz de Direito)
    const isSignature =
      upper.includes("JUIZ DE DIREITO") ||
      upper.includes("JUIZA DE DIREITO") ||
      (i >= rawLines.length - 3 && !trimmed.includes(":") && trimmed.length < 50 && !trimmed.startsWith("Nada mais"));

    if (isSignature) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 100 },
          children: [
            new TextRun({
              text: trimmed,
              bold: upper.includes("JUIZ"),
              size: 24,
              font: "Times New Roman",
            }),
          ],
        })
      );
      continue;
    }

    // 4. Metadados alinhados à esquerda (DATA:, PROCESSO Nº.:, JUIZ:, etc.)
    if (!isInBody && trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":");
      const label = trimmed.slice(0, colonIndex + 1);
      const value = trimmed.slice(colonIndex + 1);

      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 80, line: 300 },
          children: [
            new TextRun({
              text: label,
              bold: true,
              size: 24,
              font: "Times New Roman",
            }),
            new TextRun({
              text: value,
              bold: false,
              size: 24,
              font: "Times New Roman",
            }),
          ],
        })
      );
      continue;
    }

    // 5. Parágrafo corrido do corpo da Ata
    const runs: TextRun[] = [];
    if (trimmed.startsWith("ABERTA A AUDIÊNCIA:")) {
      runs.push(
        new TextRun({
          text: "ABERTA A AUDIÊNCIA: ",
          bold: true,
          size: 24,
          font: "Times New Roman",
        })
      );
      runs.push(
        new TextRun({
          text: trimmed.slice("ABERTA A AUDIÊNCIA:".length).trimStart(),
          size: 24,
          font: "Times New Roman",
        })
      );
    } else {
      // Parse de trechos como DESPACHO: ou SENTENÇA:
      runs.push(
        new TextRun({
          text: trimmed,
          size: 24,
          font: "Times New Roman",
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 1134 }, // 2cm de recuo inicial padrão
        spacing: { after: 140, line: 360 }, // 1.5 entrelinhas
        children: runs,
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 2.5cm
              right: 1134, // 2.0cm
              bottom: 1134, // 2.0cm
              left: 1700, // 3.0cm
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanProc = (processNumber || "Ata").replace(/[^a-zA-Z0-9_-]/g, "_");
  saveAs(blob, `Ata_Audiencia_${cleanProc}.docx`);
}

/**
 * Abre a janela limpa do navegador para impressão oficial do Termo de Audiência.
 */
export function printHearingMinutes(processNumber: string, minutesText: string): void {
  if (!minutesText) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor, permita popups para imprimir o termo de audiência.");
    return;
  }

  const rawLines = minutesText.split("\n");
  let headerHtml = "";
  let metaHtml = "";
  let bodyHtml = "";
  let sigHtml = "";
  let inBody = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    const upper = line.toUpperCase();
    if (!inBody) {
      if (upper.startsWith("PODER JUDICIÁRIO") || upper.startsWith("COMARCA DE") || upper.includes("AUDIÊNCIA DE INSTRUÇÃO")) {
        const isUnderline = upper.includes("AUDIÊNCIA DE INSTRUÇÃO");
        headerHtml += `<div class="header-line ${isUnderline ? 'underline' : ''}">${line}</div>`;
        continue;
      }
      if (upper.startsWith("ABERTA A AUDIÊNCIA")) {
        inBody = true;
      } else if (line.includes(":")) {
        const colon = line.indexOf(":");
        const label = line.slice(0, colon + 1);
        const val = line.slice(colon + 1);
        metaHtml += `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-val">${val}</span></div>`;
        continue;
      }
    }

    if (inBody) {
      const isSig = upper.includes("JUIZ DE DIREITO") || (i >= rawLines.length - 3 && !line.includes(":") && line.length < 50 && !line.startsWith("Nada mais"));
      if (isSig) {
        sigHtml += `<div class="signature-line">${line}</div>`;
      } else {
        if (line.startsWith("ABERTA A AUDIÊNCIA:")) {
          bodyHtml += `<p class="body-p"><strong>ABERTA A AUDIÊNCIA:</strong> ${line.slice("ABERTA A AUDIÊNCIA:".length).trimStart()}</p>`;
        } else {
          bodyHtml += `<p class="body-p">${line}</p>`;
        }
      }
    }
  }

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ata de Audiência - ${processNumber || "Processo"}</title>
      <meta charset="utf-8">
      <style>
        @page {
          size: A4;
          margin: 25mm 20mm 20mm 30mm;
        }
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          margin: 0;
          padding: 20px;
        }
        .header-box {
          text-align: center;
          font-weight: bold;
          font-size: 13pt;
          margin-bottom: 12px;
          line-height: 1.3;
        }
        .header-divider {
          border-bottom: 2px solid #000;
          margin-bottom: 20px;
        }
        .header-line.underline {
          text-decoration: underline;
        }
        .meta-box {
          margin-bottom: 20px;
          line-height: 1.4;
        }
        .meta-row {
          font-size: 11.5pt;
        }
        .meta-label {
          font-weight: bold;
        }
        .body-p {
          text-align: justify;
          text-indent: 2cm;
          margin-bottom: 14px;
          margin-top: 0;
          line-height: 1.6;
        }
        .signature-box {
          text-align: center;
          margin-top: 40px;
          font-size: 12pt;
          line-height: 1.4;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        ${headerHtml || "PODER JUDICIÁRIO DO ESTADO DE GOIÁS<br/>COMARCA DE MONTES CLAROS DE GOIÁS<br/><u>AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO</u>"}
      </div>
      <div class="header-divider"></div>

      ${metaHtml ? `<div class="meta-box">${metaHtml}</div>` : ""}

      <div>
        ${bodyHtml || `<p class="body-p">${minutesText}</p>`}
      </div>

      ${sigHtml ? `<div class="signature-box">${sigHtml}</div>` : ""}

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
}
