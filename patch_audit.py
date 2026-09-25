import re

with open('server.ts', 'r') as f:
    text = f.read()

target = r'if(pFile.extractedText&&typeof pFile.extractedText==="string"&&pFile.extractedText.trim().length>30){accumulatedPdfText+=`[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"vxE1rias"} pxE1ginas) ===]${pFile.extractedText}`}'

replacement = r'''if(pFile.extractedText&&typeof pFile.extractedText==="string"&&pFile.extractedText.trim().length>30){
    let safeText = pFile.extractedText;
    const maxChars = 4000000;
    if (safeText.length > maxChars) {
        const half = Math.floor(maxChars / 2);
        safeText = safeText.substring(0, half) + "\n\n... [AVISO DO SISTEMA: PDF GIGANTE. O MIOLO DO ARQUIVO FOI RESUMIDO PARA NÃO ESGOTAR A COTA DA CHAVE API] ...\n\n" + safeText.substring(safeText.length - half);
    }
    accumulatedPdfText+=`[=== AUTOS DO PROCESSO: ${pFile.name||"Documento"} (${pFile.pageCount||"vxE1rias"} pxE1ginas) ===]${safeText}`
}'''

text = text.replace(target, replacement)

with open('server.ts', 'w') as f:
    f.write(text)
print("Success")
