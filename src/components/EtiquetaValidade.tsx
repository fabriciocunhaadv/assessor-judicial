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
  // cores suaves: verde (em prazo), laranja (3 dias ou menos) e vermelho (menos de 24 h ou vencido)
  const paleta = s.fase === "vencido" || s.fase === "aviso1"
    ? { caixa: "bg-rose-50 text-rose-700 border-rose-200", ponto: "bg-rose-400" }
    : s.fase === "aviso3"
      ? { caixa: "bg-orange-50 text-orange-700 border-orange-200", ponto: "bg-orange-400" }
      : { caixa: "bg-emerald-50 text-emerald-700 border-emerald-200", ponto: "bg-emerald-400" };
  return (
    <span data-testid="etiqueta-validade" data-fase={s.fase} title={s.expiraEm ? `Será apagada do Histórico em ${new Date(s.expiraEm).toLocaleString("pt-BR")}. Baixe (DOCX ou PDF) se quiser guardar.` : ""}
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border whitespace-nowrap ${paleta.caixa} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${paleta.ponto}`} />{s.texto}
    </span>
  );
}

export function AvisoRetencao() {
  const cfg = useConfigRetencao();
  if (!cfg.ativa) return null;
  return (
    <div data-testid="aviso-retencao" className="mx-3 mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-800 text-[11px] leading-relaxed px-3 py-2 flex items-start gap-2">
      <Hourglass className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>As minutas ficam no Histórico por <b>{cfg.dias} dias</b> e depois são apagadas do banco. Você é avisado com 3 dias e com 1 dia de antecedência. Baixe (DOCX ou PDF) o que quiser guardar.</span>
    </div>
  );
}
