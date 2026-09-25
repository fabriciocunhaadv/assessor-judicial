const fs = require('fs');

let code = fs.readFileSync('new_generate_minute.ts', 'utf8');

// 1. Remove activeTeses from stage 1 systemInstruction
// Originally:
// const activeTeses=getActiveCabinetTeses(cabinetTesesText,isTesesEnabled);let systemInstruction=SYSTEM_INSTRUCTION_FABRICIO;if(activeTeses&&activeTeses.trim().length>0){systemInstruction+=`\n\n[DIRETRIZES VINCULANTES E CADERNO DE TESES DO GABINETE (PRIORIDADE MxC1XIMA DE JULGAMENTO)]:\n...${activeTeses}\n"""\n`}
// Let's replace it with just:
code = code.replace(/const activeTeses=getActiveCabinetTeses\(cabinetTesesText,isTesesEnabled\);let systemInstruction=SYSTEM_INSTRUCTION_FABRICIO;if\(activeTeses&&activeTeses\.trim\(\)\.length>0\)\{systemInstruction\+=`[\s\S]*?`\}/, 'const activeTeses=getActiveCabinetTeses(cabinetTesesText,isTesesEnabled);let systemInstruction=SYSTEM_INSTRUCTION_FABRICIO;');

// 2. Remove knowledgeBaseText from userPrompt
// It's injected via: ${knowledgeBaseText?`[BASE DE CONHECIMENTO...
code = code.replace(/\$\{knowledgeBaseText\?`\[BASE DE CONHECIMENTO[\s\S]*?`:""\}/, '');

// 3. Stage 2 needs to use knowledgeBaseText and activeTeses
// Let's find stage2SystemInstruction
// const stage2SystemInstruction = SYSTEM_INSTRUCTION_FABRICIO + (activeTeses ? `\n\n[DIRETRIZES VINCULANTES...
let newStage2SysInst = `const stage2SystemInstruction = SYSTEM_INSTRUCTION_FABRICIO + (activeTeses ? "\\n\\n[DIRETRIZES VINCULANTES E CADERNO DE TESES DO GABINETE]:\\nO magistrado estabeleceu teses espec\\xEDficas. Confronte-as com os fatos da minuta preliminar. Se aplic\\xE1vel, reescreva a fundamenta\\xE7\\xE3o e o dispositivo.\\n\\\"\\\"\\\"\\n" + activeTeses + "\\n\\\"\\\"\\\"\\n" : "");`;
code = code.replace(/const stage2SystemInstruction = SYSTEM_INSTRUCTION_FABRICIO;/g, newStage2SysInst);

// Let's find stage2Prompt
// const stage2Prompt = `MINUTA PRELIMINAR...
let newStage2Prompt = "const stage2Prompt = `MINUTA PRELIMINAR (FATOS DO PROCESSO):\\nRELATÓRIO:\\n${stage1Json.relatorio || \"Não gerado\"}\\n\\nFUNDAMENTAÇÃO PRELIMINAR:\\n${stage1Json.fundamentacao || \"Não gerado\"}\\n\\nDISPOSITIVO PRELIMINAR:\\n${stage1Json.dispositivo || \"Não gerado\"}\\n\\n${knowledgeBaseText ? `[BASE DE CONHECIMENTO DO GABINETE]:\\n` + knowledgeBaseText + `\\n` : ''}Elabore a minuta judicial final reescrevendo a fundamentação e dispositivo caso alguma Tese do Gabinete ou Súmula seja aplicável ao caso. Em caso negativo, apenas melhore a minuta preliminar. Mantenha o formato JSON.`;";
code = code.replace(/const stage2Prompt = `MINUTA PRELIMINAR[\s\S]*?caso alguma Tese do Gabinete ou Súmula seja aplicável ao caso\.`;/g, newStage2Prompt);

fs.writeFileSync('new_generate_minute.ts', code);
