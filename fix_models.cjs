const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-latest"
    ];`;

const replacementStr = `    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3-flash"
    ];`;

code = code.replace(targetStr, replacementStr);

code = code.replace(/primaryModel: "gemini-1\.5-flash",/g, 'primaryModel: "gemini-3.8-flash",');
code = code.replace(/fallbackModel:"gemini-1\.5-flash",/g, 'fallbackModel:"gemini-3.8-flash",');
code = code.replace(/let pModel = 'gemini-1\.5-flash';/g, "let pModel = 'gemini-3.8-flash';");
code = code.replace(/let fModel = 'gemini-1\.5-flash';/g, "let fModel = 'gemini-3.8-flash';");

fs.writeFileSync('server.ts', code);
console.log("Success replacing models");
