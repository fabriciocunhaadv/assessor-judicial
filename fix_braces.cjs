const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The problematic string is:
// required:["minute"]}}    }});} finally {

code = code.replace(/required:\["minute"\]\}\}\s*\}\}\);\}/, 'required:["minute"]}}    });');

fs.writeFileSync('server.ts', code);
