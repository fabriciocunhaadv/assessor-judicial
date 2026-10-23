import React, { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { configRetencaoAtual, situacaoValidade } from "../utils/retencaoRegras";

/** Quanto tempo falta para o ato ser apagado do Histórico (some quando a regra de retenção está desligada). */
export function useConfigRetencao() {
  const [cfg, setCfg] = useState(configRetencaoAtual());
  useEffect(() => {
    const aoMudar = () => setCfg(configRetencaoAtual());
    window.addEventListener("assessor-retencao-config", aoMudar);
    aoMudar();
    return () => window.removeEventListener("assessor-retencao-config", aoMudar);
  }, []);
  return cfg;
}

export function EtiquetaValidade({ date, className = "" }: { date: any; className?: string }) {
  const cfg = useConfigRetencao();
  const s = situacaoValidade(date, cfg);
  if (s.fase === "sem_regra") return null;
  const cor = s.fase === "vencido" || s.fase === "aviso1" ? "bg-rose-50 text-rose-800 border-rose-300" : s.fase === "aviso3" ? "bg-amber-50 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span data-testid="etiqueta-validade" data-fase={s.fase} title={s.expiraEm ? `Será apagada do Histórico em ${new Date(s.expiraEm).toLocaleString("pt-BR")}. Baixe (DOCX ou PDF) se quiser guardar.` : ""}
      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border whitespace-nowrap ${cor} ${className}`}>
      <Hourglass className="w-3 h-3 shrink-0" />{s.texto}
    </span>
  );
}

export function AvisoRetencao() {
  const cfg = useConfigRetencao();
  if (!cfg.ativa) return null;
  return (
    <div data-testid="aviso-retencao" className="mx-3 mt-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-[11px] leading-relaxed px-3 py-2 flex items-start gap-2">
      <Hourglass className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>As minutas ficam no Histórico por <b>{cfg.dias} dias</b> e depois são apagadas do banco. Você é avisado com 3 dias e com 1 dia de antecedência. Baixe (DOCX ou PDF) o que quiser guardar.</span>
    </div>
  );
}
