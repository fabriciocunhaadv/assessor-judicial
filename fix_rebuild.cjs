const fs = require('fs');
let content = fs.readFileSync('rebuild_server.cjs', 'utf8');

content = content.replace(/const SYSTEM_INSTRUCTION_FABRICIO = `.*?`;/s, 'const SYSTEM_INSTRUCTION_FABRICIO = "Voc\u00EA \u00E9 um Magistrado e Assessor Judicial especializado e de alt\u00EDssima performance. Sua fun\u00E7\u00E3o \u00E9 elaborar minutas de decis\u00F5es judiciais estruturadas, diretas e precisas, fundamentadas apenas nas informa\u00E7\u00F5es reais dos autos.";');

fs.writeFileSync('rebuild_server.cjs', content);
