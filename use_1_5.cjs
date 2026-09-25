const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview"
    ];`;

const replacementStr = `    const modelsToTry = [
        "gemini-1.5-flash"
    ];`;

code = code.replace(targetStr, replacementStr);

const pModelReplaceRegex = /let pModel = 'gemini-3\.8-flash';/g;
code = code.replace(pModelReplaceRegex, "let pModel = 'gemini-1.5-flash';");

const fModelReplaceRegex = /let fModel = 'gemini-3\.8-flash';/g;
code = code.replace(fModelReplaceRegex, "let fModel = 'gemini-1.5-flash';");

code = code.replace(/primaryModel: "gemini-3\.8-flash",/g, 'primaryModel: "gemini-1.5-flash",');
code = code.replace(/fallbackModel:"gemini-3\.8-flash",/g, 'fallbackModel:"gemini-1.5-flash",');

fs.writeFileSync('server.ts', code);
console.log("Success using gemini-1.5-flash");
