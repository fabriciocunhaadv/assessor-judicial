const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Find the accumulatedPdfText section
const target = `if(hasExtractedText){
accumulatedPdfText+=\`

[=== AUTOS DO PROCESSO: \${pFile.name||"Documento"} (\${pFile.pageCount||"várias"} páginas) ===]
\${pFile.extractedText}
\`;`;

const replacement = `if (hasExtractedText) {
  let safeText = pFile.extractedText;
  const maxChars = 300000; // ~75k tokens per file to prevent instant quota hit
  if (safeText.length > maxChars) {
    const half = Math.floor(maxChars / 2);
    safeText = safeText.substring(0, half) + 
      "\n\n... [AVISO: O SISTEMA RESUMIU O MIOLO DO ARQUIVO DEVIDO AO TAMANHO EXCESSIVO (>1000 PÁGINAS) PARA NÃO ESGOTAR SUA COTA DE API] ...\n\n" + 
      safeText.substring(safeText.length - half);
  }
  accumulatedPdfText += \`\n\n[=== AUTOS DO PROCESSO: \${pFile.name || "Documento"} (\${pFile.pageCount || "várias"} páginas) ===]\n\${safeText}\n\`;`;

serverCode = serverCode.replace(target, replacement);

const target2 = `const bufferText=extractTextFromPdfBuffer(buffer);
if(bufferText&&bufferText.trim().length>20){
accumulatedPdfText+=\`

[=== AUTOS DO PROCESSO: \${pFile.name||"Documento"} (Extraído via Buffer) ===]
\${bufferText}
\`;
}`;

const replacement2 = `const bufferText=extractTextFromPdfBuffer(buffer);
if(bufferText&&bufferText.trim().length>20){
  let safeBufferText = bufferText;
  const maxChars = 300000;
  if (safeBufferText.length > maxChars) {
    const half = Math.floor(maxChars / 2);
    safeBufferText = safeBufferText.substring(0, half) + 
      "\n\n... [AVISO: O SISTEMA RESUMIU O MIOLO DO ARQUIVO DEVIDO AO TAMANHO EXCESSIVO (>1000 PÁGINAS) PARA NÃO ESGOTAR SUA COTA DE API] ...\n\n" + 
      safeBufferText.substring(safeBufferText.length - half);
  }
  accumulatedPdfText+=\`\n\n[=== AUTOS DO PROCESSO: \${pFile.name||"Documento"} (Extraído via Buffer) ===]\n\${safeBufferText}\n\`;
}`;

serverCode = serverCode.replace(target2, replacement2);

fs.writeFileSync('server.ts', serverCode);
console.log("Truncation applied!");
