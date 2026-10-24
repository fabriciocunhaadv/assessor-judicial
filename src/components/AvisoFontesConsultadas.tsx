import React from "react";
import type { FontesConsultadas } from "../types";

// Mostra, junto da minuta, o que o sistema realmente consultou: artigos conferidos no texto oficial do Planalto, súmulas/teses aplicadas e o que NÃO pôde ser conferido.
export function AvisoFontesConsultadas({ info }: { info: FontesConsultadas }) {
  const n = (l?: string[]) => (l || []).length;
  if (!n(info.legislacao) && !n(info.precedentes) && !n(info.naoLocalizados) && !n(info.indisponiveis) && !n(info.locais)) return null;
  const alerta = n(info.naoLocalizados) + n(info.indisponiveis) + n(info.locais) > 0;
  return (
    <div className={`max-w-4xl mx-auto px-4 py-2.5 rounded-lg text-xs font-sans shadow-xs border-2 ${alerta ? "bg-amber-50 text-amber-950 border-amber-400" : "bg-emerald-50 text-emerald-950 border-emerald-500"}`} data-testid="aviso-fontes">
      <div className="font-bold">📚 Fontes consultadas nesta minuta</div>
      {n(info.legislacao) > 0 && <p className="mt-1 leading-relaxed"><strong>Legislação conferida no Planalto:</strong> {info.legislacao.join("; ")}.</p>}
      {n(info.precedentes) > 0 && <p className="mt-1 leading-relaxed"><strong>Súmulas, teses e informativos aplicáveis:</strong> {info.precedentes.slice(0, 8).join("; ")}.</p>}
      {n(info.naoLocalizados) > 0 && <p className="mt-1 leading-relaxed"><strong>Não localizado no texto oficial (confira o número):</strong> {info.naoLocalizados.join("; ")}.</p>}
      {n(info.indisponiveis) > 0 && <p className="mt-1 leading-relaxed"><strong>Não consegui consultar agora:</strong> {info.indisponiveis.join("; ")}. Confira estes dispositivos manualmente.</p>}
      {n(info.locais) > 0 && <p className="mt-1 leading-relaxed"><strong>Leis municipais/estaduais citadas (texto não consultado):</strong> {info.locais.join("; ")}. Confira o teor nos autos.</p>}
      {!n(info.legislacao) && !n(info.naoLocalizados) && !n(info.indisponiveis) && <p className="mt-1 leading-relaxed text-emerald-900/80">Nenhum artigo de lei federal foi citado nos autos para conferir no Planalto.</p>}
    </div>
  );
}
