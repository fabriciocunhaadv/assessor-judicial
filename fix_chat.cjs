const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = 'app.post("/api/chat-agaia", (req, res) => res.json({ result: "Chat response" }));';

const newEndpoint = `app.post("/api/chat-agaia", async (req, res) => {
    try {
        const apiKey = extractApiKey(req);
        if (!apiKey) return res.status(401).json({ error: "Chave da API Gemini ausente." });
        
        const { message, conversationHistory, currentMinute, auditAnalysis, originalProcessText, customPromptText, cabinetTesesText, isTesesEnabled, paradigmModelText, paradigmModelTitle, isParadigmEnabled } = req.body;
        
        const systemPrompt = \`Você é o Assessor Judicial, um assistente legal altamente especializado. 
Responda com precisão e linguagem técnica jurídica adequada. 
Você está conversando com o usuário sobre uma minuta de decisão que já foi gerada com base nos autos do processo.

# Autos Originais (Resumo):
\${originalProcessText ? originalProcessText.substring(0, 15000) + '...' : 'Não disponível'}

# Minuta Atual:
\${currentMinute ? JSON.stringify(currentMinute) : 'Não disponível'}

Instrução: Analise o pedido do usuário e responda amigavelmente. 
Se o usuário pedir para reescrever, alterar, resumir ou ajustar a minuta de alguma forma, forneça a nova versão do texto da minuta no formato especificado.
Você DEVE retornar a resposta estritamente em formato JSON com a seguinte estrutura:
{
  "reply": "Sua resposta amigável e explicativa para o usuário no chat",
  "hasMinuteUpdate": true ou false,
  "updatedMinute": {
     // Opcional: Se hasMinuteUpdate for true, inclua o objeto da minuta modificada, mantendo os campos originais.
     "title": "...",
     "body": "..."
  },
  "suggestedActions": ["Ação 1", "Ação 2"]
}
IMPORTANTE: Retorne APENAS um bloco de código contendo o JSON, sem markdown ou texto fora do JSON.\`;

        let historyPrompt = "Histórico da conversa:\\n";
        if (conversationHistory && conversationHistory.length > 0) {
           conversationHistory.forEach((msg) => {
               historyPrompt += \`[\${msg.sender === 'user' ? 'Usuário' : 'Você'}]: \${msg.text}\\n\`;
           });
        }
        
        const userPrompt = \`\${historyPrompt}\\nUsuário: \${message}\`;
        
        const options = {
            apiKey: apiKey,
            contents: [
                { role: "user", parts: [{ text: systemPrompt + "\\n\\n" + userPrompt }] }
            ],
            config: {
                systemInstruction: "Você é um AI que responde apenas com objetos JSON estritos de acordo com o esquema solicitado.",
                responseMimeType: "application/json",
            }
        };

        const response = await generateWithFallbackAndRetry(options);
        const responseText = response.text || "";
        
        let cleanJson = responseText;
        if (cleanJson.startsWith('\`\`\`json')) cleanJson = cleanJson.substring(7);
        if (cleanJson.startsWith('\`\`\`')) cleanJson = cleanJson.substring(3);
        if (cleanJson.endsWith('\`\`\`')) cleanJson = cleanJson.substring(0, cleanJson.length - 3);
        
        let data;
        try {
            data = JSON.parse(cleanJson.trim());
        } catch(e) {
            console.error("Failed to parse JSON:", cleanJson);
            return res.json({ reply: "A resposta gerada não pôde ser lida adequadamente. Tente novamente.", hasMinuteUpdate: false });
        }
        
        res.json({
            reply: data.reply || "Resposta processada com base nos autos.",
            hasMinuteUpdate: data.hasMinuteUpdate || false,
            updatedMinute: data.updatedMinute ? { ...currentMinute, ...data.updatedMinute } : undefined,
            suggestedActions: data.suggestedActions || [],
            usage: {
                promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokenCount: response.usageMetadata?.totalTokenCount || 0
            },
            modelUsed: response.modelVersion || "Gemini Flash"
        });

    } catch (error) {
        console.error("Erro no chat-agaia:", error);
        res.status(500).json({ error: error.message || "Erro interno ao processar chat." });
    }
});`;

serverCode = serverCode.replace(oldEndpoint, newEndpoint);
fs.writeFileSync('server.ts', serverCode);
console.log("Chat endpoint fixed.");
