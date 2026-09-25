const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `const hasText=Boolean(processText&&typeof processText==="string"&&processText.trim().length>0);`;
const replacement = `let safeProcessText = processText || "";
if (safeProcessText.length > 100000) {
    const half = Math.floor(100000 / 2);
    safeProcessText = safeProcessText.substring(0, half) + "\\n\\n... [AVISO DO SISTEMA: TEXTO COLADO GIGANTE. O MIOLO FOI RESUMIDO PARA NÃO ESGOTAR O LIMITE DA CHAVE GRATUITA] ...\\n\\n" + safeProcessText.substring(safeProcessText.length - half);
}
const hasText=Boolean(safeProcessText&&typeof safeProcessText==="string"&&safeProcessText.trim().length>0);`;

code = code.replace(target, replacement);
code = code.replace(/processText\?processText\.slice\(0,1500\)/g, 'safeProcessText?safeProcessText.slice(0,1500)');
code = code.replace(/processText\|\|""/g, 'safeProcessText||""');
code = code.replace(/\$\{processText\}/g, '${safeProcessText}');

fs.writeFileSync('server.ts', code);
console.log("Success capping processText");
