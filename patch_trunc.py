import re

with open('server.ts', 'r') as f:
    content = f.read()

# Pattern for extractedText
pattern1 = r'if\(hasExtractedText\)\{accumulatedPdfText\+=\`\\n\\n\[=== AUTOS DO PROCESSO: \$\{pFile\.name\|\|"Documento"\} \(\$\{pFile\.pageCount\|\|"várias"\} páginas\) ===\]\\n\$\{pFile\.extractedText\}\\n\`\}'

replacement1 = """if(hasExtractedText){
let safeText = pFile.extractedText;
const maxChars = 300000;
if (safeText.length > maxChars) {
const half = Math.floor(maxChars / 2);
safeText = safeText.substring(0, half) + "\\n\\n... [AVISO: ARQUIVO COM MAIS DE 1000 PÁGINAS. MIOLO RESUMIDO PARA NÃO ESTOURAR A COTA DA CHAVE API] ...\\n\\n" + safeText.substring(safeText.length - half);
}
accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"várias"} páginas) ===]\\n${safeText}\\n`
}"""

# Pattern for bufferText
pattern2 = r'if\(bufferText&&bufferText\.trim\(\)\.length>20\)\{accumulatedPdfText\+=\`\\n\\n\[=== AUTOS DO PROCESSO: \$\{pFile\.name\|\|"Documento"\} \(Extraído via Buffer\) ===\]\\n\$\{bufferText\}\\n\`\}'

replacement2 = """if(bufferText&&bufferText.trim().length>20){
let safeBufferText = bufferText;
const maxChars = 300000;
if (safeBufferText.length > maxChars) {
const half = Math.floor(maxChars / 2);
safeBufferText = safeBufferText.substring(0, half) + "\\n\\n... [AVISO: ARQUIVO COM MAIS DE 1000 PÁGINAS. MIOLO RESUMIDO PARA NÃO ESTOURAR A COTA DA CHAVE API] ...\\n\\n" + safeBufferText.substring(safeBufferText.length - half);
}
accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (Extraído via Buffer) ===]\\n${safeBufferText}\\n`;
}"""

c1 = re.sub(pattern1, replacement1, content)
c2 = re.sub(pattern2, replacement2, c1)

with open('server.ts', 'w') as f:
    f.write(c2)

print("Replaced1:", c1 != content)
print("Replaced2:", c2 != c1)
