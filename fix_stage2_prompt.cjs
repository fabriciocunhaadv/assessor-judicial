const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = "TEXTO DOS AUTOS (INÍCIO): ${processText ? processText.substring(0, 1500) : ''}";
const replacementStr = "TEXTO DOS AUTOS (INÍCIO): ${(processText || accumulatedPdfText || '').substring(0, 2500)}";

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code);
    console.log("Success replacing stage2Prompt autos context");
} else {
    console.log("Could not find the target string.");
}
