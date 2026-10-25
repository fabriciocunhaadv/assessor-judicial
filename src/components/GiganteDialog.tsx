import React from "react";
import { LIMITE_PAGINAS_GIGANTE } from "../utils/gigantes/gerente";
import { CorteInfo, textoDoCorte } from "../utils/corteAutos";
import { quantasPartes } from "../utils/gigantes/partes";

export type EscolhaGigante = "lotes" | "partes" | "limpar" | "normal" | "cancelar";
const n = (v: number) => v.toLocaleString("pt-BR");

// Pergunta, antes da análise normal, o que fazer com autos que passam do limite dessa análise.
export function GiganteDialog({ paginas, tokens, corte, lento, onEscolha }: { paginas: number; tokens: number; corte?: CorteInfo | null; lento?: boolean; onEscolha: (e: EscolhaGigante) => void }) {
  const acima = paginas > LIMITE_PAGINAS_GIGANTE;
  const k = quantasPartes(paginas, LIMITE_PAGINAS_GIGANTE);
  const porParte = Math.ceil(paginas / k);

  const cortado = corte && corte.cortou && corte.cortes.length > 0 ? (
    <ul className="list-disc pl-5" data-testid="gigante-corte-estimado">
      {corte.cortes.map((c, i) => <li key={i}><strong>NÃO será lido (estimativa):</strong> {textoDoCorte(c)}</li>)}
      <li>Cerca de {corte.lidoPct}% do texto será lido.</li>
    </ul>
  ) : <p>O final dos autos ficará de fora.</p>;

  return (
    <div className="fixed inset-0 z-[100000] flex items-start sm:items-center justify-center p-3 bg-black/60 overflow-y-auto" data-testid="dialogo-gigante">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3 text-slate-800 my-2">
        <h2 className="text-base font-black text-sky-800">📚 {lento ? "Processo grande para o Turbo" : acima ? "Processo muito grande" : "Processo gigante"}: {paginas ? `${n(paginas)} páginas` : "autos muito extensos"}</h2>
        {lento ? (
          <p className="text-xs leading-relaxed" data-testid="gigante-lento">
            O Turbo é feito para decisões rápidas (a faixa ideal é de 80 a 100 páginas). Estes autos têm cerca de <strong>{n(Math.round(tokens / 1000))} mil tokens</strong>: o Turbo pode levar <strong>vários minutos</strong> (a chave gratuita do Gemini obriga a esperar a janela de cota) e ocupa a tela. A leitura em lotes lê tudo em segundo plano, sem travar você, e a minuta vai para o Histórico. Escolha como quer prosseguir:
          </p>
        ) : (
          <p className="text-xs leading-relaxed">
            Os autos têm cerca de <strong>{n(Math.round(tokens / 1000))} mil tokens</strong>, mais do que a análise normal consegue ler de uma vez. Escolha como quer prosseguir:
          </p>
        )}

        {acima && (
          <p className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-lg p-2" data-testid="gigante-acima-limite">
            A leitura em lotes lê até {n(LIMITE_PAGINAS_GIGANTE)} páginas por vez. Este processo tem {n(paginas)} ({n(paginas - LIMITE_PAGINAS_GIGANTE)} a mais), então ele não pode ser lido em um único trabalho.
          </p>
        )}

        <div className="space-y-2">
          {!acima && (
            <button onClick={() => onEscolha("lotes")} className="w-full text-left p-3 rounded-xl border-2 border-sky-500 bg-sky-50 hover:bg-sky-100 cursor-pointer" data-testid="gigante-lotes">
              <div className="text-xs font-black text-sky-800">📚 Ler em lotes, em segundo plano (recomendado)</div>
              <div className="text-[11px] text-slate-600">Lê o processo inteiro, sem travar as outras análises. Pode levar de minutos a horas conforme o tamanho e a cota da chave. Acompanhe pelo selo “Gigantes”; o resultado vai para o Histórico.</div>
            </button>
          )}

          {acima && (
            <>
              <button onClick={() => onEscolha("partes")} className="w-full text-left p-3 rounded-xl border-2 border-sky-500 bg-sky-50 hover:bg-sky-100 cursor-pointer" data-testid="gigante-partes">
                <div className="text-xs font-black text-sky-800">✂️ Dividir automaticamente em {k} partes e ler em lotes (recomendado)</div>
                <div className="text-[11px] text-slate-600">O sistema divide os autos em {k} partes de cerca de {n(porParte)} páginas e lê uma parte por vez, em segundo plano. <strong>Cada parte gera uma minuta no Histórico</strong>, com aviso de quais páginas ela cobre. Comece lendo a minuta da parte que tem a inicial, a contestação e as decisões.</div>
              </button>
              <button onClick={() => onEscolha("limpar")} className="w-full text-left p-3 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 cursor-pointer" data-testid="gigante-limpar">
                <div className="text-xs font-black text-sky-800">🗑️ Remover os PDFs e anexar uma versão reduzida</div>
                <div className="text-[11px] text-slate-600">Tire do PDF os volumes que são só anexos (documentos pessoais, extratos, comprovantes, fotos) e mantenha petição inicial, contestação, réplica, decisões, laudos e provas do mérito, até {n(LIMITE_PAGINAS_GIGANTE)} páginas. Este botão apaga os anexos atuais para você enviar o novo arquivo.</div>
              </button>
            </>
          )}

          <button onClick={() => onEscolha("normal")} className="w-full text-left p-3 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 cursor-pointer" data-testid="gigante-normal">
            <div className="text-xs font-black text-amber-900">{lento ? "➡️ Rodar no Turbo mesmo assim (pode demorar vários minutos)" : "➡️ Tentar a análise normal mesmo assim (parte dos autos NÃO será lida)"}</div>
            <div className="text-[11px] text-slate-700 space-y-1 mt-0.5">
              {lento ? <p>O Turbo lê os autos de uma vez, dividindo o pedido se passar do limite da chave. Fique com a tela aberta até terminar (a espera máxima é de 13 minutos).</p> : (<>
              <p>Mais rápida, mas o sistema só lê até o limite e <strong>corta o restante</strong>. Se você continuar:</p>
              {cortado}
              <p>Ao terminar, a minuta traz um aviso vermelho com <strong>exatamente quais páginas ficaram de fora</strong>, e a IA é instruída a não afirmar “não há prova” por causa delas.</p></>)}
            </div>
          </button>
          <button onClick={() => onEscolha("cancelar")} className="w-full text-center text-[11px] text-slate-500 underline cursor-pointer pt-1">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
