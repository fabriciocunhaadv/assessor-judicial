const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ];`;

const replacementStr = `    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-latest"
    ];`;

code = code.replace(targetStr, replacementStr);

code = code.replace(/primaryModel: "gemini-3\.8-flash",/g, 'primaryModel: "gemini-1.5-flash",');
code = code.replace(/fallbackModel:"gemini-3\.8-flash",/g, 'fallbackModel:"gemini-1.5-flash",');

fs.writeFileSync('server.ts', code);
console.log("Success removing pro model completely");
