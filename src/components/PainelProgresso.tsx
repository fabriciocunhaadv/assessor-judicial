import React, { useEffect, useRef, useState } from "react";

interface Andamento { texto?: string; pct?: number | null; teto?: number; idadeSeg?: number }

const formatar = (seg: number) => `${String(Math.floor(seg / 60)).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`;

// Andamento real da análise: etapa atual (informada pelo servidor), porcentagem e tempo decorrido.
// Entre uma informação e outra do servidor a barra avança devagar (nunca passa do teto da etapa), para não parecer travada.
export function PainelProgresso({ ativo, progId, titulo, fallbackTexto }: { ativo: boolean; progId: string | null; titulo: string; fallbackTexto?: string }) {
  const [ando, setAndo] = useState<Andamento>({});
  const [seg, setSeg] = useState(0);
  const [, setTick] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const recebidoEm = useRef(Date.now());
  const inicio = useRef(Date.now());

  useEffect(() => {
    if (!ativo) return;
    inicio.current = Date.now(); setSeg(0); setAndo({});
    try { raiz.current?.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { /* ignora */ }
    const rel = setInterval(() => { setSeg(Math.floor((Date.now() - inicio.current) / 1000)); setTick((t) => t + 1); }, 1000);
    return () => clearInterval(rel);
  }, [ativo, progId]);

  useEffect(() => {
    if (!ativo || !progId) return;
    let vivo = true;
    const consultar = async () => {
      try {
        const r = await fetch(`/api/progresso/${encodeURIComponent(progId)}`, { cache: "no-store" });
        const j = await r.json();
        if (vivo && j && (j.texto || j.pct != null)) { recebidoEm.current = Date.now(); setAndo(j); }
      } catch { /* sem conexão por um instante: tenta de novo */ }
    };
    void consultar();
    const t = setInterval(consultar, 2500);
    return () => { vivo = false; clearInterval(t); };
  }, [ativo, progId]);

  if (!ativo) return null;
  const base = typeof ando.pct === "number" ? ando.pct : null;
  const teto = typeof ando.teto === "number" ? ando.teto : 99;
  const idade = (ando.idadeSeg || 0) + (Date.now() - recebidoEm.current) / 1000;
  const exibido = base == null ? null : Math.min(teto, Math.round(base + Math.max(0, teto - base) * (1 - Math.exp(-idade / 75))));
  return (
    <div ref={raiz} className="w-full max-w-xl mx-auto space-y-2" data-testid="painel-progresso">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
        <span className="uppercase tracking-wider">{titulo}</span>
        <span className="font-mono">{exibido != null ? `${exibido}%` : "…"} · {formatar(seg)}</span>
      </div>
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        {exibido != null
          ? <div className="h-full bg-emerald-600 transition-all duration-700" style={{ width: `${exibido}%` }} />
          : <div className="h-full w-1/3 bg-emerald-500 rounded-full animate-pulse" />}
      </div>
      <p className="text-xs font-medium text-slate-800">{ando.texto || fallbackTexto || "Iniciando…"}</p>
      <p className="text-[11px] text-slate-500">O sistema está trabalhando. Autos longos podem levar vários minutos; não feche esta aba.</p>
    </div>
  );
}
