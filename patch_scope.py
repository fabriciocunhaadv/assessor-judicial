import re

with open('server.ts', 'r') as f:
    text = f.read()

target = "const finalHasText = hasExtractedText || (typeof bufferText !== 'undefined' && bufferText && bufferText.trim().length > 20);"
replacement = "const finalHasText = hasExtractedText || (accumulatedPdfText.length > 1000);"
text = text.replace(target, replacement)

with open('server.ts', 'w') as f:
    f.write(text)
print("Patched scope issue!")
