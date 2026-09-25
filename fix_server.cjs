const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const missingCode = `
const SYSTEM_INSTRUCTION_FABRICIO = \`Voc\u00EA \u00E9 um Magistrado e Assessor Judicial especializado e de alt\u00EDssima performance.
Sua fun\u00E7\u00E3o \u00E9 elaborar minutas de decis\u00F5es judiciais estruturadas, diretas e precisas, fundamentadas apenas nas informa\u00E7\u00F5es reais dos autos.\`;

function getActiveCabinetTeses(cabinetTesesText, isTesesEnabled) {
    if (!isTesesEnabled) return "";
    return cabinetTesesText || "";
}
`;

if (!serverCode.includes("SYSTEM_INSTRUCTION_FABRICIO =")) {
    serverCode = serverCode.replace('const app = express();', missingCode + '\nconst app = express();');
}

fs.writeFileSync('server.ts', serverCode);
console.log("Fixed server.ts");
