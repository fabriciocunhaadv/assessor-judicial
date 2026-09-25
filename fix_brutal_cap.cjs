const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Cap local extracted text to 100,000 chars
code = code.replace(/const maxChars = \d+;/g, "const maxChars = 100000;");
code = code.replace(/const maxCharsBuf = \d+;/g, "const maxCharsBuf = 100000;");

// Cap global text to 100,000 chars
code = code.replace(/if \(accumulatedPdfText\.length > 400000\)/g, "if (accumulatedPdfText.length > 100000)");
code = code.replace(/const half = Math\.floor\(400000 \/ 2\);/g, "const half = Math.floor(100000 / 2);");

// Ensure Stage 2 doesn't send 2500 if we are squeezing limits, actually 2500 is very small (like 600 tokens), so that's fine.

fs.writeFileSync('server.ts', code);
console.log("Success applying brutal cap");
