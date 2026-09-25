const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('app.post("/api/generate-minute",');
const endIdx = code.indexOf('app.post("/api/chat-agaia",');

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find boundaries.");
  process.exit(1);
}

// Read the replacement code from another file
const replacement = fs.readFileSync('replacement_minute.ts', 'utf8');

const newCode = code.substring(0, startIdx) + replacement + code.substring(endIdx);
fs.writeFileSync('server.ts', newCode);
console.log("Patched server.ts successfully.");
