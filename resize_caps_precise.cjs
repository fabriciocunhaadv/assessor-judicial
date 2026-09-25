const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Process Text: safeProcessText
code = code.replace(
    /if \(safeProcessText\.length > \d+\) \{\s*const half = Math\.floor\(\d+ \/ 2\);/g,
    'if (safeProcessText.length > 150000) {\n    const half = Math.floor(150000 / 2);'
);

// 2. Knowledge Base Individual: safeKPdfText
code = code.replace(
    /if \(safeKPdfText\.length > \d+\) \{\s*const half = Math\.floor\(\d+ \/ 2\);/g,
    'if (safeKPdfText.length > 100000) {\n        const half = Math.floor(100000 / 2);'
);

// 3. Knowledge Base Global: knowledgeBaseText
code = code.replace(
    /if \(knowledgeBaseText\.length > \d+\) \{\s*const half = Math\.floor\(\d+ \/ 2\);/g,
    'if (knowledgeBaseText.length > 150000) {\n    const half = Math.floor(150000 / 2);'
);

// 4. PDF Individual: maxChars / maxCharsBuf
code = code.replace(/const maxChars = \d+;/g, 'const maxChars = 300000;');
code = code.replace(/const maxCharsBuf = \d+;/g, 'const maxCharsBuf = 300000;');

// 5. PDF Global: accumulatedPdfText
code = code.replace(
    /if \(accumulatedPdfText\.length > \d+\) \{\s*const half = Math\.floor\(\d+ \/ 2\);/g,
    'if (accumulatedPdfText.length > 400000) {\n    const half = Math.floor(400000 / 2);'
);

fs.writeFileSync('server.ts', code);
console.log("Success resizing caps precisely");
