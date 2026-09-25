const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const processNum = isValidProc(parsed.minute?.processNumber) ? parsed.minute.processNumber.trim() : (isValidProc(processInfo?.processNumber) ? processInfo.processNumber : "N\\xFAmero n\\xE3o identificado nos autos");`;

const replacementStr = `const processNum = isValidProc(parsed.minute?.processNumber) ? parsed.minute.processNumber.trim() : (isValidProc(processInfo?.processNumber) ? processInfo.processNumber : "N\\xFAmero n\\xE3o identificado nos autos");\nif(parsed.minute) { parsed.minute.processNumber = processNum; }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code);
    console.log("Success replacing processNum logic");
} else {
    console.log("Could not find the target string.");
}
