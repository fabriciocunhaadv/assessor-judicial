const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Find the first generateWithFallbackAndRetry call
const firstCallStart = code.indexOf('generateWithFallbackAndRetry');
const secondCallStart = code.indexOf('generateWithFallbackAndRetry', firstCallStart + 10);

if (firstCallStart > -1 && secondCallStart > -1) {
    let stage1Block = code.substring(0, secondCallStart);
    let stage2Block = code.substring(secondCallStart);
    
    // In stage1Block, replace responseSchema: { ... } with the simple schema
    stage1Block = stage1Block.replace(/responseSchema:\s*\{type:Type\.OBJECT[\s\S]*?\}\}\}\}\}\}/, `responseSchema: {
            type: Type.OBJECT,
            properties: {
                relatorio: { type: Type.STRING },
                fundamentacao: { type: Type.STRING },
                dispositivo: { type: Type.STRING }
            },
            required: ["relatorio", "fundamentacao", "dispositivo"]
        }`);
        
    fs.writeFileSync('server.ts', stage1Block + stage2Block);
    console.log("Fixed stage 1 schema!");
} else {
    console.log("Could not find both calls.");
}
