const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "const pdf = await pdfjsLib.getDocument({ data }).promise;",
    "const pdf = await pdfjsLib.getDocument({ data, standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/', disableFontFace: true }).promise;"
);

fs.writeFileSync('server.ts', code);
console.log("Success fixing standardFontDataUrl");
