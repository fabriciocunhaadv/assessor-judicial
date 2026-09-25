const fs = require('fs');

let schema = fs.readFileSync('schema_dump.txt', 'utf8').trim();
// Extract the responseSchema logic
// Look for responseSchema:{...}
let match = schema.match(/responseSchema:(\{.*?\})\s*\}\s*\)\s*\}\s*finally/s);
if (match) {
    let schemaObj = match[1];
    let code = fs.readFileSync('server.ts', 'utf8');
    code = code.replace(/\/\*\s*removed empty schema\s*\*\//g, "responseSchema: " + schemaObj);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server.ts with full schema.");
} else {
    console.log("Could not find schema block in dump.");
}
