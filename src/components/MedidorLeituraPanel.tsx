import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Gauge, RefreshCw, Copy, Loader2 } from "lucide-react";
import { enviarMedicoes, listarMedicoes } from "../utils/medidorEnvio";
import { lerControleIndiceHistorico } from "../lib/firestoreUtils";
import { formatarBytes, resumir, RegistroMedidor } from "../utils/medidorRegras";

/** Quanto cada parte do sistema baixou do banco nos últimos dias (estimado por amostra). Serve para achar o que pesa na fatura do Firebase. */
export function MedidorLeituraPanel() {
  const [regs, setRegs] = useState<RegistroMedidor[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dias, setDias] = useState(7);
  const [ctrl, setCtrl] = useState<any>(null);
  // envia antes o que esta aba ainda tem na memória (o envio automático é a cada 5 minutos), para o relatório não ficar atrasado
  const carregar = async () => { setCarregando(true); try { await enviarMedicoes(); setRegs(await listarMedicoes(dias)); setCtrl(await lerControleIndiceHistorico()); } finally { setCarregando(false); } };
  useEffect(() => { void carregar(); }, [dias]);
  const r = useMemo(() => resumir(regs), [regs]);
  const texto = () => `Medidor de leitura do Firestore (estimado, últimos ${dias} dias). Total: ${formatarBytes(r.totalBytes)}\n\n` +
    r.porOrigem.map((o) => `- ${o.rotulo}: ${formatarBytes(o.bytes)} em ${o.chamadas} chamadas (${o.docs} documentos, ${o.usuarios} usuário(s))`).join("\n") +
    `\n\nPor dia:\n` + r.porDia.map((d) => `- ${d.data}: ${formatarBytes(d.bytes)}`).join("\n");
  const copiar = async () => { try { await navigator.clipboard.writeText(texto()); toast.success("Relatório copiado. Cole no Claude."); } catch { toast.error("Não consegui copiar."); } };
  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3" data-testid="medidor-leitura">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"><Gauge className="w-5 h-5" /></div>
        <h3 className="text-sm font-black text-white">Medidor de leitura do banco</h3>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="ml-auto bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200">
          <option value={1}>Hoje</option><option value={3}>3 dias</option><option value={7}>7 dias</option><option value={14}>14 dias</option>
        </select>
        <button type="button" onClick={carregar} disabled={carregando} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5">
          {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Atualizar
        </button>
        {regs.length > 0 && <button type="button" onClick={copiar} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Copiar relatório</button>}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">Estimativa do que cada parte do sistema baixou do banco (por amostra). A fatura do Google cobra o volume baixado, por isso o que aparece no topo é o que mais pesa. As medições começam a valer depois desta atualização e são enviadas a cada poucos minutos.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"><div className="text-slate-400">Total estimado</div><div className="text-lg font-black text-white" data-testid="medidor-total">{formatarBytes(r.totalBytes)}</div></div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"><div className="text-slate-400">Origens medidas</div><div className="text-lg font-black text-white">{r.porOrigem.length}</div></div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"><div className="text-slate-400">Usuários</div><div className="text-lg font-black text-white">{r.porUsuario.length}</div></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400"><th className="py-1 pr-3">Origem</th><th className="pr-3">Baixado</th><th className="pr-3">%</th><th className="pr-3">Chamadas</th><th className="pr-3">Documentos</th><th>Usuários</th></tr></thead>
        <tbody>{r.porOrigem.map((o) => (<tr key={o.origem} data-testid="medidor-linha" className="border-t border-slate-800 text-slate-200"><td className="py-1 pr-3">{o.rotulo}</td><td className="pr-3 font-bold">{formatarBytes(o.bytes)}</td><td className="pr-3">{r.totalBytes ? Math.round((o.bytes / r.totalBytes) * 100) : 0}%</td><td className="pr-3">{o.chamadas}</td><td className="pr-3">{o.docs}</td><td>{o.usuarios}</td></tr>))}
          {r.porOrigem.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-500">Ainda sem medições. Elas aparecem alguns minutos depois de os usuários usarem o sistema já atualizado.</td></tr>}</tbody></table></div>
      {ctrl && (
        <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3" data-testid="medidor-indice-controle">
          <span className="text-slate-400">Índice leve do Histórico: </span>
          {ctrl.feitoEm ? `última refação em ${new Date(ctrl.feitoEm).toLocaleString("pt-BR")}` : "ainda não foi refeito"}
          {ctrl.ultimoMotivo ? ` (${ctrl.ultimoMotivo}${ctrl.atosLidos ? `; ${ctrl.atosLidos} atos lidos` : ""})` : ""}
          {ctrl.divergencia ? ` · divergência que a refação não resolveu: ${ctrl.divergencia.atos} atos e ${ctrl.divergencia.noIndice} no índice` : ""}
        </div>
      )}
      {r.porDia.length > 0 && <div className="text-xs text-slate-300"><span className="text-slate-400">Por dia: </span>{r.porDia.map((d) => `${d.data.slice(5)}: ${formatarBytes(d.bytes)}`).join(" · ")}</div>}
      {r.porUsuario.length > 0 && <div className="text-xs text-slate-300"><span className="text-slate-400">Quem mais baixou: </span>{r.porUsuario.slice(0, 5).map((u) => `${u.nome || u.email} (${formatarBytes(u.bytes)})`).join(" · ")}</div>}
    </div>
  );
}
