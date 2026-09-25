const fs = require('fs');
let code = fs.readFileSync('src/components/ProcessTimelineModal.tsx', 'utf8');

if (!code.includes("import ReactMarkdown from 'react-markdown';")) {
    code = code.replace("import { motion } from 'motion/react';", "import { motion } from 'motion/react';\nimport ReactMarkdown from 'react-markdown';");
}

const target = `<div className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-300">\n                          {act.result?.minute?.fullFormattedText || "Sem texto formatado."}\n                        </div>`;

const repl = `<div className="leading-relaxed text-[11px] text-slate-300 markdown-body bg-transparent" style={{'--color-fg-default': '#cbd5e1'} as React.CSSProperties}>\n                          <ReactMarkdown>{act.result?.minute?.fullFormattedText || "Sem texto formatado."}</ReactMarkdown>\n                        </div>`;

code = code.replace(target, repl);
fs.writeFileSync('src/components/ProcessTimelineModal.tsx', code);
console.log("ProcessTimelineModal updated");
