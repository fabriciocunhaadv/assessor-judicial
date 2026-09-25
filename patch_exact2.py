import re
with open('server.ts', 'r') as f:
    text = f.read()

target1 = r'if\(hasExtractedText\)\{accumulatedPdfText\+=\`\[=== AUTOS DO PROCESSO: \$\{pFile\.name\|\|"Documento"\} \(\$\{pFile\.pageCount\|\|"várias"\} páginas\) ===\]\$\{pFile\.extractedText\}\`\}'
# The sed output was: `if(hasExtractedText){accumulatedPdfText+=`[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"várias"} páginas) ===]${pFile.extractedText}`}`
# Wait, actually sed showed literal `\n` as missing.
# Let's just find `if(hasExtractedText){accumulatedPdfText+=` and replace that block.

def replacer(match):
    return """if(hasExtractedText){
let safeText = pFile.extractedText;
const maxChars = 300000;
if (safeText.length > maxChars) {
const half = Math.floor(maxChars / 2);
safeText = safeText.substring(0, half) + "\\n\\n... [AVISO DO SISTEMA: PDF GIGANTE. O MIOLO DO ARQUIVO FOI RESUMIDO PARA NÃO ESGOTAR SUA COTA DA CHAVE API GRATUITA] ...\\n\\n" + safeText.substring(safeText.length - half);
}
accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"várias"} páginas) ===]\\n${safeText}\\n`
}"""

# regex: if\(hasExtractedText\)\{accumulatedPdfText\+=\`.*?pFile\.extractedText.*?\`\}
text = re.sub(r'if\(hasExtractedText\)\{accumulatedPdfText\+=\`.*?\$\{pFile\.extractedText\}.*?\`\}', replacer, text, flags=re.DOTALL)

def replacer2(match):
    return """if(bufferText&&bufferText.trim().length>20){
let safeBufferText = bufferText;
const maxChars = 300000;
if (safeBufferText.length > maxChars) {
const half = Math.floor(maxChars / 2);
safeBufferText = safeBufferText.substring(0, half) + "\\n\\n... [AVISO DO SISTEMA: PDF GIGANTE. O MIOLO DO ARQUIVO FOI RESUMIDO PARA NÃO ESGOTAR SUA COTA DA CHAVE API GRATUITA] ...\\n\\n" + safeBufferText.substring(safeBufferText.length - half);
}
accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (Extraído via Buffer) ===]\\n${safeBufferText}\\n`;
}"""

text = re.sub(r'if\(bufferText&&bufferText\.trim\(\)\.length>20\)\{accumulatedPdfText\+=\`.*?\$\{bufferText\}.*?\`\}', replacer2, text, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(text)
print("Done replacement.")
