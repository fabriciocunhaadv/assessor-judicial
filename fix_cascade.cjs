const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `
    const modelsToTry = [pModel];
    if (fModel !== pModel) {
        modelsToTry.push(fModel);
    }
`;

const replacementStr = `
    // Flash model cascade - bypassing expensive models and ensuring fallback
    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b"
    ];
`;

if (code.includes('const modelsToTry = [pModel];')) {
    code = code.replace(
        /const modelsToTry = \[pModel\];\s*if \(fModel !== pModel\) {\s*modelsToTry\.push\(fModel\);\s*}/g,
        replacementStr
    );
    fs.writeFileSync('server.ts', code);
    console.log("Success replacing cascade logic");
} else {
    console.log("Could not find the target string.");
}
