const fs = require('fs');

function addImport(file, importStmt) {
    let code = fs.readFileSync(file, 'utf8');
    if (!code.includes(importStmt)) {
        // add after the first import
        const firstImport = code.indexOf('import');
        if (firstImport !== -1) {
            const endOfFirstImport = code.indexOf('\n', firstImport);
            code = code.slice(0, endOfFirstImport + 1) + importStmt + '\n' + code.slice(endOfFirstImport + 1);
            fs.writeFileSync(file, code);
            console.log(`Added import to ${file}`);
        }
    }
}

addImport('src/components/MinuteAuditorModal.tsx', "import ReactMarkdown from 'react-markdown';");
addImport('src/components/ProcessTimelineModal.tsx', "import ReactMarkdown from 'react-markdown';");
