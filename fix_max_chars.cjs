const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace maxChars = 4000000 with maxChars = 700000
code = code.replaceAll("const maxChars = 4000000;", "const maxChars = 700000;");

fs.writeFileSync('server.ts', code);
console.log("Success replacing maxChars");
