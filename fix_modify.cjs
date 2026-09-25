const fs = require('fs');

for (const file of ['modify_route.cjs', 'clean_patch.cjs']) {
    if (fs.existsSync(file)) {
        let code = fs.readFileSync(file, 'utf8');
        code = code.replace(/responseSchema:\s*\$\{originalCall\.match[\s\S]*?\}/g, '/* removed empty schema */');
        code = code.replace(/responseSchema:\s*\{\s*type:\s*Type\.OBJECT\s*\}/g, '/* removed empty schema */');
        fs.writeFileSync(file, code);
    }
}
