const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Process Text (100k -> 150k)
code = code.replace(/if \(safeProcessText\.length > 100000\)/g, 'if (safeProcessText.length > 150000)');
code = code.replace(/const half = Math\.floor\(100000 \/ 2\);/g, 'const half = Math.floor(150000 / 2);');

// 2. Knowledge Base Individual (50k -> 100k)
code = code.replace(/if \(safeKPdfText\.length > 50000\)/g, 'if (safeKPdfText.length > 100000)');
code = code.replace(/const half = Math\.floor\(50000 \/ 2\);/g, 'const half = Math.floor(100000 / 2);');

// 3. Knowledge Base Global (100k -> 150k)
code = code.replace(/if \(knowledgeBaseText\.length > 100000\)/g, 'if (knowledgeBaseText.length > 150000)');
// Note: The replacement above might conflict with the 100k/2 replace if done naively. We'll use more precise targeting.
