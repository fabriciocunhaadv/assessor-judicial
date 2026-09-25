const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Block 1
const block1Regex = /accumulatedPdfText\+=`\\n\\n\[=== AUTOS DO PROCESSO: \$\{pFile\.name\|\|"Documento"\} \(\$\{pFile\.pageCount\|\|"várias"\} páginas\) ===\]\\n\$\{pFile\.extractedText\}\\n`/g;
const replace1 = `let safeText = pFile.extractedText;
const maxChars = 800000;
if (safeText.length > maxChars) {
    const half = Math.floor(maxChars / 2);
    safeText = safeText.substring(0, half) + "\\n\\n... [AVISO DO SISTEMA: PDF GIGANTE. O MIOLO DO ARQUIVO FOI RESUMIDO PARA NÃO ESGOTAR O LIMITE (250K TOKENS) DA CHAVE GRATUITA] ...\\n\\n" + safeText.substring(safeText.length - half);
}
accumulatedPdfText+=\`\\n\\n[=== AUTOS DO PROCESSO: \${pFile.name||"Documento"} (\${pFile.pageCount||"várias"} páginas) ===]\\n\${safeText}\\n\``;

code = code.replace(block1Regex, replace1);

// Block 2
const block2Regex = /accumulatedPdfText\+=`\\n\\n\[=== AUTOS DO PROCESSO: \$\{pFile\.name\|\|"Documento"\} \(Extraído via Buffer\) ===\]\\n\$\{bufferText\}\\n\`;/g;
const replace2 = `let safeBufferText = bufferText;
const maxCharsBuf = 800000;
if (safeBufferText.length > maxCharsBuf) {
    const half = Math.floor(maxCharsBuf / 2);
    safeBufferText = safeBufferText.substring(0, half) + "\\n\\n... [AVISO DO SISTEMA: PDF GIGANTE. O MIOLO DO ARQUIVO FOI RESUMIDO PARA NÃO ESGOTAR O LIMITE (250K TOKENS) DA CHAVE GRATUITA] ...\\n\\n" + safeBufferText.substring(safeBufferText.length - half);
}
accumulatedPdfText+=\`\\n\\n[=== AUTOS DO PROCESSO: \${pFile.name||"Documento"} (Extraído via Buffer) ===]\\n\${safeBufferText}\\n\`;`;

code = code.replace(block2Regex, replace2);

fs.writeFileSync('server.ts', code);
console.log("Success applying free tier sandwich limits");
