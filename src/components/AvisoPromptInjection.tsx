import React from "react";
import { rotuloLocal } from "../utils/promptInjection";

type Achado = { nivel: "alto" | "medio"; categoria: string; trecho: string; pagina?: number; movimentacao?: number; arquivo?: number; documento?: string; posicao: number };
export interface InfoInjecao { verificado?: boolean; caracteres?: number; total: number; alto: number; medio: number; achados: Achado[] }

// Tarja fixa sobre a varredura de "prompt injection" nos autos: VERMELHA com o local de cada indício; VERDE quando nada foi encontrado.
export function AvisoPromptInjection({ info }: { info: InfoInjecao }) {
  if (info.verificado === false) return null;
  if (!info.total) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-2.5 bg-emerald-50 text-emerald-950 rounded-lg text-xs font-sans shadow-xs border-2 border-emerald-500" data-testid="aviso-prompt-injection-ok">
        <span className="font-bold text-emerald-800">✅ Varredura de prompt injection: nada encontrado.</span>{" "}
        Os autos analisados{info.caracteres ? ` (${Math.round(info.caracteres / 1000)} mil caracteres)` : ""} não contêm trechos que tentem dar ordens à inteligência artificial. Liberado.
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-3 bg-red-50 text-red-950 rounded-lg text-xs font-sans shadow-xs border-2 border-red-500" data-testid="aviso-prompt-injection">
      <div className="font-bold text-sm text-red-800 mb-1">🚨 Alerta: possível tentativa de manipular a IA nos autos (prompt injection)</div>
      <p className="leading-relaxed">
        O sistema encontrou {info.total} trecho(s) nos autos que parecem dar ordens à inteligência artificial que lê o processo
        {info.alto > 0 ? ` (${info.alto} de indício forte${info.medio > 0 ? `, ${info.medio} de indício moderado` : ""})` : " (indício moderado)"}.
        A IA foi instruída a tratá-los apenas como conteúdo do processo e <strong>a não obedecê-los</strong>. <strong>Confira com atenção redobrada</strong> os locais abaixo; a avaliação sobre a conduta da parte cabe ao magistrado.
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {info.achados.slice(0, 10).map((a, i) => (
          <li key={i} className="leading-relaxed">
            <strong>{rotuloLocal(a) || "Local não identificado no texto"}</strong> — {a.categoria}{a.nivel === "medio" ? " (moderado)" : ""}:{" "}
            <span className="italic break-words">“{a.trecho.slice(0, 220)}”</span>
          </li>
        ))}
      </ul>
      {info.achados.length > 10 && <p className="mt-1">… e mais {info.achados.length - 10} indício(s).</p>}
      <p className="mt-1.5 text-red-900">A localização usa os marcadores mais próximos antes do trecho (movimentação, arquivo, página). O detector usa regras objetivas e pode acusar texto legítimo (por exemplo, um debate jurídico sobre IA); se for o caso, ignore o alerta.</p>
    </div>
  );
}
