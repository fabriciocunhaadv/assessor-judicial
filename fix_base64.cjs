const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const shouldSendBase64 = !finalHasText || pCount <= 15;`;
const replacementStr = `const shouldSendBase64 = !finalHasText;`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', code);
console.log("Success disabling unnecessary base64");
