const fs = require('fs');
let code = fs.readFileSync('new_generate_minute.ts', 'utf8');

// 1. We remove the activeTeses and matchedPrecedents from Stage 1 systemInstruction
const removeTesesRegex = /if\(activeTeses&&activeTeses\.trim\(\)\.length>0\)\{systemInstruction\+=`[\s\S]*?\n\n?`\}/;
code = code.replace(removeTesesRegex, '// activeTeses moved to stage 2');

const removePrecedentsRegex = /const combinedContextForPrecedents=[\s\S]*?if\(matchedPrecedents\.length>0\)\{systemInstruction\+=`[\s\S]*?`\}/;
code = code.replace(removePrecedentsRegex, '// matchedPrecedents moved to stage 2');

const removeTaxonomyRegex = /const taxonomySummary=getApplicableTaxonomySummary[\s\S]*?if\(taxonomySummary\)\{systemInstruction\+=`[\s\S]*?`\}/;
code = code.replace(removeTaxonomyRegex, '// taxonomySummary moved to stage 2');

// 2. We find the main generateWithFallbackAndRetry call and replace it with the 2-stage execution
const callStart = code.indexOf('response=await generateWithFallbackAndRetry(');
const callEnd = code.indexOf('const outputText=response.text;');

if (callStart === -1 || callEnd === -1) {
    console.error("Could not find the generate call");
    process.exit(1);
}

const originalCall = code.substring(callStart, callEnd);

const stage2Logic = `
response=await generateWithFallbackAndRetry({
    apiKey:userApiKey,
    primaryModel: isExpertModeEnabled ? "gemini-1.5-pro" : "gemini-1.5-flash",
    fallbackModel:"gemini-1.5-flash",
    contents:[{role:"user",parts:contentsParts}],
    config:{
        systemInstruction,
        temperature:0.1,
        responseMimeType:"application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                relatorio: { type: Type.STRING },
                fundamentacao: { type: Type.STRING },
                dispositivo: { type: Type.STRING }
            },
            required: ["relatorio", "fundamentacao", "dispositivo"]
        }
    }
});

const stage1Text = response.text;
let stage1Json;
try {
    stage1Json = JSON.parse(stage1Text || "{}");
} catch(e) {
    stage1Json = { relatorio: "", fundamentacao: stage1Text, dispositivo: "" };
}

console.log("[Assessor Judicial] Stage 1 (Minuta Factual) Concluída. Iniciando Stage 2 (Teses)...");

// STAGE 2: Apply Gabinete Teses & Sumulas
const combinedContextForPrecedents=[processText||"",accumulatedPdfText||"",actType||"",actSubtype||"",specificInstructions||"",customPromptText||"",paradigmModelText||""].join(" ");
const matchedPrecedents=matchApplicableBindingPrecedents(combinedContextForPrecedents);
const taxonomySummary=getApplicableTaxonomySummary(combinedContextForPrecedents);

let stage2SystemInstruction = "Você é o Juiz Revisor Especialista. Abaixo está a minuta preliminar elaborada pelo assistente forense baseada puramente nos fatos (relatório, fundamentação e dispositivo).\\n";
stage2SystemInstruction += "Sua missão é LER A MINUTA PRELIMINAR, confrontá-la com o CADERNO DE TESES DO GABINETE e as SÚMULAS VINCULANTES.\\n";
stage2SystemInstruction += "Se o caso narrado no Relatório se enquadrar em NOSSAS TESES ou SÚMULAS, você DEVE REESCREVER a Fundamentação e o Dispositivo para aplicar as normativas e ajustar a conclusão final.\\n";
stage2SystemInstruction += "Se nenhuma tese se aplicar ou se a minuta preliminar já estiver perfeita, mantenha a minuta como está.\\n";

if(activeTeses && activeTeses.trim().length > 0) {
    stage2SystemInstruction += "\\n[CADERNO DE TESES E DIRETRIZES VINCULANTES DO GABINETE (PRIORIDADE MÁXIMA)]:\\n" + activeTeses;
}

if(matchedPrecedents.length > 0) {
    stage2SystemInstruction += "\\n\\n[ALIMENTAÇÃO AUTOMÁTICA DE SÚMULAS E TESES VINCULANTES (STF • STJ • TNU)]:\\n";
    stage2SystemInstruction += matchedPrecedents.map((p,idx)=>\`\${idx+1}. [\${p.tribunal} • \${p.number} - \${p.title}]: "\${p.statement}"\`).join("\\n");
}

if(taxonomySummary) {
    stage2SystemInstruction += "\\n\\n[MAPEAMENTO TAXONÔMICO NORMATIVO & MICROSSISTEMAS]:\\n" + taxonomySummary;
}

const stage2Prompt = \`MINUTA PRELIMINAR (FATOS DO PROCESSO):\\n
RELATÓRIO:
\${stage1Json.relatorio || "Não gerado"}

FUNDAMENTAÇÃO PRELIMINAR:
\${stage1Json.fundamentacao || "Não gerado"}

DISPOSITIVO PRELIMINAR:
\${stage1Json.dispositivo || "Não gerado"}

Elabore a minuta judicial final e estruturada oficial em formato JSON conforme o schema, reescrevendo a fundamentação e dispositivo caso alguma Tese do Gabinete ou Súmula seja aplicável ao caso.\`;

response = await generateWithFallbackAndRetry({
    apiKey:userApiKey,
    primaryModel: isExpertModeEnabled ? "gemini-1.5-pro" : "gemini-1.5-flash",
    fallbackModel:"gemini-1.5-flash",
    contents: stage2Prompt,
    config:{
        systemInstruction: stage2SystemInstruction,
        temperature:0.1,
        responseMimeType:"application/json",
        // Re-use original schema from original call
        /* removed empty schema */)\s*\}\s*\)/)?.[1] || '{}'}
    }
});
`;

code = code.substring(0, callStart) + stage2Logic + code.substring(callEnd);

fs.writeFileSync('new_generate_minute.ts', code);
console.log("Modified new_generate_minute.ts successfully.");
