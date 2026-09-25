const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The problematic string is:
// required:["minute"]}}    }});
// We want to replace it with:
// required:["minute"]}    }});

code = code.replace(/required:\["minute"\]\}\}\s*\}\}\);\}/, 'required:["minute"]}    }});');
code = code.replace(/required:\["minute"\]\}\}\n\s*\}\}\);/, 'required:["minute"]}\n    }});');
code = code.replace(/required:\["minute"\]\}\}\s*\}\}\);/, 'required:["minute"]}\n    }});');

fs.writeFileSync('server.ts', code);
