import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Hourglass, Loader2, Trash2, Search } from "lucide-react";
import { assinarHistorico } from "../utils/historyDb";
import { carregarConfigRetencao, limparHistoricoVencido, limparLupaEMesaVencidas, salvarConfigRetencao } from "../utils/retencaoDb";
import { resumirValidade } from "../utils/retencaoRegras";
import { useConfigRetencao } from "./EtiquetaValidade";
import type { SavedAnalysis } from "../types";

/** Painel do super admin: liga e desliga a retenção do Histórico, mostra quantas minutas vencem em 7, 3 e 1 dia e limpa as vencidas. */
export function RetencaoHistoricoPanel() {
  const cfg = useConfigRetencao();
  const [lista, setLista] = useState<SavedAnalysis[]>([]);
  const [dias, setDias] = useState(cfg.dias);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { void carregarConfigRetencao(); }, []);
  useEffect(() => { setDias(cfg.dias); }, [cfg.dias]);
  useEffect(() => assinarHistorico(setLista), []);
  const r = useMemo(() => resumirValidade(lista, cfg), [lista, cfg]);

  const mudar = async (ativa: boolean) => {
    setOcupado(true);
    try { await salvarConfigRetencao({ ativa, dias }); toast.success(ativa ? `Retenção ligada: as minutas ficam ${dias} dias. As antigas ganham ${dias} dias a partir de agora.` : "Retenção desligada: nada será apagado."); }
    catch (e: any) { toast.error("Não consegui salvar: " + (e?.message || e)); } finally { setOcupado(false); }
  };
  const limpar = async (simular: boolean) => {
    setOcupado(true);
    try {
      const x = await limparHistoricoVencido({ simular });
      const y = await limparLupaEMesaVencidas({ simular });
      toast.success(simular ? `Seriam apagadas agora: ${x.candidatos} minuta(s), ${y.auditorias} auditoria(s) da Lupa e ${y.audiencias} audiência(s) da Mesa.` : `Apagadas: ${x.apagados} minuta(s)${x.falhas ? ` (${x.falhas} com falha)` : ""}, ${y.auditorias} auditoria(s) da Lupa e ${y.audiencias} audiência(s) da Mesa.`);
    } finally { setOcupado(false); }
  };
  const botao = "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50";
  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-3" data-testid="retencao-historico">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"><Hourglass className="w-5 h-5" /></div>
        <h3 className="text-sm font-black text-white">Retenção do Histórico</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.ativa ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"}`} data-testid="retencao-estado">{cfg.ativa ? "LIGADA" : "DESLIGADA"}</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-300">
          <label className="flex items-center gap-1.5">Dias <input type="number" min={1} max={365} value={dias} onChange={(e) => setDias(Math.max(1, Math.min(365, Number(e.target.value) || 7)))} className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100" disabled={cfg.ativa} /></label>
          {cfg.ativa
            ? <button type="button" disabled={ocupado} onClick={() => mudar(false)} className={`${botao} bg-slate-700 hover:bg-slate-600 text-white`}>Desligar</button>
            : <button type="button" disabled={ocupado} onClick={() => mudar(true)} className={`${botao} bg-amber-600 hover:bg-amber-500 text-white`} data-testid="retencao-ligar">Ligar</button>}
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">Cada minuta do Histórico, auditoria da Lupa e audiência da Mesa fica por {dias} dias e depois é apagada do banco (a audiência conta a partir da data marcada). O usuário é avisado com 3 dias e com 1 dia. As minutas feitas até 23/10/2026 não são apagadas na hora: ganham {dias} dias de carência a partir do dia em que a regra é ligada{cfg.ativadaEm ? ` (ligada em ${new Date(cfg.ativadaEm).toLocaleDateString("pt-BR")})` : ""}. A exclusão acontece quando alguém abre o sistema: cada usuário apaga as próprias minutas vencidas e o super admin apaga todas.</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {[["Vencidas", r.vencidas, "text-rose-300"], ["Menos de 24 h", r.ate1, "text-rose-300"], ["Até 3 dias", r.ate3, "text-amber-300"], ["Mais de 3 dias", r.ate7, "text-slate-100"], ["Com prazo (esta unidade)", r.total, "text-white"]].map(([t, n, c]) => (
          <div key={String(t)} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"><div className="text-slate-400">{t}</div><div className={`text-lg font-black ${c}`}>{n as number}</div></div>
        ))}
      </div>
      {cfg.ativa && (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" disabled={ocupado} onClick={() => limpar(true)} className={`${botao} bg-slate-800 hover:bg-slate-700 text-slate-100`}>{ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Simular (só contar)</button>
          <button type="button" disabled={ocupado} onClick={() => limpar(false)} className={`${botao} bg-rose-600 hover:bg-rose-500 text-white`} data-testid="retencao-limpar"><Trash2 className="w-3.5 h-3.5" /> Limpar vencidas agora</button>
        </div>
      )}
    </div>
  );
}
