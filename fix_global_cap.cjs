const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const hasPdfs=Boolean(pdfFiles&&Array.isArray(pdfFiles)&&pdfFiles.length>0);`;
const replacementStr = `// GLOBAL CAP FOR FREE TIER LIMIT (250K TOKENS)
if (accumulatedPdfText.length > 400000) {
    const half = Math.floor(400000 / 2);
    accumulatedPdfText = accumulatedPdfText.substring(0, half) + "\\n\\n... [AVISO DO SISTEMA: TEXTOS ACUMULADOS GIGANTES. O MIOLO FOI RESUMIDO PARA NÃO ESGOTAR O LIMITE DA CHAVE GRATUITA] ...\\n\\n" + accumulatedPdfText.substring(accumulatedPdfText.length - half);
}
const hasPdfs=Boolean(pdfFiles&&Array.isArray(pdfFiles)&&pdfFiles.length>0);`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', code);
console.log("Success adding global cap");
