import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Printer, Copy, FileText, ZoomIn, ZoomOut, RefreshCw, ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, Loader2, Pencil, Save, Undo2, Send, Sparkles } from "lucide-react";
import type { AtaPreliminarDados } from "../types";
import { MODELO_ATA, montarBlocos, blocosParaHtml, blocosParaTexto, htmlParaBlocos, sanitizarHtmlAta, rodapeJuiz, CSS_ATA, type ContextoAta } from "../templates/ataPreliminarModelo";
import { AvisoPromptInjection } from "./AvisoPromptInjection";

const A4_ALTURA = 1123;      // px de uma folha A4 a 96 dpi
const A4_LARGURA = 794;

const CSS_VISUALIZADOR = `
.atav{background:#12141a;color:#e8eaf0}
.atav *{box-sizing:border-box}
.atav-bar{background:#12141a;border-color:rgba(255,255,255,.1)}
.atav-sub{background:#191c24;border-color:rgba(255,255,255,.1)}
.atav-btn{color:#dfe3ee}.atav-btn:hover{background:rgba(255,255,255,.1)}
.atav-btn-on{background:rgba(255,255,255,.16)}
.atav-pdf{background:#dc2626;color:#fff}
.atav-primary{background:#3b6cf6;color:#fff}.atav-primary:hover{background:#5380f8}
.atav-save{background:#10a56f;color:#fff}.atav-save:hover{background:#17bb82}
.atav-amber{color:#fcd34d}.atav-green{color:#6ee7b7}.atav-muted{color:#9aa3b5}
.atav-painel{background:#191c24;border-color:rgba(255,255,255,.1)}
.atav-tab{color:#9aa3b5;border-bottom:2px solid transparent}.atav-tab:hover{color:#e8eaf0}
.atav-tab-on{color:#fff;border-bottom:2px solid #6b93ff}
.atav-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);border-radius:10px;padding:8px}
.atav-card-alto{border-color:rgba(248,113,113,.5);background:rgba(239,68,68,.12)}
.atav-card-medio{border-color:rgba(251,191,36,.45);background:rgba(245,158,11,.12)}
.atav-aviso{border:1px solid rgba(251,191,36,.45);background:rgba(245,158,11,.14);color:#fde68a;border-radius:10px;padding:8px}
.atav-eu{background:rgba(59,108,246,.28);border:1px solid rgba(107,147,255,.4);border-radius:10px}
.atav-ia{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px}
.atav-input{background:#0e1015;border:1px solid rgba(255,255,255,.16);color:#f1f3f9;border-radius:10px}
.atav-input:focus{outline:none;border-color:#6b93ff}
.atav-chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#dfe3ee}.atav-chip:hover{background:rgba(255,255,255,.12)}
.atav-mesa{background:#2a2e3a}
.atav-claro{background:#fff;border-radius:10px;padding:4px}
`;

export interface RespostaCopilotoAta { html: string; resumo?: string }
interface Props {
  ata: AtaPreliminarDados;
  htmlEditado?: string;                                   // versão salva depois de editar (substitui a gerada)
  processNumber?: string;
  contexto?: ContextoAta;                                 // juiz, assessor, data/hora e modalidade da audiência
  onClose: () => void;
  onRegenerate?: () => void;
  carregando?: boolean;
  onSalvar?: (html: string) => Promise<void> | void;      // grava a edição (HTML limpo)
  onCopilot?: (instrucao: string, htmlAtual: string) => Promise<RespostaCopilotoAta>;
}

// Visualizador da ata preliminar: folha A4 com zoom, edição direta no documento, copiloto para pedir alterações em linguagem natural e exportação.
export function AtaPreliminarViewer({ ata, htmlEditado, processNumber, contexto, onClose, onRegenerate, carregando, onSalvar, onCopilot }: Props) {
  const [zoom, setZoom] = useState(1);
  const [painel, setPainel] = useState(true);
  const [aba, setAba] = useState<"resumo" | "copiloto">("resumo");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState<string[]>([]);
  const [conversa, setConversa] = useState<{ de: "eu" | "ia"; texto: string }[]>([]);
  const [instrucao, setInstrucao] = useState("");
  const [pensando, setPensando] = useState(false);
  const rolagem = useRef<HTMLDivElement>(null);
  const folha = useRef<HTMLDivElement>(null);
  const doc = useRef<HTMLDivElement>(null);

  const ctx = contexto || {};
  const rodape = rodapeJuiz(ctx);
  const ctxKey = JSON.stringify(ctx);
  const blocosGerados = useMemo(() => montarBlocos(ata, MODELO_ATA, ctx), [ata, ctxKey]);
  const htmlGerado = useMemo(() => blocosParaHtml(blocosGerados), [blocosGerados]);
  const [htmlBase, setHtmlBase] = useState<string>(htmlEditado && htmlEditado.trim() ? htmlEditado : htmlGerado);
  useEffect(() => { setHtmlBase(htmlEditado && htmlEditado.trim() ? htmlEditado : htmlGerado); setSujo(false); }, [htmlGerado, htmlEditado]);
  // o conteúdo do documento só é reescrito quando muda a base (não a cada tecla: preserva o cursor)
  useEffect(() => { if (doc.current && doc.current.innerHTML !== htmlBase) doc.current.innerHTML = htmlBase; }, [htmlBase]);

  const htmlCorrente = useCallback(() => sanitizarHtmlAta(doc.current?.innerHTML ?? htmlBase), [htmlBase]);
  const numero = ata.cabecalho?.numeroProcesso || processNumber || "processo";
  const nomeArquivo = `ATA-PRELIMINAR-${String(numero).replace(/[^\d.-]/g, "") || "processo"}`;
  const aConferir = useMemo(() => [...(ata.partes || []), ...(ata.testemunhas || []), ...(ata.citacoesIntimacoes || []), ...(ata.pedidosAudiencia || []), ...(ata.pontosAtencao || [])].filter((x: any) => x.conferir).length, [ata]);

  useEffect(() => {
    const medir = () => { const h = folha.current ? folha.current.getBoundingClientRect().height / zoom : A4_ALTURA; setTotalPaginas(Math.max(1, Math.ceil(h / A4_ALTURA))); };
    medir();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    if (ro && folha.current) ro.observe(folha.current);
    return () => ro?.disconnect();
  }, [htmlBase, zoom]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") tentarFechar(); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && editando) { e.preventDefault(); salvar(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });

  const tentarFechar = () => { if (sujo && !window.confirm("Há alterações não salvas na ata. Fechar mesmo assim?")) return; onClose(); };
  const aoRolar = () => { const el = rolagem.current; if (!el) return; setPagina(Math.min(totalPaginas, Math.max(1, Math.floor(el.scrollTop / (A4_ALTURA * zoom)) + 1))); };
  const irPara = (n: number) => { const el = rolagem.current; if (el) el.scrollTo({ top: (Math.min(totalPaginas, Math.max(1, n)) - 1) * A4_ALTURA * zoom, behavior: "smooth" }); };
  const msg = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 2800); };

  const salvar = async () => {
    if (!onSalvar) return;
    setSalvando(true);
    try { const h = htmlCorrente(); await onSalvar(h); setHtmlBase(h); setSujo(false); msg("Edição salva"); } catch (e: any) { msg("Não consegui salvar: " + (e?.message || e)); } finally { setSalvando(false); }
  };
  const desfazer = () => { const h = historico[historico.length - 1]; if (h == null) return; setHistorico((x) => x.slice(0, -1)); setHtmlBase(h); setSujo(true); };
  const descartar = () => { if (!window.confirm("Descartar as alterações não salvas?")) return; setHtmlBase(htmlEditado && htmlEditado.trim() ? htmlEditado : htmlGerado); if (doc.current) doc.current.innerHTML = htmlEditado && htmlEditado.trim() ? htmlEditado : htmlGerado; setSujo(false); setEditando(false); };
  const refazer = () => { if ((sujo || (htmlEditado && htmlEditado.trim())) && !window.confirm("Gerar de novo apaga a versão editada desta ata. Continuar?")) return; onRegenerate?.(); };

  const imprimir = () => {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const d = f.contentDocument!;
    // o cabeçalho (brasão + órgão/comarca/vara) vai no <thead>, que o navegador repete em cada página
    const tmp = new DOMParser().parseFromString(`<div id="r">${htmlCorrente()}</div>`, "text/html");
    const cab = tmp.querySelector(".ata .cab"); const cabHtml = cab ? cab.outerHTML : ""; cab?.remove();
    const resto = tmp.getElementById("r")!.innerHTML;
    const nome = String(rodape.nome).replace(/"/g, "'");
    d.open(); d.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${nomeArquivo}</title><style>@page{size:A4;margin:14mm 18mm 20mm;@bottom-left{content:counter(page);font:8pt Arial,sans-serif}@bottom-right{content:"${nome}\\A Juiz de Direito";white-space:pre;text-align:right;font:8pt Arial,sans-serif}}body{margin:0}table.pg{width:100%;border-collapse:collapse}table.pg>thead>tr>td,table.pg>tbody>tr>td{border:0;padding:0}${CSS_ATA}</style></head><body><div class="ata"><table class="pg"><thead><tr><td><div class="ata">${cabHtml}</div></td></tr></thead><tbody><tr><td>${resto}</td></tr></tbody></table></div></body></html>`); d.close();
    setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 2000); }, 400);
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(blocosParaTexto(htmlParaBlocos(htmlCorrente()))); msg("Texto da ata copiado"); } catch { msg("Não consegui copiar"); } };
  const word = async () => {
    try {
      const { blocosParaDocx } = await import("../templates/ataPreliminarDocx");
      const blob = await blocosParaDocx(htmlParaBlocos(htmlCorrente()), { juiz: ctx.juiz });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nomeArquivo + ".docx"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e: any) { msg("Falha ao gerar o Word: " + (e?.message || e)); }
  };

  const pedirAoCopiloto = async (texto?: string) => {
    const pedido = (texto ?? instrucao).trim();
    if (!pedido || !onCopilot || pensando) return;
    setInstrucao(""); setPensando(true); setAba("copiloto"); setPainel(true);
    setConversa((c) => [...c, { de: "eu", texto: pedido }]);
    try {
      const antes = htmlCorrente();
      const r = await onCopilot(pedido, antes);
      const novo = sanitizarHtmlAta(r.html || "");
      if (!novo.trim()) throw new Error("O copiloto não devolveu o documento.");
      setHistorico((h) => [...h.slice(-19), antes]);
      setHtmlBase(novo); if (doc.current) doc.current.innerHTML = novo; setSujo(true);
      setConversa((c) => [...c, { de: "ia", texto: (r.resumo || "Alteração feita no documento.") + " (ainda não salva)" }]);
    } catch (e: any) { setConversa((c) => [...c, { de: "ia", texto: "Não consegui alterar: " + (e?.message || e) }]); }
    finally { setPensando(false); }
  };

  const botao = "atav-btn h-8 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40";
  const SUGESTOES = ["Deixe o resumo mais curto e objetivo", "Acrescente um ponto de atenção sobre …", "Reescreva a seção de testemunhas em lista simples", "Marque como pendente a intimação de …"];
  return (
    <div className="atav fixed inset-0 z-[120] flex flex-col font-sans" data-testid="ata-preliminar-viewer" role="dialog" aria-label="Ata preliminar">
      <style>{CSS_VISUALIZADOR}</style>
      <div className="atav-bar h-12 shrink-0 flex items-center gap-3 px-3 border-b">
        <button onClick={tentarFechar} className="atav-btn p-1.5 rounded-full" title="Fechar (Esc)"><X className="w-5 h-5" /></button>
        <span className="atav-pdf px-1.5 py-0.5 rounded text-[10px] font-black">PDF</span>
        <span className="text-sm font-semibold truncate">{nomeArquivo}.pdf</span>
        {sujo ? <span className="atav-amber text-xs">• alterações não salvas</span> : (htmlEditado && htmlEditado.trim() ? <span className="atav-green text-xs">• versão editada salva</span> : <span className="atav-muted hidden md:inline text-xs truncate">{MODELO_ATA.nome}</span>)}
        <div className="ml-auto flex items-center gap-1">
          {aviso && <span className="atav-green text-xs mr-2">{aviso}</span>}
          {onSalvar && <>
            <button onClick={() => setEditando((e) => !e)} className={botao + (editando ? " atav-btn-on" : "")} title="Editar o texto direto no documento" data-testid="ata-editar"><Pencil className="w-4 h-4" /><span className="hidden sm:inline">{editando ? "Editando" : "Editar"}</span></button>
            <button onClick={desfazer} disabled={!historico.length} className={botao} title="Desfazer a última alteração do copiloto" data-testid="ata-desfazer"><Undo2 className="w-4 h-4" /></button>
            <button onClick={salvar} disabled={!sujo || salvando} className="atav-save h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 disabled:opacity-40" title="Salvar a edição (Ctrl+S)" data-testid="ata-salvar">{salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>Salvar</span></button>
            {sujo && <button onClick={descartar} className={botao} title="Descartar alterações não salvas">Descartar</button>}
            <span className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,.18)" }} />
          </>}
          {onRegenerate && <button onClick={refazer} disabled={carregando} className={botao} title="Ler os autos de novo e refazer a ata">{carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}<span className="hidden lg:inline">Gerar de novo</span></button>}
          <button onClick={copiar} className={botao} title="Copiar o texto"><Copy className="w-4 h-4" /><span className="hidden lg:inline">Copiar</span></button>
          <button onClick={word} className={botao} title="Baixar em Word (.docx)"><FileText className="w-4 h-4" /><span className="hidden lg:inline">Word</span></button>
          <button onClick={imprimir} className="atav-primary h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1.5" title="Imprimir ou salvar como PDF"><Printer className="w-4 h-4" /><span>PDF / Imprimir</span></button>
          <button onClick={() => setPainel((p) => !p)} className={botao + " ml-1"} title="Painel lateral">{painel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}</button>
        </div>
      </div>
      <div className="atav-sub h-10 shrink-0 flex items-center justify-center gap-3 px-3 border-b text-xs">
        <button onClick={() => irPara(pagina - 1)} className="atav-btn p-1 rounded" title="Página anterior"><ChevronLeft className="w-4 h-4" /></button>
        <span>Página <b>{pagina}</b> / {totalPaginas}</span>
        <button onClick={() => irPara(pagina + 1)} className="atav-btn p-1 rounded" title="Próxima página"><ChevronRight className="w-4 h-4" /></button>
        <span className="w-px h-4" style={{ background: "rgba(255,255,255,.2)" }} />
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="atav-btn p-1 rounded" title="Diminuir"><ZoomOut className="w-4 h-4" /></button>
        <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} className="atav-btn p-1 rounded" title="Aumentar"><ZoomIn className="w-4 h-4" /></button>
        {editando && <span className="atav-amber ml-3">Modo edição: clique no texto para alterar; Ctrl+S salva.</span>}
      </div>
      <div className="flex-1 min-h-0 flex">
        <div ref={rolagem} onScroll={aoRolar} className="atav-mesa flex-1 overflow-auto py-6 px-3">
          <div style={{ width: A4_LARGURA, margin: "0 auto", zoom }}>
            <div ref={folha} className="bg-white shadow-2xl" style={{ width: A4_LARGURA, minHeight: A4_ALTURA, padding: "56px 64px", outline: editando ? "2px solid #60a5fa" : "none" }}>
              <style>{CSS_ATA}</style>
              <div ref={doc} data-testid="ata-documento" contentEditable={editando} suppressContentEditableWarning spellCheck={editando} onInput={() => setSujo(true)} style={{ outline: "none", cursor: editando ? "text" : "default" }} />
              <div className="ata ata-rodape" data-testid="ata-rodape"><div>1 / {totalPaginas}</div><div>{rodape.nome}<br />{rodape.cargo}</div></div>
            </div>
          </div>
        </div>
        {painel && (
          <aside className="atav-painel w-96 shrink-0 border-l flex-col hidden md:flex" data-testid="ata-painel">
            <div className="flex border-b text-xs font-semibold" style={{ borderColor: "rgba(255,255,255,.1)" }}>
              <button onClick={() => setAba("resumo")} className={`atav-tab flex-1 py-2.5 ${aba === "resumo" ? "atav-tab-on" : ""}`}>Resumo</button>
              {onCopilot && <button onClick={() => setAba("copiloto")} data-testid="ata-aba-copiloto" className={`atav-tab flex-1 py-2.5 flex items-center justify-center gap-1.5 ${aba === "copiloto" ? "atav-tab-on" : ""}`}><Sparkles className="w-3.5 h-3.5" />Copiloto</button>}
            </div>
            {aba === "resumo" && (
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {ata.alertaInjecao && <div className="atav-claro"><AvisoPromptInjection info={ata.alertaInjecao as any} /></div>}
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#dfe3ee" }}>{ata.resumo || "Resumo não disponível."}</p>
                {aConferir > 0 && <div className="atav-aviso text-xs">{aConferir} item(ns) marcado(s) “conferir”: a localização ou o nome citado não foi encontrado no texto dos autos.</div>}
                <div className="space-y-1.5">
                  {(ata.pontosAtencao || []).map((p, i) => (
                    <div key={i} className={`atav-card text-xs ${p.nivel === "alto" ? "atav-card-alto" : p.nivel === "medio" ? "atav-card-medio" : ""}`}>
                      <div className="font-bold uppercase text-[10px] opacity-80">{p.nivel || "info"}</div>
                      <div>{p.texto}</div>
                      <div className="opacity-70 mt-0.5">{p.localizacao || "localização não identificada"}</div>
                    </div>
                  ))}
                </div>
                <p className="atav-muted text-[10px]">Gerado a partir dos autos pela IA. Confira os itens antes de usar.</p>
              </div>
            )}
            {aba === "copiloto" && onCopilot && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-auto p-3 space-y-2" data-testid="ata-conversa">
                  {conversa.length === 0 && (
                    <div className="text-xs space-y-2" style={{ color: "#c9cfdd" }}>
                      <p>Peça alterações ou acréscimos à ata em linguagem natural. O copiloto altera só o que você pedir, sem inventar fatos: dados novos precisam vir do seu pedido ou dos autos.</p>
                      <div className="space-y-1">{SUGESTOES.map((s) => <button key={s} onClick={() => setInstrucao(s)} className="atav-chip block w-full text-left px-2 py-1.5">{s}</button>)}</div>
                    </div>
                  )}
                  {conversa.map((c, i) => <div key={i} className={`text-xs px-2.5 py-2 whitespace-pre-wrap ${c.de === "eu" ? "atav-eu ml-6" : "atav-ia mr-6"}`}>{c.texto}</div>)}
                  {pensando && <div className="text-xs flex items-center gap-2" style={{ color: "#c9cfdd" }}><Loader2 className="w-3.5 h-3.5 animate-spin" />Alterando o documento…</div>}
                </div>
                <div className="p-3 border-t space-y-1.5" style={{ borderColor: "rgba(255,255,255,.1)" }}>
                  <textarea value={instrucao} onChange={(e) => setInstrucao(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); pedirAoCopiloto(); } }} rows={3} placeholder="Ex.: acrescente que a testemunha Ana foi intimada por mandado em 10/03 (Mov. 25)…" className="atav-input w-full p-2 text-xs" data-testid="ata-instrucao" />
                  <div className="flex items-center justify-between">
                    <span className="atav-muted text-[10px]">Enter envia · Shift+Enter quebra linha</span>
                    <button onClick={() => pedirAoCopiloto()} disabled={!instrucao.trim() || pensando} className="atav-primary h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 disabled:opacity-40" data-testid="ata-enviar"><Send className="w-3.5 h-3.5" />Enviar</button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
