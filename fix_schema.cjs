const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/responseSchema:\s*\{\s*type:\s*Type\.OBJECT\s*\}/g, '/* removed empty schema */');
fs.writeFileSync('server.ts', code);
