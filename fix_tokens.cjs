const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The limit is actually much lower for older models (gemini-3.x-flash). 
// The error says "limit: 250000". We need to aggressively cut the text 
// to fit well within 250,000 tokens. 
// 1 token ~= 4 chars, so 250k tokens ~= 1,000,000 chars. 
// But we also have system prompts and other things.
// Let's set the max chars to 500,000 to be very safe and ensure it passes.

const block1Regex = /const maxChars = \d+;/g;
const replace1 = `const maxChars = 500000;`;
code = code.replace(block1Regex, replace1);

const block2Regex = /const maxCharsBuf = \d+;/g;
const replace2 = `const maxCharsBuf = 500000;`;
code = code.replace(block2Regex, replace2);

fs.writeFileSync('server.ts', code);
console.log("Success aggressive downscaling to 500k chars");
