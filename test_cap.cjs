const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const match = code.match(/processText/g);
console.log(match.length);
