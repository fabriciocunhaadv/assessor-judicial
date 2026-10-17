import React from "react";

// Pergunta, antes de uma análise normal, se os autos devem ser lidos em lotes em segundo plano (quando passam do limite da análise normal).
export function GiganteDialog({ paginas, tokens, onEscolha }: { paginas: number; tokens: number; onEscolha: (e: "lotes" | "normal" | "cancelar") => void }) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 bg-black/60" data-testid="dialogo-gigante">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3 text-slate-800">
        <h2 className="text-base font-black text-sky-800">📚 Processo gigante: {paginas ? `${paginas} páginas` : "autos muito extensos"}</h2>
        <p className="text-xs leading-relaxed">
          Os autos têm cerca de <strong>{Math.round(tokens / 1000)} mil tokens</strong>, mais do que a análise normal consegue ler: o <strong>final do processo seria cortado</strong>.
          Na leitura em lotes, o sistema lê tudo em partes, funde as fichas e redige a minuta, em segundo plano, sem travar as outras análises. O resultado vai para o Histórico.
        </p>
        <div className="space-y-2">
          <button onClick={() => onEscolha("lotes")} className="w-full text-left p-3 rounded-xl border-2 border-sky-500 bg-sky-50 hover:bg-sky-100 cursor-pointer" data-testid="gigante-lotes">
            <div className="text-xs font-black text-sky-800">📚 Ler em lotes, em segundo plano (recomendado)</div>
            <div className="text-[11px] text-slate-600">Pode levar de minutos a horas conforme o tamanho e a cota da chave. Acompanhe pelo selo “Gigantes”.</div>
          </button>
          <button onClick={() => onEscolha("normal")} className="w-full text-left p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer" data-testid="gigante-normal">
            <div className="text-xs font-black text-slate-700">➡️ Tentar a análise normal mesmo assim</div>
            <div className="text-[11px] text-slate-600">Mais rápida, mas o final dos autos pode ficar de fora.</div>
          </button>
          <button onClick={() => onEscolha("cancelar")} className="w-full text-center text-[11px] text-slate-500 underline cursor-pointer pt-1">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
