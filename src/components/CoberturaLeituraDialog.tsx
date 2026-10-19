import React from "react";

export interface LacunaArquivo {
  nome: string;
  total: number;
  paginas: number[];
}

interface Props {
  lacunas: LacunaArquivo[];
  progresso: { feitas: number; total: number; etapa: string } | null;
  onEscolha: (e: "ocr" | "visual" | "seguir" | "cancelar") => void;
}

const LIMITE_VISUAL = 30;

const faixa = (nums: number[]): string => {
  const v = [...nums].sort((a, b) => a - b);
  const out: string[] = [];
  let i = 0;
  while (i < v.length) {
    let j = i;
    while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++;
    out.push(j > i ? `${v[i]}-${v[j]}` : `${v[i]}`);
    i = j + 1;
  }
  return out.join(", ");
};

// Confirmação antes de analisar autos com páginas que o sistema não conseguiu ler (não bloqueia: o usuário decide).
export function CoberturaLeituraDialog({ lacunas, progresso, onEscolha }: Props) {
  const qtd = lacunas.reduce((n, l) => n + l.paginas.length, 0);
  const total = lacunas.reduce((n, l) => n + l.total, 0);
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 bg-black/60" data-testid="dialogo-cobertura">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 space-y-3 text-slate-800">
        <h2 className="text-base font-black text-slate-800">📄 {qtd} página(s) dos autos são imagem (escaneadas ou fotos)</h2>
        <p className="text-xs leading-relaxed">
          O sistema leu o texto dos autos, mas <strong>{qtd} de {total} páginas</strong> são imagem (escaneadas ou fotos), sem texto para ler.
          Para não perder nenhuma prova, o sistema pode transcrevê-las antes de minutar.
        </p>
        <ul className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-0.5 max-h-32 overflow-y-auto">
          {lacunas.map((l, i) => (
            <li key={i}><strong>{l.nome}</strong>: págs. {faixa(l.paginas)} ({l.paginas.length} de {l.total})</li>
          ))}
        </ul>
        {progresso ? (
          <div className="space-y-1.5 py-2" data-testid="cobertura-progresso">
            <div className="text-xs font-semibold">{progresso.etapa} {progresso.feitas}/{progresso.total}</div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.round((progresso.feitas / Math.max(1, progresso.total)) * 100)}%` }} /></div>
            <p className="text-[11px] text-slate-500">Aguarde: a leitura das imagens usa a IA e pode levar alguns minutos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={() => onEscolha("ocr")} className="w-full text-left p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 cursor-pointer" data-testid="cobertura-ocr">
              <div className="text-xs font-black text-emerald-800">📝 Fazer OCR dessas páginas (recomendado)</div>
              <div className="text-[11px] text-slate-600">A IA transcreve o texto das {qtd} páginas e ele entra nos autos lidos. Serve para qualquer quantidade de páginas.</div>
            </button>
            <button onClick={() => onEscolha("visual")} className="w-full text-left p-3 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 cursor-pointer" data-testid="cobertura-visual">
              <div className="text-xs font-black text-indigo-800">👁️ Leitura visual direta pela IA</div>
              <div className="text-[11px] text-slate-600">As páginas vão como imagem junto com a análise, útil para fotos e manuscritos. Até {LIMITE_VISUAL} páginas{qtd > LIMITE_VISUAL ? ` (as outras ${qtd - LIMITE_VISUAL} seguiriam sem leitura)` : ""}.</div>
            </button>
            <button onClick={() => onEscolha("seguir")} className="w-full text-left p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer" data-testid="cobertura-seguir">
              <div className="text-xs font-black text-slate-700">➡️ Continuar assim mesmo</div>
              <div className="text-[11px] text-slate-600">A minuta sairá com aviso vermelho e sem decidir por ausência de prova nessas páginas.</div>
            </button>
            <button onClick={() => onEscolha("cancelar")} className="w-full text-center text-[11px] text-slate-500 underline cursor-pointer pt-1">Cancelar a análise</button>
          </div>
        )}
      </div>
    </div>
  );
}
