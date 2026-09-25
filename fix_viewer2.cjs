const fs = require('fs');
let code = fs.readFileSync('src/components/MinuteViewer.tsx', 'utf8');

const regexRelatorio = /\{\(minute\.relatorio \|\| "Dispensado o relatório nos termos do art\. 38 da Lei nº 9\.099\/95\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, idx\) => \(\s*<div key=\{idx\} className="text-justify indent-8 text-slate-800 leading-relaxed">\s*<ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\s*\{paragrafo\}\s*<\/ReactMarkdown>\s*<\/div>\s*\)\)\}/g;
const replaceRelatorio = `<div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(minute.relatorio || "Dispensado o relatório nos termos do art. 38 da Lei nº 9.099/95.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

const regexFund = /\{\(minute\.fundamentacao \|\| "Fundamentação jurídica nos autos\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, idx\) => \(\s*<div key=\{idx\} className="text-justify indent-8 text-slate-800 leading-relaxed">\s*<ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\s*\{paragrafo\}\s*<\/ReactMarkdown>\s*<\/div>\s*\)\)\}/g;
const replaceFund = `<div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(minute.fundamentacao || "Fundamentação jurídica nos autos.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

const regexDisp = /\{\(minute\.dispositivo \|\| "Dispositivo do ato judicial\."\)\s*\.replace\(\/\\\\n\/g, '\\n'\)\.split\(\/\\n\+\/\)\s*\.filter\(\(p\) => p\.trim\(\)\.length > 0\)\s*\.map\(\(paragrafo, idx\) => \(\s*<div key=\{idx\} className="text-justify indent-8 text-slate-900 leading-relaxed font-medium">\s*<ReactMarkdown components=\{\{ p: \(\{node, \.\.\.props\}\) => <span className="block mb-2" \{\.\.\.props\} \/> \}\}>\s*\{paragrafo\}\s*<\/ReactMarkdown>\s*<\/div>\s*\)\)\}/g;
const replaceDisp = `<div className="text-justify text-slate-900 leading-relaxed font-medium markdown-body bg-transparent"><ReactMarkdown>{(minute.dispositivo || "Dispositivo do ato judicial.").replace(/\\\\n/g, '\\n')}</ReactMarkdown></div>`;

code = code.replace(regexRelatorio, replaceRelatorio);
code = code.replace(regexFund, replaceFund);
code = code.replace(regexDisp, replaceDisp);

fs.writeFileSync('src/components/MinuteViewer.tsx', code);
console.log("MinuteViewer.tsx updated for main minute");
