const fs = require('fs');
let code = fs.readFileSync('src/components/MinuteAuditorModal.tsx', 'utf8');

if (!code.includes("import ReactMarkdown from 'react-markdown';")) {
    code = code.replace("import { motion } from 'motion/react';", "import { motion } from 'motion/react';\nimport ReactMarkdown from 'react-markdown';");
}

const targetTextarea = `<textarea\n                        readOnly\n                        value={systemGeneratedMinute || auditResult?.systemGeneratedMinute || "Nenhuma minuta ideal foi gerada para esta análise."}\n                        className="w-full h-full min-h-[420px] p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 shadow-inner resize-y leading-relaxed focus:outline-none"\n                      />`;

const replDiv = `<div className="w-full h-full min-h-[420px] max-h-[600px] overflow-y-auto p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 shadow-inner leading-relaxed markdown-body" style={{'--color-fg-default': '#cbd5e1'} as React.CSSProperties}>\n                        <ReactMarkdown>\n                          {systemGeneratedMinute || auditResult?.systemGeneratedMinute || "Nenhuma minuta ideal foi gerada para esta análise."}\n                        </ReactMarkdown>\n                      </div>`;

if (code.includes(targetTextarea)) {
    code = code.replace(targetTextarea, replDiv);
    fs.writeFileSync('src/components/MinuteAuditorModal.tsx', code);
    console.log("MinuteAuditorModal updated");
} else {
    console.log("Target not found in MinuteAuditorModal");
}
