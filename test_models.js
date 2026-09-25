const { GoogleGenAI } = require('@google/genai');

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const models = await ai.models.list();
        for await (const model of models) {
            console.log(model.name);
        }
    } catch (e) {
        console.error("List error:", e);
    }
}
run();
