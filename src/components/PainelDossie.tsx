import React, { useEffect, useState } from "react";
import { gerenteGigantes } from "../utils/gigantes/gerente";
import type { JobGig } from "../utils/gigantes/db";

// Faixa de andamento do dossiê que a Lupa e a Mesa esperam: mostra etapa e porcentagem e avisa quando estiver pronto.
export function PainelDossie({ jobId, onPronto, rotuloPronto }: { jobId: string; onPronto?: () => void; rotuloPronto?: string }) {
  const [job, setJob] = useState<JobGig | null>(null);
  useEffect(() => {
    let avisou = false;
    return gerenteGigantes.inscrever((lista) => {
      const j = lista.find((x) => x.id === jobId) || null; setJob(j ? { ...j } : null);
      if (j && j.status === "concluido" && !avisou) { avisou = true; onPronto?.(); }
    });
  }, [jobId]);
  if (!job) return null;
  const pct = job.progresso.total > 0 ? Math.round((job.progresso.feitas / job.progresso.total) * 100) : 0;
  const pronto = job.status === "concluido", falhou = job.status === "erro" || job.status === "cancelado";
  return (
    <div className={`p-3 rounded-xl border-2 text-xs space-y-1.5 ${pronto ? "bg-emerald-50 border-emerald-400 text-emerald-900" : falhou ? "bg-red-50 border-red-400 text-red-900" : "bg-sky-50 border-sky-400 text-sky-900"}`} data-testid="painel-dossie">
      <div className="font-black">{pronto ? `✅ Dossiê pronto${rotuloPronto ? `: ${rotuloPronto}` : ""}` : falhou ? "⚠️ O dossiê não foi concluído" : `📚 Preparando o dossiê (${job.totalPaginas || "…"} páginas) — ${pct}%`}</div>
      {!pronto && !falhou && <div className="h-1.5 bg-sky-200 rounded-full overflow-hidden"><div className="h-full bg-sky-600 transition-all" style={{ width: `${pct}%` }} /></div>}
      <div>{job.erro || job.etapa}</div>
      <div className="flex gap-2 flex-wrap">
        {(job.status === "erro" || job.status === "pausado") && job.lotes.length > 0 && <button onClick={() => gerenteGigantes.retomar(job.id)} className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold cursor-pointer">Retomar</button>}
        <button onClick={() => window.dispatchEvent(new CustomEvent("gigantes:abrir"))} className="px-2 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-bold cursor-pointer">Abrir o painel “Gigantes”</button>
      </div>
    </div>
  );
}
