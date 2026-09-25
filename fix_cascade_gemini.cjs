const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.7-flash"
    ];`;

const replacementStr = `    // The names of the models according to the Google Gen AI SDK
    // Usually these are gemini-1.5-flash etc, but since the user provided a screenshot 
    // we need to map those visual names to the actual API model names.
    const modelsToTry = [
        "gemini-1.5-flash", 
        "gemini-1.5-flash-8b"
    ];`;

code = code.replace(targetStr, replacementStr);

const pModelReplaceRegex = /let pModel = options\.primaryModel \|\| 'gemini-3\.8-flash';\s*if \(pModel\.includes\('1\.5-pro'\)\) pModel = 'gemini-3\.1-pro-preview';\s*if \(pModel\.includes\('1\.5-flash'\)\) pModel = 'gemini-3\.8-flash';\s*if \(pModel\.includes\('2\.0-flash'\)\) pModel = 'gemini-3\.8-flash';/g;
code = code.replace(pModelReplaceRegex, "let pModel = 'gemini-1.5-flash';");

const fModelReplaceRegex = /let fModel = options\.fallbackModel \|\| 'gemini-3\.8-flash';\s*if \(fModel\.includes\('1\.5-pro'\)\) fModel = 'gemini-3\.1-pro-preview';\s*if \(fModel\.includes\('1\.5-flash'\)\) fModel = 'gemini-3\.8-flash';\s*if \(fModel\.includes\('2\.0-flash'\)\) fModel = 'gemini-3\.8-flash';/g;
code = code.replace(fModelReplaceRegex, "let fModel = 'gemini-1.5-flash-8b';");

code = code.replace(/primaryModel: "gemini-3\.8-flash",/g, 'primaryModel: "gemini-1.5-flash",');
code = code.replace(/fallbackModel:"gemini-3\.8-flash",/g, 'fallbackModel:"gemini-1.5-flash",');


fs.writeFileSync('server.ts', code);
console.log("Success replacing cascade logic with actual api names");
