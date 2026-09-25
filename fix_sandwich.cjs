const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const block1Regex = /const maxChars = \d+;/g;
const replace1 = `const maxChars = 800000;`;
code = code.replace(block1Regex, replace1);

const block2Regex = /const maxCharsBuf = \d+;/g;
const replace2 = `const maxCharsBuf = 800000;`;
code = code.replace(block2Regex, replace2);

fs.writeFileSync('server.ts', code);
console.log("Success adjusting sandwich to 800k chars");
