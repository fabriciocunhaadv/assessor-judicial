const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `if (waitSeconds > 15) {
                            console.log(\`[Assessor Judicial] Rate limit muito longo (\${waitSeconds}s). Abortando para evitar timeout.\`);
                            throw new Error(\`Limite da chave gratuita atingido. O Google exige uma pausa. Por favor, aguarde \${Math.ceil(waitSeconds)} segundos e clique em Analisar novamente.\`);
                        }`;

code = code.replace(targetStr, '');
fs.writeFileSync('server.ts', code);
console.log("Success removing artificial timeout");
