import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Printer, Copy, FileText, ZoomIn, ZoomOut, RefreshCw, ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, Loader2 } from "lucide-react";
import type { AtaPreliminarDados } from "../types";
import { MODELO_ATA, montarBlocos, blocosParaHtml, blocosParaTexto, CSS_ATA } from "../templates/ataPreliminarModelo";
import { AvisoPromptInjection } from "./AvisoPromptInjection";

const A4_ALTURA = 1123;      // px de uma folha A4 a 96 dpi
const A4_LARGURA = 794;

// Visualizador da ata preliminar, no estilo de um leitor de documento: barra superior, folha A4 ao centro com zoom e painel de resumo à direita.
export function AtaPreliminarViewer({ ata, processNumber, onClose, onRegenerate, carregando }: { ata: AtaPreliminarDados; processNumber?: string; onClose: () => void; onRegenerate?: () => void; carregando?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [painel, setPainel] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [aviso, setAviso] = useState("");
  const rolagem = useRef<HTMLDivElement>(null);
  const folha = useRef<HTMLDivElement>(null);
  const blocos = useMemo(() => montarBlocos(ata, MODELO_ATA), [ata]);
  const html = useMemo(() => blocosParaHtml(blocos), [blocos]);
  const numero = ata.cabecalho?.numeroProcesso || processNumber || "processo";
  const nomeArquivo = `ATA-PRELIMINAR-${String(numero).replace(/[^\d.-]/g, "") || "processo"}`;
  const aConferir = useMemo(() => [...(ata.partes || []), ...(ata.testemunhas || []), ...(ata.citacoesIntimacoes || []), ...(ata.pedidosAudiencia || []), ...(ata.pontosAtencao || [])].filter((x: any) => x.conferir).length, [ata]);

  useEffect(() => {
    const medir = () => { const h = folha.current ? folha.current.getBoundingClientRect().height / zoom : A4_ALTURA; setTotalPaginas(Math.max(1, Math.ceil(h / A4_ALTURA))); };
    medir();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    if (ro && folha.current) ro.observe(folha.current);
    return () => ro?.disconnect();
  }, [html, zoom]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const aoRolar = () => { const el = rolagem.current; if (!el) return; setPagina(Math.min(totalPaginas, Math.max(1, Math.floor(el.scrollTop / (A4_ALTURA * zoom)) + 1))); };
  const irPara = (n: number) => { const el = rolagem.current; if (el) el.scrollTo({ top: (Math.min(totalPaginas, Math.max(1, n)) - 1) * A4_ALTURA * zoom, behavior: "smooth" }); };
  const msg = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 2500); };

  const imprimir = () => {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const d = f.contentDocument!;
    d.open(); d.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${nomeArquivo}</title><style>@page{size:A4;margin:18mm}body{margin:0}${CSS_ATA}</style></head><body>${html}</body></html>`); d.close();
    setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 2000); }, 300);
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(blocosParaTexto(blocos)); msg("Texto da ata copiado"); } catch { msg("Não consegui copiar"); } };
  const word = async () => {
    try {
      const { blocosParaDocx } = await import("../templates/ataPreliminarDocx");
      const blob = await blocosParaDocx(blocos);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nomeArquivo + ".docx"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e: any) { msg("Falha ao gerar o Word: " + (e?.message || e)); }
  };

  const botao = "h-8 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 text-neutral-200 hover:bg-white/10 disabled:opacity-40";
  return (
    <div className="fixed inset-0 z-[120] bg-neutral-900 text-neutral-100 flex flex-col font-sans" data-testid="ata-preliminar-viewer" role="dialog" aria-label="Ata preliminar">
      <div className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-white/10">
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10" title="Fechar (Esc)"><X className="w-5 h-5" /></button>
        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-black">PDF</span>
        <span className="text-sm font-semibold truncate">{nomeArquivo}.pdf</span>
        <span className="hidden md:inline text-xs text-neutral-400 truncate">{MODELO_ATA.nome}</span>
        <div className="ml-auto flex items-center gap-1">
          {aviso && <span className="text-xs text-emerald-300 mr-2">{aviso}</span>}
          {onRegenerate && <button onClick={onRegenerate} disabled={carregando} className={botao} title="Ler os autos de novo e refazer a ata">{carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}<span className="hidden sm:inline">Gerar de novo</span></button>}
          <button onClick={copiar} className={botao} title="Copiar o texto"><Copy className="w-4 h-4" /><span className="hidden sm:inline">Copiar</span></button>
          <button onClick={word} className={botao} title="Baixar em Word (.docx)"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Word</span></button>
          <button onClick={imprimir} className="h-8 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white" title="Imprimir ou salvar como PDF"><Printer className="w-4 h-4" /><span>PDF / Imprimir</span></button>
          <button onClick={() => setPainel((p) => !p)} className={botao + " ml-1"} title="Painel de resumo">{painel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}</button>
        </div>
      </div>
      <div className="h-10 shrink-0 flex items-center justify-center gap-3 px-3 border-b border-white/10 bg-neutral-800/60 text-xs">
        <button onClick={() => irPara(pagina - 1)} className="p-1 rounded hover:bg-white/10" title="Página anterior"><ChevronLeft className="w-4 h-4" /></button>
        <span>Página <b>{pagina}</b> / {totalPaginas}</span>
        <button onClick={() => irPara(pagina + 1)} className="p-1 rounded hover:bg-white/10" title="Próxima página"><ChevronRight className="w-4 h-4" /></button>
        <span className="w-px h-4 bg-white/20" />
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="p-1 rounded hover:bg-white/10" title="Diminuir"><ZoomOut className="w-4 h-4" /></button>
        <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} className="p-1 rounded hover:bg-white/10" title="Aumentar"><ZoomIn className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div ref={rolagem} onScroll={aoRolar} className="flex-1 overflow-auto bg-neutral-700/40 py-6 px-3">
          <div style={{ width: A4_LARGURA, margin: "0 auto", zoom }}>
            <div ref={folha} className="bg-white shadow-2xl" style={{ width: A4_LARGURA, minHeight: A4_ALTURA, padding: "56px 64px" }}>
              <style>{CSS_ATA}</style>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </div>
        {painel && (
          <aside className="w-80 shrink-0 border-l border-white/10 bg-neutral-800 overflow-auto p-3 space-y-3 hidden md:block" data-testid="ata-painel">
            <div className="text-sm font-bold">Resumo e pontos de atenção</div>
            {ata.alertaInjecao && <div className="bg-white rounded-lg p-1"><AvisoPromptInjection info={ata.alertaInjecao as any} /></div>}
            <p className="text-xs leading-relaxed text-neutral-200 whitespace-pre-wrap">{ata.resumo || "Resumo não disponível."}</p>
            {aConferir > 0 && <div className="text-xs rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-200 p-2">{aConferir} item(ns) marcado(s) “conferir”: a localização ou o nome citado não foi encontrado no texto dos autos.</div>}
            <div className="space-y-1.5">
              {(ata.pontosAtencao || []).map((p, i) => (
                <div key={i} className={`text-xs rounded-lg p-2 border ${p.nivel === "alto" ? "border-red-400/50 bg-red-500/10" : p.nivel === "medio" ? "border-amber-400/40 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
                  <div className="font-bold uppercase text-[10px] opacity-80">{p.nivel || "info"}</div>
                  <div>{p.texto}</div>
                  <div className="opacity-70 mt-0.5">{p.localizacao || "localização não identificada"}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-neutral-400">Gerado a partir dos autos pela IA. Confira os itens antes de usar.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
