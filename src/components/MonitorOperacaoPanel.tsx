import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Activity, RefreshCw, Copy, Loader2, AlertTriangle, Users } from "lucide-react";
import { OperacaoRegistrada, listarOperacoes, agruparAlertas, pedidoDeCorrecaoOperacao } from "../utils/monitorOperacao";

const quando = (t: number) => (t ? new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const ROTULO_RESULTADO: Record<string, string> = { ok: "OK", erro: "Erro", segundo_plano: "Segundo plano", nao_gravado: "Não gravado" };
const COR_RESULTADO: Record<string, string> = { ok: "text-emerald-300", erro: "text-rose-300", segundo_plano: "text-amber-300", nao_gravado: "text-rose-300" };
const ROTULO_MODULO: Record<string, string> = { normal: "Análise normal", turbo: "Turbo", gigante: "Gigante" };

export function MonitorOperacaoPanel() {
  const [ops, setOps] = useState<OperacaoRegistrada[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [soAlertas, setSoAlertas] = useState(false);
  const [origem, setOrigem] = useState<"todas" | "esteira" | "manual">("todas");
  const [usuario, setUsuario] = useState("todos");

  const carregar = async () => { setCarregando(true); try { setOps(await listarOperacoes()); } finally { setCarregando(false); } };
  useEffect(() => { void carregar(); }, []);

  const alertas = useMemo(() => agruparAlertas(ops), [ops]);
  const usuarios = useMemo(() => {
    const m = new Map<string, { nome: string; email: string; tenantId: string; total: number; esteira: number; alertas: number; ultima: number }>();
    for (const o of ops) {
      const u = m.get(o.email) || { nome: o.nome, email: o.email, tenantId: o.tenantId, total: 0, esteira: 0, alertas: 0, ultima: 0 };
      u.total++; if (o.origem === "esteira") u.esteira++; if (o.anomalias.some((a) => a.gravidade === "alta")) u.alertas++; u.ultima = Math.max(u.ultima, o.ts); m.set(o.email, u);
    }
    return [...m.values()].sort((a, b) => b.ultima - a.ultima);
  }, [ops]);
  const visiveis = useMemo(() => ops.filter((o) => (!soAlertas || o.anomalias.length > 0) && (origem === "todas" || o.origem === origem) && (usuario === "todos" || o.email === usuario)).slice(0, 150), [ops, soAlertas, origem, usuario]);
  const altos = alertas.filter((a) => a.gravidade === "alta");

  const copiar = async () => { try { await navigator.clipboard.writeText(pedidoDeCorrecaoOperacao(altos.length ? altos : alertas)); toast.success("Pedido copiado. Cole no chat com o Claude."); } catch { toast.error("Não consegui copiar."); } };

  return (
    <div className="space-y-5" data-testid="monitor-operacao">
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400"><Activity className="w-5 h-5" /></div>
          <h2 className="text-base font-black text-white">Monitor de operação</h2>
          <button type="button" onClick={carregar} disabled={carregando} className="ml-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer">
            {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Atualizar
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">Acompanha o que cada usuário fez no Studio (análise normal, Turbo e processos gigantes), se veio da esteira da extensão, com qual prompt e em qual unidade, e aponta sozinho o que parece errado. Não guarda partes nem texto dos autos.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"><div className="text-slate-400">Operações</div><div className="text-lg font-black text-white" data-testid="op-total">{ops.length}</div></div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"><div className="text-slate-400">Pela esteira</div><div className="text-lg font-black text-white">{ops.filter((o) => o.origem === "esteira").length}</div></div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"><div className="text-slate-400">Usuários ativos</div><div className="text-lg font-black text-white">{usuarios.length}</div></div>
          <div className="bg-slate-950/60 border border-rose-500/30 rounded-xl p-3"><div className="text-slate-400">Alertas graves</div><div className="text-lg font-black text-rose-300" data-testid="op-alertas-altos">{altos.length}</div></div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><h3 className="text-sm font-bold text-white">Alertas ({alertas.length})</h3>
          {alertas.length > 0 && <button type="button" onClick={copiar} className="ml-auto px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer" data-testid="op-copiar-pedido"><Copy className="w-3.5 h-3.5" /> Copiar pedido de correção</button>}
        </div>
        {alertas.length === 0 && <p className="text-xs text-slate-500">Nenhum alerta até agora.</p>}
        {alertas.map((a) => (
          <div key={a.chave} data-testid="op-alerta" className={`rounded-xl border p-3 text-xs space-y-1 ${a.gravidade === "alta" ? "bg-rose-950/40 border-rose-500/40" : "bg-amber-950/30 border-amber-500/30"}`}>
            <div className="flex items-center gap-2 flex-wrap"><span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${a.gravidade === "alta" ? "bg-rose-500/20 text-rose-200" : "bg-amber-500/20 text-amber-200"}`}>{a.gravidade === "alta" ? "GRAVE" : "ATENÇÃO"}</span>
              <span className="font-bold text-white">{a.usuario}</span><span className="text-slate-400">{a.email} · {a.tenantId}</span><span className="ml-auto text-slate-300 font-bold">{a.total}×</span></div>
            <p className="text-slate-200 leading-relaxed">{a.texto}</p>
            <p className="text-slate-500">Unidade: {a.unitName || "—"} · prompt: {a.promptTitle || "—"} · {quando(a.primeira)} a {quando(a.ultima)}{a.processos.length ? ` · ex.: ${a.processos.join(", ")}` : ""}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" /><h3 className="text-sm font-bold text-white">Por usuário</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400"><th className="py-1 pr-3">Usuário</th><th className="pr-3">Gabinete</th><th className="pr-3">Operações</th><th className="pr-3">Pela esteira</th><th className="pr-3">Alertas graves</th><th>Última</th></tr></thead>
          <tbody>{usuarios.map((u) => (<tr key={u.email} className="border-t border-slate-800 text-slate-200"><td className="py-1 pr-3"><button type="button" onClick={() => setUsuario(u.email)} className="hover:underline text-left cursor-pointer">{u.nome}<span className="text-slate-500"> · {u.email}</span></button></td><td className="pr-3">{u.tenantId}</td><td className="pr-3">{u.total}</td><td className="pr-3">{u.esteira}</td><td className={`pr-3 ${u.alertas ? "text-rose-300 font-bold" : ""}`}>{u.alertas}</td><td>{quando(u.ultima)}</td></tr>))}</tbody></table></div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <h3 className="text-sm font-bold text-white">Últimas operações</h3>
          <label className="ml-auto flex items-center gap-1.5 text-slate-300 cursor-pointer"><input type="checkbox" checked={soAlertas} onChange={(e) => setSoAlertas(e.target.checked)} /> só com alerta</label>
          <select value={origem} onChange={(e) => setOrigem(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"><option value="todas">todas as origens</option><option value="esteira">só esteira</option><option value="manual">só manual</option></select>
          <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"><option value="todos">todos os usuários</option>{usuarios.map((u) => <option key={u.email} value={u.email}>{u.nome}</option>)}</select>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400"><th className="py-1 pr-3">Quando</th><th className="pr-3">Usuário</th><th className="pr-3">Módulo</th><th className="pr-3">Origem</th><th className="pr-3">Unidade</th><th className="pr-3">Prompt</th><th className="pr-3">Processo</th><th>Resultado</th></tr></thead>
          <tbody>{visiveis.map((o) => (<tr key={o.tenantId + o.id} data-testid="op-linha" className={`border-t border-slate-800 text-slate-200 ${o.anomalias.some((a) => a.gravidade === "alta") ? "bg-rose-950/20" : ""}`}>
            <td className="py-1 pr-3 whitespace-nowrap">{quando(o.ts)}</td><td className="pr-3">{o.nome}</td><td className="pr-3">{ROTULO_MODULO[o.modulo] || o.modulo}</td><td className="pr-3">{o.origem === "esteira" ? "esteira" : "manual"}</td>
            <td className="pr-3 max-w-[180px] truncate" title={o.unitName}>{o.unitName || "—"}</td><td className="pr-3 max-w-[200px] truncate" title={o.promptTitle}>{o.promptTitle || "—"}</td><td className="pr-3 font-mono">{o.processo || "—"}</td>
            <td className={COR_RESULTADO[o.resultado] || ""} title={o.erro}>{ROTULO_RESULTADO[o.resultado] || o.resultado}{o.anomalias.length ? " ⚠" : ""}</td></tr>))}
            {visiveis.length === 0 && <tr><td colSpan={8} className="py-3 text-slate-500">Nenhuma operação registrada ainda. Os registros começam a aparecer depois que o Studio atualizado for usado.</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}
