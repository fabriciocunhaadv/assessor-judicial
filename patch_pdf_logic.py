import re

with open('server.ts', 'r') as f:
    text = f.read()

# Fix maxChars to 4,000,000 everywhere
text = text.replace('const maxChars = 300000;', 'const maxChars = 4000000;')
text = text.replace('const maxChars = 3500000;', 'const maxChars = 4000000;')

# Now, we need to find the specific block in /api/generate-minute that always pushes base64.
# It looks like:
# if(!hasExtractedText){
# try{
# const buffer=Buffer.from(cleanBase64,"base64");
# const bufferText=extractTextFromPdfBuffer(buffer);
# if(bufferText&&bufferText.trim().length>20){
# ...
# }}catch(e){console.warn("Buffer extraction fallback skipped:",e)}}contentsParts.push({inlineData:{mimeType:pFile.mimeType||"application/pdf",data:cleanBase64}})}}
# We need to change that to only push if it makes sense.

pattern = re.compile(r'\}\}catch\(e\)\{console\.warn\("Buffer extraction fallback skipped:",e\)\}\}contentsParts\.push\(\{inlineData:\{mimeType:pFile\.mimeType\|\|"application\/pdf",data:cleanBase64\}\}\)\}\}')

replacement = """}}catch(e){console.warn("Buffer extraction fallback skipped:",e)}}
const finalHasText = hasExtractedText || (typeof bufferText !== 'undefined' && bufferText && bufferText.trim().length > 20);
const pCount = pFile.pageCount || 100;
const shouldSendBase64 = !finalHasText || pCount <= 15;
if (shouldSendBase64) {
    contentsParts.push({inlineData:{mimeType:pFile.mimeType||"application/pdf",data:cleanBase64}});
}
}}"""

text = pattern.sub(replacement, text)

# Also fix the one in /api/audit-assessor-draft if it has the same flaw.
# Actually, I checked earlier, /api/audit-assessor-draft already has:
# const shouldSendBase64=!hasExtractedText||pageCount<=15;

with open('server.ts', 'w') as f:
    f.write(text)
print("Patched PDF base64 push logic!")
