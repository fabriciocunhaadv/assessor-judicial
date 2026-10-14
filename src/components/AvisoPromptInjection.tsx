import React from "react";
import type { GenerationResult } from "../types";

// Aviso fixo (vermelho) no topo da minuta: os autos contêm trechos que tentam dar ordens à IA ("prompt injection").
export function AvisoPromptInjection({ info }: { info: NonNullable<GenerationResult["alertaInjecao"]> }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-3 bg-red-50 text-red-950 rounded-lg text-xs font-sans shadow-xs border-2 border-red-500" data-testid="aviso-prompt-injection">
      <div className="font-bold text-sm text-red-800 mb-1">🚨 Alerta: possível tentativa de manipular a IA nos autos (prompt injection)</div>
      <p className="leading-relaxed">
        O sistema encontrou {info.total} trecho(s) nos autos que parecem dar ordens à inteligência artificial que lê o processo
        {info.alto > 0 ? ` (${info.alto} de indício forte${info.medio > 0 ? `, ${info.medio} de indício moderado` : ""})` : " (indício moderado)"}.
        A IA foi instruída a tratá-los apenas como conteúdo do processo e <strong>a não obedecê-los</strong>. <strong>Confira a minuta com atenção redobrada</strong> e verifique as páginas indicadas; a avaliação sobre a conduta da parte cabe ao magistrado.
      </p>
      <ul className="mt-1.5 space-y-1">
        {info.achados.slice(0, 10).map((a, i) => (
          <li key={i} className="leading-relaxed">
            <strong>{a.pagina ? `Pág. ${a.pagina} — ` : ""}{a.categoria}</strong>{a.nivel === "medio" ? " (moderado)" : ""}: <span className="italic break-words">“{a.trecho.slice(0, 220)}”</span>
          </li>
        ))}
      </ul>
      {info.achados.length > 10 && <p className="mt-1">… e mais {info.achados.length - 10} indício(s).</p>}
      <p className="mt-1.5 text-red-900">Lembrete: o detector usa regras objetivas e pode acusar texto legítimo (por exemplo, um debate jurídico sobre IA). Se for o caso, ignore o alerta.</p>
    </div>
  );
}
