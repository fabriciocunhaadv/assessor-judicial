import React from "react";
import { LIMITE_PAGINAS_GIGANTE } from "../utils/gigantes/gerente";
import { CorteInfo, textoDoCorte } from "../utils/corteAutos";

const n = (v: number) => v.toLocaleString("pt-BR");

// Pergunta, antes de uma análise normal, o que fazer com autos que passam do limite da análise normal.
export function GiganteDialog({ paginas, tokens, corte, onEscolha }: { paginas: number; tokens: number; corte?: CorteInfo | null; onEscolha: (e: "lotes" | "normal" | "cancelar") => void }) {
  const acima = paginas > LIMITE_PAGINAS_GIGANTE;
  return (
    <div className="fixed inset-0 z-[100000] flex items-start sm:items-center justify-center p-3 bg-black/60 overflow-y-auto" data-testid="dialogo-gigante">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3 text-slate-800 my-2">
        <h2 className="text-base font-black text-sky-800">📚 {acima ? "Processo muito grande" : "Processo gigante"}: {paginas ? `${n(paginas)} páginas` : "autos muito extensos"}</h2>
        <p className="text-xs leading-relaxed">
          Os autos têm cerca de <strong>{n(Math.round(tokens / 1000))} mil tokens</strong>, mais do que a análise normal consegue ler de uma vez.
        </p>

        {acima ? (
          <div className="text-xs bg-red-50 border border-red-300 rounded-lg p-3 space-y-1.5" data-testid="gigante-acima-limite">
            <p className="font-bold text-red-800">A leitura em lotes desta versão aceita até {n(LIMITE_PAGINAS_GIGANTE)} páginas por vez (somando todos os PDFs anexados). Este processo tem {n(paginas)}: {n(paginas - LIMITE_PAGINAS_GIGANTE)} a mais.</p>
            <p className="font-bold text-slate-800">O que fazer para conseguir:</p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-700">
              <li><strong>Reduza os autos para até {n(LIMITE_PAGINAS_GIGANTE)} páginas</strong>: tire do PDF os volumes que são só anexos (documentos pessoais, extratos, comprovantes, fotos) e mantenha petição inicial, contestação, réplica, decisões, laudos e as provas do mérito. Clique em “Remover todos”, anexe o PDF reduzido e gere de novo.</li>
              <li><strong>Ou divida em partes</strong> de até {n(LIMITE_PAGINAS_GIGANTE)} páginas (por volumes ou por períodos) e processe cada parte separadamente: cada uma gera uma minuta no Histórico. Comece pela parte que tem a inicial, a contestação e as decisões.</li>
              <li><strong>Ou aguarde a próxima fase</strong>, que lerá acima de {n(LIMITE_PAGINAS_GIGANTE)} páginas com várias chaves ou faturamento ativo e execução em servidor.</li>
            </ol>
          </div>
        ) : (
          <p className="text-xs leading-relaxed">
            Na <strong>leitura em lotes</strong>, o sistema lê todas as páginas em partes, funde as fichas e redige a minuta em segundo plano, sem travar as outras análises. O resultado vai para o Histórico.
          </p>
        )}

        <div className="space-y-2">
          {!acima && (
            <button onClick={() => onEscolha("lotes")} className="w-full text-left p-3 rounded-xl border-2 border-sky-500 bg-sky-50 hover:bg-sky-100 cursor-pointer" data-testid="gigante-lotes">
              <div className="text-xs font-black text-sky-800">📚 Ler em lotes, em segundo plano (recomendado)</div>
              <div className="text-[11px] text-slate-600">Lê o processo inteiro. Pode levar de minutos a horas conforme o tamanho e a cota da chave. Acompanhe pelo selo “Gigantes”.</div>
            </button>
          )}
          <button onClick={() => onEscolha("normal")} className="w-full text-left p-3 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 cursor-pointer" data-testid="gigante-normal">
            <div className="text-xs font-black text-amber-900">➡️ Tentar a análise normal mesmo assim (parte dos autos NÃO será lida)</div>
            <div className="text-[11px] text-slate-700 space-y-1 mt-0.5">
              <p>Mais rápida, mas o sistema só lê até o limite e <strong>corta o restante</strong>. Se você continuar:</p>
              {corte && corte.cortou && corte.cortes.length > 0 ? (
                <ul className="list-disc pl-5" data-testid="gigante-corte-estimado">
                  {corte.cortes.map((c, i) => <li key={i}><strong>NÃO será lido (estimativa):</strong> {textoDoCorte(c)}</li>)}
                  <li>Cerca de {corte.lidoPct}% do texto será lido.</li>
                </ul>
              ) : (
                <p>O final dos autos ficará de fora.</p>
              )}
              <p>Ao terminar, a minuta traz um aviso vermelho com <strong>exatamente quais páginas ficaram de fora</strong>, e a IA é instruída a não afirmar “não há prova” por causa delas.</p>
            </div>
          </button>
          <button onClick={() => onEscolha("cancelar")} className="w-full text-center text-[11px] text-slate-500 underline cursor-pointer pt-1">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
