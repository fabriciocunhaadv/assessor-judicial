const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');
const start = code.indexOf('// STAGE 2:');
const end = code.indexOf('generateWithFallbackAndRetry', start);
console.log(code.substring(start, end));
