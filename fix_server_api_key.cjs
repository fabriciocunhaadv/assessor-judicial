const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = "return req.headers['x-api-key'] || process.env.GEMINI_API_KEY;";
const replacementStr = "return req.headers['x-gemini-api-key'] || req.headers['x-api-key'] || process.env.GEMINI_API_KEY;";

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code);
    console.log("Success replacing extractApiKey logic");
} else {
    console.log("Could not find the target string.");
}
