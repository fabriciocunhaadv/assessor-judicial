const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-1.5-pro"
    ];`;

const replacementStr = `    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-latest"
    ];`;

code = code.replace(targetStr, replacementStr);

const pModelReplaceRegex = /let pModel = 'gemini-2\.0-flash';/g;
code = code.replace(pModelReplaceRegex, "let pModel = 'gemini-1.5-flash';");

const fModelReplaceRegex = /let fModel = 'gemini-2\.0-flash';/g;
code = code.replace(fModelReplaceRegex, "let fModel = 'gemini-1.5-flash';");

code = code.replace(/primaryModel: "gemini-2\.0-flash",/g, 'primaryModel: "gemini-1.5-flash",');
code = code.replace(/fallbackModel:"gemini-2\.0-flash",/g, 'fallbackModel:"gemini-1.5-flash",');

fs.writeFileSync('server.ts', code);
console.log("Success replacing cascade logic with actual api names");
