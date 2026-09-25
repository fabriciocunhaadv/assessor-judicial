const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldLine = "const processNum=parsed.minute?.processNumber&&parsed.minute.processNumber.trim().length>3?parsed.minute.processNumber.trim():processInfo?.processNumber&&processInfo.processNumber!==\"Extrair automaticamente dos autos\"?processInfo.processNumber:\"Processo TJGO\";";

const newLine = "const isValidProc = (num) => num && num.trim().length > 3 && !num.toLowerCase().includes('n\\xE3o informado') && !num.toLowerCase().includes('processo nxba') && !num.toLowerCase().includes('extrair');\nconst processNum = isValidProc(parsed.minute?.processNumber) ? parsed.minute.processNumber.trim() : (isValidProc(processInfo?.processNumber) ? processInfo.processNumber : \"N\\xFAmero n\\xE3o identificado nos autos\");";

if (code.includes(oldLine)) {
    code = code.replace(oldLine, newLine);
    fs.writeFileSync('server.ts', code);
    console.log("Fixed processNum logic successfully.");
} else {
    console.log("Could not find oldLine processNum.");
}
