const fs = require('fs');

let code = fs.readFileSync('new_generate_minute.ts', 'utf8');

// The line `let response;try{` should be changed to just `let response;` and we'll clear interval at the end.
code = code.replace(/let response;try\{/g, 'let response;');

// Remove the injected `} finally { clearInterval(keepAliveInterval); }`
code = code.replace(/\} finally \{ clearInterval\(keepAliveInterval\); \} /g, '');

// Now we have no syntax error hopefully from the broken try/catch.
// Let's add clearInterval(keepAliveInterval) right before res.write(JSON.stringify(parsed));
code = code.replace(/res\.write\(JSON\.stringify\(parsed\)\);/g, 'clearInterval(keepAliveInterval);\nres.write(JSON.stringify(parsed));');
// And also in the catch block of the main try
code = code.replace(/catch\(error\)\{console\.error\("Error generating minute:",error\);/g, 'catch(error){clearInterval(keepAliveInterval);console.error("Error generating minute:",error);');

fs.writeFileSync('new_generate_minute.ts', code);
