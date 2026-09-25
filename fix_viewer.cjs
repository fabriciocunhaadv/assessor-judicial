const fs = require('fs');
let code = fs.readFileSync('src/components/MinuteViewer.tsx', 'utf8');

const regexRelatorio = /\{\(originalMinute\.relatorio \|\| "Dispensado o relatório nos termos do art\. 38 da Lei nº 9\.099\/95\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, idx\) => \(\s*<div key=\{idx\} className="text-justify indent-8 text-slate-800 leading-relaxed"><ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\s*\{paragrafo\}\s*<\/ReactMarkdown><\/div>\s*\)\)\}/g;
const replaceRelatorio = `<div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(originalMinute.relatorio || "Dispensado o relatório nos termos do art. 38 da Lei nº 9.099/95.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

const regexFund = /\{\(originalMinute\.fundamentacao \|\| "Fundamentação jurídica nos autos\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, idx\) => \(\s*<div key=\{idx\} className="text-justify indent-8 text-slate-800 leading-relaxed"><ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\s*\{paragrafo\}\s*<\/ReactMarkdown><\/div>\s*\)\)\}/g;
const replaceFund = `<div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(originalMinute.fundamentacao || "Fundamentação jurídica nos autos.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

const regexDisp = /\{\(originalMinute\.dispositivo \|\| "Dispositivo do ato judicial\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, idx\) => \(\s*<div key=\{idx\} className="text-justify indent-8 text-slate-900 leading-relaxed font-medium"><ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\s*\{paragrafo\}\s*<\/ReactMarkdown><\/div>\s*\)\)\}/g;
const replaceDisp = `<div className="text-justify text-slate-900 leading-relaxed font-medium markdown-body bg-transparent"><ReactMarkdown>{(originalMinute.dispositivo || "Dispositivo do ato judicial.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

code = code.replace(regexRelatorio, replaceRelatorio);
code = code.replace(regexFund, replaceFund);
code = code.replace(regexDisp, replaceDisp);

// Also fix the Chat panel inline replacements
const regexMsgRel = /\{\(msg\.updatedMinute\.relatorio \|\| minute\.relatorio \|\| "Dispensado o relatório nos termos do art\. 38 da Lei nº 9\.099\/95\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, pIdx\) => \(\s*<div key=\{pIdx\} className="text-justify indent-4 text-slate-800 leading-relaxed"><ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\{paragrafo\}<\/ReactMarkdown><\/div>\s*\)\)\}/g;
const repMsgRel = `<div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(msg.updatedMinute.relatorio || minute.relatorio || "Dispensado o relatório nos termos do art. 38 da Lei nº 9.099/95.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

const regexMsgFund = /\{\(msg\.updatedMinute\.fundamentacao \|\| minute\.fundamentacao \|\| "Fundamentação jurídica nos autos\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, pIdx\) => \(\s*<div key=\{pIdx\} className="text-justify indent-4 text-slate-800 leading-relaxed"><ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\{paragrafo\}<\/ReactMarkdown><\/div>\s*\)\)\}/g;
const repMsgFund = `<div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(msg.updatedMinute.fundamentacao || minute.fundamentacao || "Fundamentação jurídica nos autos.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

const regexMsgDisp = /\{\(msg\.updatedMinute\.dispositivo \|\| minute\.dispositivo \|\| "Dispositivo do ato judicial\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, pIdx\) => \(\s*<div key=\{pIdx\} className="text-justify indent-4 text-slate-950 font-semibold leading-relaxed bg-emerald-50\/50 p-1\.5 rounded border-l-2 border-slate-800"><ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\{paragrafo\}<\/ReactMarkdown><\/div>\s*\)\)\}/g;
const repMsgDisp = `<div className="text-justify text-slate-950 font-semibold leading-relaxed bg-emerald-50/50 p-1.5 rounded border-l-2 border-slate-800 markdown-body bg-transparent"><ReactMarkdown>{(msg.updatedMinute.dispositivo || minute.dispositivo || "Dispositivo do ato judicial.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

code = code.replace(regexMsgRel, repMsgRel);
code = code.replace(regexMsgFund, repMsgFund);
code = code.replace(regexMsgDisp, repMsgDisp);

fs.writeFileSync('src/components/MinuteViewer.tsx', code);
console.log("MinuteViewer.tsx updated for full Markdown rendering");
