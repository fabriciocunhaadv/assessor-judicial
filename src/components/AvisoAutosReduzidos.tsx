import React from "react";
import type { GenerationResult } from "../types";

type Faixa = { de: number; ate: number; motivo: string };
const faixa = (x: Faixa) => (x.de === x.ate ? `${x.de}` : `${x.de}–${x.ate}`);

// Aviso fixo no topo da minuta quando os autos grandes foram reduzidos para caber no limite da chave gratuita.
export function AvisoAutosReduzidos({ info }: { info: NonNullable<GenerationResult["autosReduzidos"]> }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-3 bg-amber-50 text-amber-950 rounded-lg text-xs font-sans shadow-xs border-2 border-amber-400" data-testid="aviso-autos-reduzidos">
      <div className="font-bold text-sm text-amber-900 mb-1">⚠️ Autos muito grandes: a IA analisou uma versão reduzida do processo</div>
      <p className="leading-relaxed">
        Os autos têm cerca de <strong>{Math.round(info.tokensOriginais / 1000)} mil tokens</strong> ({info.paginasTotal} páginas) e passam do limite de entrada da chave gratuita do Google.
        A IA classificou as páginas por relevância para esta minuta: <strong>{info.essenciais} páginas essenciais foram mantidas integralmente</strong> (petições, decisões, certidões, laudos e provas do mérito).
      </p>
      {info.omitidas.length > 0 && (
        <p className="mt-1.5 leading-relaxed">
          <strong>Omitidas por não terem relevância para a minuta:</strong>{" "}
          {info.omitidas.slice(0, 40).map((x, i) => <span key={i}>{i > 0 ? "; " : ""}{faixa(x)}{x.motivo ? ` (${x.motivo})` : ""}</span>)}
          {info.omitidas.length > 40 ? `; … (+${info.omitidas.length - 40} trechos)` : ""}
        </p>
      )}
      {info.abreviadas.length > 0 && (
        <p className="mt-1.5 leading-relaxed">
          <strong>Abreviadas (documentos secundários, mantidos o começo e o fim):</strong>{" "}
          {info.abreviadas.slice(0, 40).map((x, i) => <span key={i}>{i > 0 ? "; " : ""}{faixa(x)}</span>)}
          {info.abreviadas.length > 40 ? `; … (+${info.abreviadas.length - 40} trechos)` : ""}
        </p>
      )}
      <p className="mt-1.5 leading-relaxed text-amber-900">Confira se alguma página omitida ou abreviada era importante para este caso. Para analisar os autos completos, use uma chave com faturamento ativado.</p>
    </div>
  );
}
