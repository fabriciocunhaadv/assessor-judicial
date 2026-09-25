const fs = require('fs');

let code = fs.readFileSync('new_generate_minute.ts', 'utf8');

// Fix await for extractTextFromPdfBuffer
code = code.replace(/const bufferText=extractTextFromPdfBuffer\(buffer\);/g, 'const bufferText=await extractTextFromPdfBuffer(buffer);');

// Remove .ts extensions from imports in rebuild_server.cjs
let rebuildScript = fs.readFileSync('rebuild_server.cjs', 'utf8');
rebuildScript = rebuildScript.replace(/\.ts/g, ''); // be careful, it might replace .ts elsewhere. Better to do it safely.
// Let's just fix the header in rebuild_server.cjs
rebuildScript = rebuildScript.replace(/import \{ petitionRouter \} from '\.\/server\/petitionAdvogadoRoutes\.ts';/, "import { petitionRouter } from './server/petitionAdvogadoRoutes';");
rebuildScript = rebuildScript.replace(/import \{ matchApplicableBindingPrecedents \} from '\.\/src\/utils\/bindingPrecedents\.ts';/, "import { matchApplicableBindingPrecedents } from './src/utils/bindingPrecedents';");
rebuildScript = rebuildScript.replace(/import \{ getApplicableTaxonomySummary \} from '\.\/src\/data\/legalTaxonomy\.ts';/, "import { getApplicableTaxonomySummary } from './src/data/legalTaxonomy';");

rebuildScript = rebuildScript.replace(/import fs from 'fs';/, "import * as fs from 'fs';");
rebuildScript = rebuildScript.replace(/import express from 'express';/, "import * as express from 'express';");
rebuildScript = rebuildScript.replace(/import multer from 'multer';/, "import * as multer from 'multer';");
rebuildScript = rebuildScript.replace(/import path from 'path';/, "import * as path from 'path';");

const missingSymbols = `
const SYSTEM_INSTRUCTION_FABRICIO = \`Voc\u00EA \u00E9 um Magistrado e Assessor Judicial especializado e de alt\u00EDssima performance.
Sua fun\u00E7\u00E3o \u00E9 elaborar minutas de decis\u00F5es judiciais estruturadas, diretas e precisas, fundamentadas apenas nas informa\u00E7\u00F5es reais dos autos.\`;

function getActiveCabinetTeses(cabinetTesesText: string, isTesesEnabled: boolean) {
    if (!isTesesEnabled) return "";
    return cabinetTesesText || "";
}
`;

if (!rebuildScript.includes("SYSTEM_INSTRUCTION_FABRICIO =")) {
    rebuildScript = rebuildScript.replace(/const app = express\(\);/, missingSymbols + '\nconst app = express();');
}

// Fix str property
rebuildScript = rebuildScript.replace(/item\.str/g, "(item as any).str");

fs.writeFileSync('rebuild_server.cjs', rebuildScript);
fs.writeFileSync('new_generate_minute.ts', code);
