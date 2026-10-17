import React, { useEffect, useRef, useState } from "react";
import { gerenteGigantes, ConfigGigante } from "../utils/gigantes/gerente";
import type { JobGig } from "../utils/gigantes/db";

const COR: Record<JobGig["status"], string> = {
  preparando: "bg-slate-200 text-slate-700", na_fila: "bg-slate-200 text-slate-700", lendo: "bg-indigo-100 text-indigo-800", fundindo: "bg-violet-100 text-violet-800",
  redigindo: "bg-amber-100 text-amber-800", concluido: "bg-emerald-100 text-emerald-800", erro: "bg-red-100 text-red-800", pausado: "bg-orange-100 text-orange-800", cancelado: "bg-slate-200 text-slate-500",
};
const ROTULO: Record<JobGig["status"], string> = {
  preparando: "Preparando", na_fila: "Na fila", lendo: "Lendo em lotes", fundindo: "Fundindo fichas", redigindo: "Redigindo a minuta", concluido: "Concluído", erro: "Erro", pausado: "Pausado", cancelado: "Cancelado",
};
const ATIVO = (s: JobGig["status"]) => ["preparando", "na_fila", "lendo", "fundindo", "redigindo"].includes(s);

// Selo fixo (canto inferior esquerdo) + painel dos processos gigantes lidos em lotes em segundo plano.
export function GigantesPanel({ config, onVerHistorico }: { config: ConfigGigante; onVerHistorico?: () => void }) {
  const [jobs, setJobs] = useState<JobGig[]>([]);
  const [aberto, setAberto] = useState(false);
  const arq = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void gerenteGigantes.carregar();
    const sair = gerenteGigantes.inscrever(setJobs);
    const abrir = () => setAberto(true);
    window.addEventListener("gigantes:abrir", abrir);
    return () => { sair(); window.removeEventListener("gigantes:abrir", abrir); };
  }, []);

  // resumo legível pela extensão (a esteira acompanha os gigantes por aqui)
  useEffect(() => {
    try { document.documentElement.dataset.gigantes = JSON.stringify(jobs.map((j) => ({ id: j.id, processo: j.numeroProcesso || "", status: j.status, historicoId: j.historicoId || "", erro: j.erro || "" }))); } catch { /* ignora */ }
  }, [jobs]);

  const ativos = jobs.filter((j) => ATIVO(j.status));
  if (jobs.length === 0 && !aberto) return null;
  const pct = (j: JobGig) => (j.progresso.total > 0 ? Math.round((j.progresso.feitas / j.progresso.total) * 100) : 0);

  return (
    <>
      <button
        onClick={() => setAberto((v) => !v)}
        className="fixed bottom-3 left-3 z-[9000] px-3 py-2 rounded-full bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow-lg border border-sky-400 cursor-pointer flex items-center gap-2"
        data-testid="gigantes-selo" title="Processos gigantes lidos em lotes, em segundo plano"
      >
        <span>📚 Gigantes</span>
        {ativos.length > 0 ? <span className="px-1.5 rounded-full bg-white/20">{ativos.length} em andamento · {pct(ativos[0])}%</span> : <span className="px-1.5 rounded-full bg-white/20">{jobs.length}</span>}
      </button>
      {aberto && (
        <div className="fixed bottom-14 left-3 z-[9001] w-[min(96vw,30rem)] max-h-[75vh] overflow-y-auto bg-white text-slate-800 rounded-2xl shadow-2xl border border-sky-300 p-3 space-y-3" data-testid="gigantes-painel">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-sky-900">📚 Processos gigantes (leitura em lotes)</h3>
            <button onClick={() => setAberto(false)} className="text-slate-500 hover:text-slate-800 text-lg leading-none cursor-pointer" aria-label="Fechar">×</button>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">Para autos com muitas páginas (até 3.000). O sistema lê tudo em lotes, funde as fichas e redige a minuta, sem travar o resto: as análises normais têm prioridade. Mantenha esta aba aberta; se fechar, retome de onde parou.</p>
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 space-y-1.5">
            <div className="text-[11px] font-bold text-sky-900">Novo processo gigante — usa o prompt selecionado: “{config.promptTitle || "—"}”</div>
            <input ref={arq} type="file" accept="application/pdf" multiple className="text-[11px]" data-testid="gigantes-arquivos" />
            <button
              onClick={async () => { const fs = Array.from(arq.current?.files || []); if (!fs.length) return; await gerenteGigantes.iniciar(fs, config); if (arq.current) arq.current.value = ""; }}
              className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold cursor-pointer" data-testid="gigantes-iniciar"
            >Processar em lotes</button>
          </div>
          {jobs.length === 0 && <div className="text-xs text-slate-500">Nenhum processo gigante ainda.</div>}
          {jobs.map((j) => (
            <div key={j.id} className="p-2.5 rounded-xl border border-slate-200 space-y-1.5" data-testid="gigante-job">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate" title={j.nome}>{j.numeroProcesso ? `${j.numeroProcesso} — ` : ""}{j.nome}</div>
                  <div className="text-[10px] text-slate-500">{j.totalPaginas ? `${j.totalPaginas} págs · ${j.lotes.length} lote(s) · ~${Math.round(j.totalTokensEstimados / 1000)} mil tokens` : "preparando…"}</div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${COR[j.status]}`}>{ROTULO[j.status]}</span>
              </div>
              {ATIVO(j.status) && <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-sky-600 transition-all" style={{ width: `${pct(j)}%` }} /></div>}
              <div className="text-[11px] text-slate-600">{j.etapa}</div>
              {j.erro && <div className="text-[11px] text-red-700 bg-red-50 rounded p-1.5">{j.erro}</div>}
              {j.arquivos.some((a) => a.semTexto.length > 0) && <div className="text-[10px] text-amber-800 bg-amber-50 rounded p-1.5">⚠️ Há páginas sem texto (imagem/escaneadas): {j.arquivos.filter((a) => a.semTexto.length).map((a) => `${a.nome}: ${a.semTexto.length} pág.`).join("; ")} A minuta sairá com aviso de conferência.</div>}
              <div className="flex flex-wrap gap-1.5">
                {ATIVO(j.status) && j.status !== "preparando" && <button onClick={() => gerenteGigantes.pausar(j.id)} className="px-2 py-1 rounded-md bg-orange-100 text-orange-800 text-[11px] font-bold cursor-pointer">Pausar</button>}
                {(j.status === "pausado" || j.status === "erro") && j.lotes.length > 0 && <button onClick={() => gerenteGigantes.retomar(j.id)} className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold cursor-pointer" data-testid="gigante-retomar">Retomar</button>}
                {ATIVO(j.status) && <button onClick={() => gerenteGigantes.cancelar(j.id)} className="px-2 py-1 rounded-md bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer">Cancelar</button>}
                {j.status === "concluido" && <button onClick={() => { onVerHistorico?.(); }} className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold cursor-pointer">Abrir o Histórico</button>}
                {!ATIVO(j.status) && <button onClick={() => gerenteGigantes.remover(j.id)} className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] cursor-pointer">Remover da lista</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
