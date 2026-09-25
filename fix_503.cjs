const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetFunc = `async function generateWithFallbackAndRetry(options) {`;

const newFunc = `async function generateWithFallbackAndRetry(options) {
    const ai = new GoogleGenAI({ apiKey: options.apiKey || process.env.GEMINI_API_KEY });
    let pModel = 'gemini-3.8-flash';
    let fModel = 'gemini-3.8-flash';
    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash"
    ];
    let lastError;
    
    // We will attempt each model, and if we hit a 429 quota rate limit or 503 unavailable, we pause and retry.
    for (const modelName of modelsToTry) {
        let retries = 3;
        while (retries > 0) {
            try {
                console.log("[Assessor Judicial] Tentando modelo:", modelName);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: options.contents,
                    config: options.config
                });
                return response;
            } catch (e) {
                lastError = e;
                console.warn("[Assessor Judicial] Falha com modelo", modelName, ":", e.message);
                
                // Handle 429 Quota Exceeded with explicit retry time
                if (e.message && e.message.includes("Quota exceeded") && e.message.includes("retry in")) {
                    const match = e.message.match(/retry in ([\\d\\.]+)s/);
                    if (match && match[1]) {
                        const waitSeconds = parseFloat(match[1]) + 1;
                        console.log(\`[Assessor Judicial] Rate limit atingido. Aguardando \${waitSeconds} segundos antes de tentar novamente...\`);
                        await new Promise(r => setTimeout(r, waitSeconds * 1000));
                        retries--;
                        continue; 
                    }
                }
                
                // Handle 503 Service Unavailable / High Demand
                if (e.message && (e.message.includes("503") || e.message.includes("high demand") || e.message.includes("UNAVAILABLE"))) {
                    console.log(\`[Assessor Judicial] Modelo em alta demanda (503). Aguardando 4 segundos para tentar novamente (Tentativas restantes: \${retries - 1})...\`);
                    await new Promise(r => setTimeout(r, 4000));
                    retries--;
                    continue;
                }
                
                // If it's a 404 or other unrecoverable error, break out of this model's loop and try the next model in cascade
                break; 
            }
        }
    }
    throw lastError;
}`;

// Find the boundaries of the function.
const lines = code.split('\n');
let startIdx = -1;
let endIdx = -1;
let braceCount = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('async function generateWithFallbackAndRetry(options) {')) {
        startIdx = i;
        braceCount = 1;
        for (let j = i + 1; j < lines.length; j++) {
            braceCount += (lines[j].match(/{/g) || []).length;
            braceCount -= (lines[j].match(/}/g) || []).length;
            if (braceCount === 0) {
                endIdx = j;
                break;
            }
        }
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    const before = lines.slice(0, startIdx).join('\n');
    const after = lines.slice(endIdx + 1).join('\n');
    code = before + '\n' + newFunc + '\n' + after;
    fs.writeFileSync('server.ts', code);
    console.log("Success replacing retry function to handle 503");
} else {
    console.log("Failed to find function");
}
