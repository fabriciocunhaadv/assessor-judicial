const fs = require('fs');
let tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));

if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {};
tsconfig.compilerOptions.esModuleInterop = true;
tsconfig.compilerOptions.target = "ES2022";
tsconfig.compilerOptions.moduleResolution = "node";
tsconfig.compilerOptions.skipLibCheck = true;

fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
