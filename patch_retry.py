import re

with open('server.ts', 'r') as f:
    text = f.read()

# I want to replace the `generateWithFallbackAndRetry` function body to allow up to 15 retries for 503, and wait longer.
# Let's find the candidateModels line:
# const candidateModels=[preferredPrimary,"gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash"];

target = 'const candidateModels=[preferredPrimary,"gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash","gemini-3.8-flash"];'
replacement = 'const candidateModels=[preferredPrimary, "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash"];'

text = text.replace(target, replacement)

# Let's also increase the wait times for 503 so it actually gives the server a breather.
# waitMs=Math.min(10000,Math.round(2000*Math.pow(2,exponent)+Math.random()*1000))
# Let's change it to:
target2 = 'waitMs=Math.min(10000,Math.round(2000*Math.pow(2,exponent)+Math.random()*1000))'
replacement2 = 'waitMs=Math.min(25000,Math.round(5000*Math.pow(1.5,exponent)+Math.random()*3000))'

text = text.replace(target2, replacement2)

# Also let's change the rate limit wait to be more generous to prevent exhaustion.
# waitMs=Math.min(15000,Math.round(3000*Math.pow(2,exponent)+Math.random()*1500))
target3 = 'waitMs=Math.min(15000,Math.round(3000*Math.pow(2,exponent)+Math.random()*1500))'
replacement3 = 'waitMs=Math.min(30000,Math.round(5000*Math.pow(1.5,exponent)+Math.random()*2000))'

text = text.replace(target3, replacement3)

with open('server.ts', 'w') as f:
    f.write(text)
print("Patched retries!")
