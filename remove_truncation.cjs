const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Block 1
const block1Regex = /let safeText = pFile\.extractedText;\s*const maxChars = 4000000;\s*if \(safeText\.length > maxChars\) \{[\s\S]*?\n\}\s*accumulatedPdfText\+=`\\n\\n\[=== AUTOS DO PROCESSO: \$\{pFile\.name\|\|"Documento"\} \(\$\{pFile\.pageCount\|\|"várias"\} páginas\) ===\]\\n\$\{safeText\}\\n`/g;
const replace1 = `accumulatedPdfText+=\`\\n\\n[=== AUTOS DO PROCESSO: \${pFile.name||"Documento"} (\${pFile.pageCount||"várias"} páginas) ===]\\n\${pFile.extractedText}\\n\``;

code = code.replace(block1Regex, replace1);

// Block 2
const block2Regex = /let safeBufferText = bufferText;\s*const maxChars = 4000000;\s*if \(safeBufferText\.length > maxChars\) \{[\s\S]*?\n\}\s*accumulatedPdfText\+=`\\n\\n\[=== AUTOS DO PROCESSO: \$\{pFile\.name\|\|"Documento"\} \(Extraído via Buffer\) ===\]\\n\$\{safeBufferText\}\\n`;/g;
const replace2 = `accumulatedPdfText+=\`\\n\\n[=== AUTOS DO PROCESSO: \${pFile.name||"Documento"} (Extraído via Buffer) ===]\\n\${bufferText}\\n\`;`;

code = code.replace(block2Regex, replace2);

fs.writeFileSync('server.ts', code);
console.log("Success removing truncation");
