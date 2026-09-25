const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b"
    ];`;

const replacementStr = `    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview"
    ];`;

if (code.includes('gemini-2.0-flash')) {
    code = code.replace(
        /const modelsToTry = \[\s*"gemini-3\.8-flash",\s*"gemini-2\.5-flash",\s*"gemini-2\.0-flash",\s*"gemini-1\.5-flash",\s*"gemini-1\.5-flash-8b"\s*\];/g,
        replacementStr
    );
    fs.writeFileSync('server.ts', code);
    console.log("Success replacing cascade logic with latest models");
} else {
    console.log("Could not find the target string.");
}
