const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const processNum=parsed.minute?.processNumber&&parsed.minute.processNumber.trim().length>3?parsed.minute.processNumber.trim():processInfo?.processNumber&&processInfo.processNumber!=="Extrair automaticamente dos autos"?processInfo.processNumber:"Processo TJGO";`;

const replacementStr = `
const isValidProc = (num) => num && num.trim().length > 3 && !num.toLowerCase().includes('n\\xE3o informado') && !num.toLowerCase().includes('processo nxba') && !num.toLowerCase().includes('extrair');
const processNum = isValidProc(parsed.minute?.processNumber) ? parsed.minute.processNumber.trim() : (isValidProc(processInfo?.processNumber) ? processInfo.processNumber : "N\\xFAmero n\\xE3o identificado nos autos");
if (!isValidProc(parsed.minute?.processNumber) && isValidProc(processInfo?.processNumber)) {
    if (parsed.minute) parsed.minute.processNumber = processInfo.processNumber;
}
`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code);
    console.log("Success replacing processNum logic");
} else {
    console.log("Could not find the target string.");
}
