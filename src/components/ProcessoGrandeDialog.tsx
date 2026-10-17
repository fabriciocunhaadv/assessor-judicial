import React from "react";
import { LIMITE_PAGINAS_GIGANTE } from "../utils/gigantes/gerente";
import { CorteInfo, textoDoCorte } from "../utils/corteAutos";

export type EscolhaDossie = "preparar" | "normal" | "cancelar";
const n = (v: number) => v.toLocaleString("pt-BR");

const MODULO = {
  lupa: { nome: "a Lupa do Magistrado", tarefa: "audita a minuta", depois: "Quando ficar pronto, clique em Auditar de novo: a Lupa usa o dossiê." },
  mesa: { nome: "a Mesa de Audiência", tarefa: "monta o briefing, as questões e a ata", depois: "Quando ficar pronto, a análise da Mesa roda sozinha com o dossiê." },
} as const;

// Para a Lupa e a Mesa: autos grandes demais para uma leitura só. Oferece preparar um dossiê (leitura em lotes, em segundo plano) e usá-lo depois.
export function ProcessoGrandeDialog({ modulo, paginas, tokens, corte, onEscolha }: { modulo: "lupa" | "mesa"; paginas: number; tokens: number; corte?: CorteInfo | null; onEscolha: (e: EscolhaDossie) => void }) {
  const m = MODULO[modulo];
  const acima = paginas > LIMITE_PAGINAS_GIGANTE;
  return (
    <div className="fixed inset-0 z-[100001] flex items-start sm:items-center justify-center p-3 bg-black/60 overflow-y-auto" data-testid="dialogo-processo-grande">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3 text-slate-800 my-2">
        <h2 className="text-base font-black text-sky-800">📚 Processo grande para {m.nome}: {paginas ? `${n(paginas)} páginas` : "autos muito extensos"}</h2>
        <p className="text-xs leading-relaxed">
          Os autos têm cerca de <strong>{n(Math.round(tokens / 1000))} mil tokens</strong>, mais do que {m.nome} consegue ler de uma vez.
          Para não perder partes do processo, o sistema pode <strong>preparar um dossiê</strong>: lê todas as páginas em lotes, em segundo plano, e guarda um resumo estruturado com a página de cada informação. Depois, {m.nome} {m.tarefa} usando o dossiê.
        </p>
        {acima && (
          <p className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-lg p-2" data-testid="processo-grande-acima">
            O dossiê desta versão cobre até {n(LIMITE_PAGINAS_GIGANTE)} páginas por vez. Este processo tem {n(paginas)}. Reduza os autos (tire os volumes que são só anexos: documentos pessoais, extratos, comprovantes) para até {n(LIMITE_PAGINAS_GIGANTE)} páginas e anexe de novo, ou continue sem o dossiê (com corte).
          </p>
        )}
        <div className="space-y-2">
          {!acima && (
            <button onClick={() => onEscolha("preparar")} className="w-full text-left p-3 rounded-xl border-2 border-sky-500 bg-sky-50 hover:bg-sky-100 cursor-pointer" data-testid="processo-grande-preparar">
              <div className="text-xs font-black text-sky-800">📚 Preparar o dossiê em lotes, em segundo plano (recomendado)</div>
              <div className="text-[11px] text-slate-600">Pode levar de minutos a horas conforme o tamanho e a cota da chave. Acompanhe pelo selo “Gigantes” e pelo aviso neste módulo. {m.depois}</div>
            </button>
          )}
          <button onClick={() => onEscolha("normal")} className="w-full text-left p-3 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 cursor-pointer" data-testid="processo-grande-normal">
            <div className="text-xs font-black text-amber-900">➡️ Continuar mesmo assim (parte dos autos NÃO será lida)</div>
            <div className="text-[11px] text-slate-700 space-y-1 mt-0.5">
              <p>{m.nome[0].toUpperCase() + m.nome.slice(1)} lê só até o limite e <strong>corta o restante</strong>; o pedido pode até falhar por tamanho.</p>
              {corte && corte.cortou && corte.cortes.length > 0 && (
                <ul className="list-disc pl-5">{corte.cortes.map((c, i) => <li key={i}><strong>NÃO será lido (estimativa):</strong> {textoDoCorte(c)}</li>)}</ul>
              )}
            </div>
          </button>
          <button onClick={() => onEscolha("cancelar")} className="w-full text-center text-[11px] text-slate-500 underline cursor-pointer pt-1">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
