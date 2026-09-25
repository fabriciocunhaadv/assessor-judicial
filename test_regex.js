const eMessage = `{"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 250000, model: gemini-3.8-flash\\nPlease retry in 58.622053282s.","status":"RESOURCE_EXHAUSTED"}}`;

const str = eMessage;
const hasQuota = str.includes("Quota exceeded");
const hasRetryIn = str.includes("retry in");
const match = str.match(/retry in ([\d\.]+)s/);

console.log(hasQuota, hasRetryIn, match);
