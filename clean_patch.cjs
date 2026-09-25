const fs = require('fs');

// The original file is the whole server.ts
let orig = fs.readFileSync('server.ts', 'utf8');

// Find the boundaries of the route
const routeStart = orig.indexOf('app.post("/api/generate-minute",');
const routeEnd = orig.indexOf('app.post("/api/chat-agaia",');

let routeCode = orig.substring(routeStart, routeEnd);

routeCode = routeCode.replace(/if\(activeTeses&&activeTeses\.trim\(\)\.length>0\)\{systemInstruction\+=`[\s\S]*?\n\n?`\}/, '/* teses moved */');
routeCode = routeCode.replace(/const combinedContextForPrecedents=[\s\S]*?if\(matchedPrecedents\.length>0\)\{systemInstruction\+=`[\s\S]*?`\}/, '/* precedents moved */');
routeCode = routeCode.replace(/const taxonomySummary=getApplicableTaxonomySummary[\s\S]*?if\(taxonomySummary\)\{systemInstruction\+=`[\s\S]*?`\}/, '/* taxonomy moved */');

const start = routeCode.indexOf('response=await generateWithFallbackAndRetry({');
const end = routeCode.indexOf('}finally{clearInterval(keepAliveInterval)}');

const originalCall = routeCode.substring(start, end);

// MATCH EXACTLY ONE BRACE
let schemaMatch = originalCall.match(/responseSchema:\s*(\{[\s\S]*?"minute"\]\})/);
let schemaStr = schemaMatch ? schemaMatch[1] : '{}';

const stage2 = `
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
    stage2SystemInstruction += matchedPrecedents.map((p,idx)=>idx+1 + ". [" + p.tribunal + " • " + p.number + " - " + p.title + ']: "' + p.statement + '"').join("\\n");
}

if(taxonomySummary) {
    stage2SystemInstruction += "\\n\\n[MAPEAMENTO TAXONÔMICO NORMATIVO & MICROSSISTEMAS]:\\n" + taxonomySummary;
}

const stage2Prompt = "MINUTA PRELIMINAR (FATOS DO PROCESSO):\\n" +
"RELATÓRIO:\\n" +
(stage1Json.relatorio || "Não gerado") + "\\n\\n" +
"FUNDAMENTAÇÃO PRELIMINAR:\\n" +
(stage1Json.fundamentacao || "Não gerado") + "\\n\\n" +
"DISPOSITIVO PRELIMINAR:\\n" +
(stage1Json.dispositivo || "Não gerado") + "\\n\\n" +
"Elabore a minuta judicial final e estruturada oficial em formato JSON conforme o schema, reescrevendo a fundamentação e dispositivo caso alguma Tese do Gabinete ou Súmula seja aplicável ao caso.";

response = await generateWithFallbackAndRetry({
    apiKey:userApiKey,
    primaryModel: isExpertModeEnabled ? "gemini-1.5-pro" : "gemini-1.5-flash",
    fallbackModel:"gemini-1.5-flash",
    contents: stage2Prompt,
    config:{
        systemInstruction: stage2SystemInstruction,
        temperature:0.1,
        responseMimeType:"application/json",
        responseSchema: ` + schemaStr + `
    }
});
`;

let newRouteCode = routeCode.substring(0, start) + stage2 + routeCode.substring(end);
newRouteCode = newRouteCode.replace(/"Gemini 3\.8 Flash"/g, '"Gemini 1.5 Flash (Duas Etapas)"');

let finalCode = orig.substring(0, routeStart) + newRouteCode + orig.substring(routeEnd);

fs.writeFileSync('server.ts', finalCode);
console.log("Patched full server.ts successfully.");
