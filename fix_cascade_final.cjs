const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const modelsToTry = [
        "gemini-1.5-flash", 
        "gemini-1.5-flash-8b"
    ];`;

// Replacing with ONLY gemini-1.5-flash which is universally supported
const replacementStr = `    const modelsToTry = [
        "gemini-1.5-flash"
    ];`;

code = code.replace(targetStr, replacementStr);

const pModelReplaceRegex = /let pModel = 'gemini-1\.5-flash';/g;
const fModelReplaceRegex = /let fModel = 'gemini-1\.5-flash-8b';/g;

code = code.replace(fModelReplaceRegex, "let fModel = 'gemini-1.5-flash';");

fs.writeFileSync('server.ts', code);
console.log("Success replacing cascade logic with final supported model");
