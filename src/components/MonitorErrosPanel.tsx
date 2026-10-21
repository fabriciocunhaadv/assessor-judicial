import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Bug, RefreshCw, Sparkles, Check, X, CheckCheck, Copy, Loader2, ShieldAlert } from "lucide-react";
import { ErroMonitorado, StatusErro, DiagnosticoErro, listarErros, salvarDiagnostico, decidirErro, pedidoDeCorrecao } from "../utils/monitorErros";
import { getApiHeaders } from "../utils/apiKeyManager";

const ROTULO_SITUACAO: Record<StatusErro, string> = { novo: "Novo", diagnosticado: "Diagnosticado", aceito: "Ajuste aceito", recusado: "Recusado", resolvido: "Resolvido" };
const COR_SITUACAO: Record<StatusErro, string> = {
  novo: "bg-rose-500/15 text-rose-300 border-rose-500/40", diagnosticado: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  aceito: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", recusado: "bg-slate-500/15 text-slate-300 border-slate-500/40", resolvido: "bg-sky-500/15 text-sky-300 border-sky-500/40",
};
const quando = (t: number) => (t ? new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

export function MonitorErrosPanel() {
  const [lista, setLista] = useState<ErroMonitorado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState<StatusErro | "todos" | "abertos">("abertos");
  const [modulo, setModulo] = useState("todos");
  const [ocultarPassageiros, setOcultarPassageiros] = useState(true);
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const carregar = async () => { setCarregando(true); try { setLista(await listarErros()); } finally { setCarregando(false); } };
  useEffect(() => { void carregar(); }, []);

  const modulos = useMemo(() => ["todos", ...Array.from(new Set(lista.map((e) => e.modulo))).sort()], [lista]);
  const visiveis = useMemo(() => lista.filter((e) =>
    (filtro === "todos" || (filtro === "abertos" ? e.situacao === "novo" || e.situacao === "diagnosticado" : e.situacao === filtro)) &&
    (modulo === "todos" || e.modulo === modulo) && (!ocultarPassageiros || e.tipo !== "passageiro" || e.situacao === "aceito") &&
    (!busca || `${e.mensagem} ${e.modulo}`.toLowerCase().includes(busca.toLowerCase()))
  ), [lista, filtro, modulo, ocultarPassageiros, busca]);
  const aceitos = lista.filter((e) => e.situacao === "aceito");
  const contagem = (s: StatusErro) => lista.filter((e) => e.situacao === s).length;

  const atualizar = (e: ErroMonitorado, p: Partial<ErroMonitorado>) => setLista((l) => l.map((x) => (x.id === e.id && x.tenantId === e.tenantId ? { ...x, ...p } : x)));

  const diagnosticar = async (e: ErroMonitorado) => {
    setOcupado(e.id);
    try {
      const r = await fetch("/api/monitor/diagnosticar", { method: "POST", headers: getApiHeaders(), body: JSON.stringify({ erro: { modulo: e.modulo, origem: e.origem, tipo: e.tipo, status: e.status, mensagem: e.mensagem, contagem: e.contagem, usuarios: e.usuarios.length, primeiraEm: quando(e.primeiraEm), ultimaEm: quando(e.ultimaEm), contexto: e.contexto || {} } }) });
      const j = await r.json();
      if (!r.ok || !j.diagnostico) throw new Error(j.error || "sem diagnóstico");
      const d: DiagnosticoErro = j.diagnostico; await salvarDiagnostico(e, d);
      atualizar(e, { diagnostico: { ...d, geradoEm: Date.now() }, situacao: e.situacao === "novo" ? "diagnosticado" : e.situacao });
    } catch (err: any) { toast.error(`Não consegui diagnosticar: ${err?.message || err}`); } finally { setOcupado(null); }
  };
  const decidir = async (e: ErroMonitorado, s: StatusErro) => {
    setOcupado(e.id);
    try { const nota = notas[e.id] || ""; await decidirErro(e, s, nota); atualizar(e, { situacao: s, decisao: { por: "você", em: Date.now(), nota } }); toast.success(s === "aceito" ? "Ajuste aceito. Entra no pedido de correção." : `Marcado como ${ROTULO_SITUACAO[s].toLowerCase()}.`); }
    catch (err: any) { toast.error(`Não consegui salvar: ${err?.message || err}`); } finally { setOcupado(null); }
  };
  const diagnosticarNovos = async () => { for (const e of lista.filter((x) => x.situacao === "novo" && x.tipo === "falha").slice(0, 5)) await diagnosticar(e); };
  const copiarPedido = async () => { try { await navigator.clipboard.writeText(pedidoDeCorrecao(aceitos)); toast.success("Pedido copiado. Cole no chat com o Claude."); } catch { toast.error("Não consegui copiar."); } };

  return (
    <div className="space-y-5" data-testid="monitor-erros">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2"><div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400"><Bug className="w-5 h-5" /></div>
          <h2 className="text-base font-black text-white">Monitor de erros</h2></div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">O sistema registra os erros de tela, de rede e das chamadas à IA, agrupa os repetidos e a IA sugere a causa e o ajuste. <strong className="text-white">Nada é corrigido sozinho:</strong> você aceita ou recusa cada sugestão, e só as aceitas entram no pedido de correção. Textos de processos nunca são gravados; números de processo, CPF, e-mail e chaves são mascarados.</p>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          {(["novo", "diagnosticado", "aceito", "recusado", "resolvido"] as StatusErro[]).map((s) => <span key={s} className={`px-2 py-1 rounded-md border ${COR_SITUACAO[s]}`}>{ROTULO_SITUACAO[s]}: {contagem(s)}</span>)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select value={filtro} onChange={(ev) => setFiltro(ev.target.value as any)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200">
          <option value="abertos">Em aberto (novos e diagnosticados)</option><option value="aceito">Aceitos</option><option value="recusado">Recusados</option><option value="resolvido">Resolvidos</option><option value="todos">Todos</option>
        </select>
        <select value={modulo} onChange={(ev) => setModulo(ev.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200">{modulos.map((m) => <option key={m} value={m}>{m === "todos" ? "Todos os módulos" : m}</option>)}</select>
        <input value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder="Buscar na mensagem…" className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 min-w-[180px]" />
        <label className="flex items-center gap-1.5 text-slate-300"><input type="checkbox" checked={ocultarPassageiros} onChange={(ev) => setOcultarPassageiros(ev.target.checked)} /> Ocultar passageiros (503, cota, rede)</label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={carregar} disabled={carregando} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center gap-1.5">{carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Atualizar</button>
          <button onClick={diagnosticarNovos} disabled={!!ocupado} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Diagnosticar novos (até 5)</button>
          <button onClick={copiarPedido} disabled={aceitos.length === 0} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" />Copiar pedido de correção ({aceitos.length})</button>
        </div>
      </div>

      {visiveis.length === 0 && <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">{carregando ? "Carregando…" : "Nenhum erro neste filtro."}</div>}

      <div className="space-y-3">
        {visiveis.map((e) => (
          <article key={`${e.tenantId}/${e.id}`} data-testid="erro-item" className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className={`px-2 py-0.5 rounded border ${COR_SITUACAO[e.situacao]}`}>{ROTULO_SITUACAO[e.situacao]}</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200">{e.modulo}</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{e.tipo === "passageiro" ? "passageiro" : "falha"}{e.status ? ` · HTTP ${e.status}` : ""}</span>
              <span className="text-slate-400 font-medium">{e.contagem}× · {e.usuarios.length} usuário(s) · gabinete {e.tenantId} · última {quando(e.ultimaEm)}</span>
              {e.decisao && e.ultimaEm > e.decisao.em && (e.situacao === "resolvido" || e.situacao === "recusado") && <span className="text-amber-300">voltou a ocorrer</span>}
            </div>
            <p className="text-sm text-slate-100 break-words">{e.mensagem}</p>

            {e.diagnostico && (
              <div className="bg-slate-950/70 border border-slate-700 rounded-lg p-3 space-y-2 text-xs text-slate-200">
                <p><strong className="text-white">Resumo:</strong> {e.diagnostico.resumo}</p>
                <p><strong className="text-white">Causa provável:</strong> {e.diagnostico.causa_provavel} <span className="text-slate-400">(origem: {e.diagnostico.origem_provavel} · gravidade {e.diagnostico.gravidade} · confiança {e.diagnostico.confianca})</span></p>
                <p><strong className="text-white">O que o usuário deve fazer:</strong> {e.diagnostico.acao_para_usuario}</p>
                {e.diagnostico.sugestoes.length > 0 && <div><strong className="text-white">Ajustes sugeridos {e.diagnostico.precisa_desenvolvedor ? "(precisa de desenvolvedor)" : ""}:</strong>
                  <ul className="mt-1 space-y-1.5">{e.diagnostico.sugestoes.map((s, i) => <li key={i} className="pl-3 border-l-2 border-amber-500/60"><span className="font-bold text-amber-200">{s.titulo}</span> <span className="text-slate-400">· {s.tipo} · risco {s.risco} · esforço {s.esforco}</span><br />{s.descricao}<br /><span className="text-slate-400">Onde: {s.onde}</span></li>)}</ul></div>}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button onClick={() => diagnosticar(e)} disabled={ocupado === e.id} className="px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5">{ocupado === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}{e.diagnostico ? "Diagnosticar de novo" : "Diagnosticar com IA"}</button>
              <input value={notas[e.id] ?? e.decisao?.nota ?? ""} onChange={(ev) => setNotas((n) => ({ ...n, [e.id]: ev.target.value }))} placeholder="Nota sua (opcional)" className="flex-1 min-w-[160px] bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200" />
              <button onClick={() => decidir(e, "aceito")} disabled={!e.diagnostico || ocupado === e.id} title={e.diagnostico ? "Entra no pedido de correção" : "Gere o diagnóstico primeiro"} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />Aceitar ajuste</button>
              <button onClick={() => decidir(e, "recusado")} disabled={ocupado === e.id} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center gap-1.5"><X className="w-3.5 h-3.5" />Recusar</button>
              <button onClick={() => decidir(e, "resolvido")} disabled={ocupado === e.id} className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-bold flex items-center gap-1.5"><CheckCheck className="w-3.5 h-3.5" />Resolvido</button>
            </div>
          </article>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" />O diagnóstico usa a sua chave de IA e recebe só a mensagem mascarada, o módulo e as contagens.</p>
    </div>
  );
}
