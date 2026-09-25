const fs = require('fs');
let code = fs.readFileSync('src/components/PdfUploadZone.tsx', 'utf8');
console.log(code.match(/isLargeFile/g));
