with open('server.ts', 'r') as f:
    text = f.read()

target1 = 'if(hasExtractedText){accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"várias"} páginas) ===]\\n${pFile.extractedText}\\n`}'
replacement1 = """if(hasExtractedText){
let safeText = pFile.extractedText;
const maxChars = 300000;
if (safeText.length > maxChars) {
const half = Math.floor(maxChars / 2);
safeText = safeText.substring(0, half) + "\\n\\n... [AVISO: ARQUIVO COM MAIS DE 1000 PÁGINAS. MIOLO RESUMIDO PARA NÃO ESTOURAR A COTA DA CHAVE API] ...\\n\\n" + safeText.substring(safeText.length - half);
}
accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"várias"} páginas) ===]\\n${safeText}\\n`
}"""

target2 = 'if(bufferText&&bufferText.trim().length>20){accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (Extraído via Buffer) ===]\\n${bufferText}\\n`}'
replacement2 = """if(bufferText&&bufferText.trim().length>20){
let safeBufferText = bufferText;
const maxChars = 300000;
if (safeBufferText.length > maxChars) {
const half = Math.floor(maxChars / 2);
safeBufferText = safeBufferText.substring(0, half) + "\\n\\n... [AVISO: ARQUIVO COM MAIS DE 1000 PÁGINAS. MIOLO RESUMIDO PARA NÃO ESTOURAR A COTA DA CHAVE API] ...\\n\\n" + safeBufferText.substring(safeBufferText.length - half);
}
accumulatedPdfText+=`\\n\\n[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (Extraído via Buffer) ===]\\n${safeBufferText}\\n`;
}"""

# Fix literal 'n' issue in sed output. Let's just do find and replace on parts:
if "if(hasExtractedText){accumulatedPdfText+=" in text:
    print("Found 1!")

