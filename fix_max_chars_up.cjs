const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace maxChars = 700000 with maxChars = 4000000 (cerca de 1 milhão de tokens)
code = code.replaceAll("const maxChars = 700000;", "const maxChars = 4000000;");

fs.writeFileSync('server.ts', code);
console.log("Success replacing maxChars");
