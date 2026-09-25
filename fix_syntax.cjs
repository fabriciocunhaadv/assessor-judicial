const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The string we are looking for is `required:["minute"]}}    }});`
// In the original, it was `required:["minute"]}}});`
// I'll replace `/required:\["minute"\]\}\}(\s*)\}\}(\s*)\}\);/g` to clean it up.
code = code.replace(/required:\["minute"\]\}\}\s*\}\}\);/g, 'required:["minute"]}}});');

fs.writeFileSync('server.ts', code);
