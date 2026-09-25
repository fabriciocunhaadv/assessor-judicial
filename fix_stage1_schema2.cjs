const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetSchema = `responseSchema: {type:Type.OBJECT,properties:{minute:{type:Type.OBJECT`;
const replaceStr = `responseSchema: {
            type: Type.OBJECT,
            properties: {
                relatorio: { type: Type.STRING },
                fundamentacao: { type: Type.STRING },
                dispositivo: { type: Type.STRING }
            },
            required: ["relatorio", "fundamentacao", "dispositivo"]
        },
        // simple schema applied here`;

const idx1 = code.indexOf('responseSchema: {type:Type.OBJECT,properties:{minute:{type:Type.OBJECT');
if (idx1 > -1) {
    // Find the end of this object
    const start = code.lastIndexOf('responseSchema', idx1);
    const end = code.indexOf('    }});', start);
    
    if (start > -1 && end > -1) {
        code = code.substring(0, start) + replaceStr + code.substring(end - 1);
        fs.writeFileSync('server.ts', code);
        console.log("Stage 1 schema fixed!");
    } else {
        console.log("Could not find bounds.");
    }
} else {
    console.log("Not found.");
}

