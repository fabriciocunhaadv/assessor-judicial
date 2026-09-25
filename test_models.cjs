const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const response = await ai.models.list();
        for await (const model of response) {
            console.log(model.name);
        }
    } catch (e) {
        console.error("List error:", e.message);
    }
}
run();
