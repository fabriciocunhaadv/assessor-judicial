const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `if(kPdf.extractedText&&typeof kPdf.extractedText==="string"&&kPdf.extractedText.trim().length>0){knowledgeBaseText+=\`
[=== BASE DE CONHECIMENTO INTERNA: \${kPdf.name} ===]
\${kPdf.extractedText}
\`}}}`;

const replacementStr = `if(kPdf.extractedText&&typeof kPdf.extractedText==="string"&&kPdf.extractedText.trim().length>0){
    let safeKPdfText = kPdf.extractedText;
    if (safeKPdfText.length > 50000) {
        const half = Math.floor(50000 / 2);
        safeKPdfText = safeKPdfText.substring(0, half) + "\\n\\n... [AVISO: BASE DE CONHECIMENTO GIGANTE RESUMIDA] ...\\n\\n" + safeKPdfText.substring(safeKPdfText.length - half);
    }
    knowledgeBaseText+=\`\\n\\n[=== BASE DE CONHECIMENTO INTERNA: \${kPdf.name} ===]\\n\${safeKPdfText}\\n\`;
}}}

if (knowledgeBaseText.length > 100000) {
    const half = Math.floor(100000 / 2);
    knowledgeBaseText = knowledgeBaseText.substring(0, half) + "\\n\\n... [AVISO: LIMITE GLOBAL DA BASE DE CONHECIMENTO ATINGIDO] ...\\n\\n" + knowledgeBaseText.substring(knowledgeBaseText.length - half);
}`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', code);
console.log("Success capping knowledge base text");
