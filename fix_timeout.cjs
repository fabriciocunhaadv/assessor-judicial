const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const waitSeconds = parseFloat(match[1]) + 1;
                        console.log(\`[Assessor Judicial] Rate limit atingido. Aguardando \${waitSeconds} segundos antes de tentar novamente...\`);
                        await new Promise(r => setTimeout(r, waitSeconds * 1000));
                        retries--;
                        continue;`;

const replacementStr = `const waitSeconds = parseFloat(match[1]) + 1;
                        if (waitSeconds > 15) {
                            console.log(\`[Assessor Judicial] Rate limit muito longo (\${waitSeconds}s). Abortando para evitar timeout.\`);
                            throw new Error(\`Limite da chave gratuita atingido. O Google exige uma pausa. Por favor, aguarde \${Math.ceil(waitSeconds)} segundos e clique em Analisar novamente.\`);
                        }
                        console.log(\`[Assessor Judicial] Rate limit atingido. Aguardando \${waitSeconds} segundos antes de tentar novamente...\`);
                        await new Promise(r => setTimeout(r, waitSeconds * 1000));
                        retries--;
                        continue;`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', code);
console.log("Success updating timeout logic");
