import React, { useState } from "react";
import type { GenerationResult } from "../types";
import { AvisoAutosReduzidos } from "./AvisoAutosReduzidos";
import { AvisoCoberturaLeitura } from "./AvisoCoberturaLeitura";
import { AvisoGigante } from "./AvisoGigante";
import { AvisoPromptInjection } from "./AvisoPromptInjection";
import { AvisoFontesConsultadas } from "./AvisoFontesConsultadas";

type Tom = "ok" | "atencao" | "perigo" | "info";
const COR: Record<Tom, string> = {
  ok: "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100",
  atencao: "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100",
  perigo: "bg-red-50 border-red-400 text-red-900 hover:bg-red-100",
  info: "bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100",
};
interface Item { id: string; rotulo: string; tom: Tom; conteudo: React.ReactNode }

/** Avisos do começo da minuta (alerta de prompt injection, fontes consultadas, leitura dos autos...): ficam RECOLHIDOS em botões; o usuário abre só o que quiser ver. */
export function AvisosDaMinuta({ result }: { result: Partial<GenerationResult> & Record<string, any> }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const alternar = (id: string) => setAbertos((a) => { const n = new Set(a); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const itens: Item[] = [];

  const inj = result?.alertaInjecao;
  if (inj && inj.verificado !== false) itens.push({ id: "injecao", tom: inj.total ? "perigo" : "ok", rotulo: inj.total ? `🚨 Alerta de prompt injection (${inj.total})` : "✅ Prompt injection: nada encontrado", conteudo: <AvisoPromptInjection info={inj} /> });

  const f = result?.fontesConsultadas;
  if (f) {
    const atencao = (f.naoLocalizados?.length || 0) + (f.indisponiveis?.length || 0) + (f.locais?.length || 0);
    const partes = [`${f.legislacao?.length || 0} artigo(s) conferido(s)`, ...(atencao ? [`${atencao} com atenção`] : [])];
    itens.push({ id: "fontes", tom: atencao ? "atencao" : (f.legislacao?.length || f.precedentes?.length ? "ok" : "info"), rotulo: (f.legislacao?.length || 0) + atencao + (f.precedentes?.length || 0) === 0 ? "📚 Fontes consultadas · nenhum artigo de lei citado nos autos" : `📚 Fontes consultadas · ${partes.join(" · ")}`, conteudo: <AvisoFontesConsultadas info={f} /> });
  }

  if (result?.gigante) itens.push({ id: "gigante", tom: "info", rotulo: "📚 Processo gigante", conteudo: <AvisoGigante info={result.gigante} /> });
  if (result?.autosReduzidos) itens.push({ id: "reduzidos", tom: "atencao", rotulo: "✂️ Autos reduzidos", conteudo: <AvisoAutosReduzidos info={result.autosReduzidos} /> });

  const c = result?.coberturaLeitura;
  if (c) {
    const incompleta = (c.lacunas || []).length > 0 || !!c.textoCortado;
    if (incompleta || c.paginasOcr || c.paginasImagem) itens.push({ id: "cobertura", tom: incompleta ? "perigo" : "ok", rotulo: incompleta ? "⚠️ Leitura incompleta dos autos" : "✅ Leitura completa dos autos", conteudo: <AvisoCoberturaLeitura info={c} /> });
  }

  const loc = result?.avisoLocalizacao;
  if (loc && loc.movsInexistentes?.length > 0) itens.push({
    id: "localizacao", tom: "atencao", rotulo: `📍 Conferir localização (${loc.movsInexistentes.length})`,
    conteudo: <div data-testid="aviso-localizacao" className="max-w-4xl mx-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"><strong>Conferir localização:</strong> a minuta cita {loc.movsInexistentes.map((n: number) => `Mov. ${n}`).join(", ")}, que não aparece(m) nos carimbos dos autos enviados. Confira antes de usar.</div>,
  });

  const caixa = (cor: string, testid: string, children: React.ReactNode) => <div data-testid={testid} className={`max-w-4xl mx-auto rounded-lg border px-3 py-2 text-xs ${cor}`}>{children}</div>;
  const comp = result?.avisoCompetencia;
  if (comp) itens.push({ id: "competencia", tom: "perigo", rotulo: "⚖️ Conferir competência do juízo", conteudo: caixa("border-red-400 bg-red-50 text-red-900", "aviso-competencia", <><strong>Conferir competência:</strong> o juízo da capa ({comp.juizo}) parece incompatível com o objeto: {comp.motivo}. Revise o ato antes de usar.</>) });
  const ped = result?.avisoPedidoSemPeca;
  if (ped?.length) itens.push({ id: "pedido-sem-peca", tom: "atencao", rotulo: `🧾 Pedido de parte sem peça (${ped.length})`, conteudo: caixa("border-amber-300 bg-amber-50 text-amber-900", "aviso-pedido-sem-peca", <><strong>Pedido ou manifestação sem localização:</strong> confirme nos autos se existe a peça.<ul className="list-disc pl-5 mt-1">{ped.map((t: string, i: number) => <li key={i}>“{t}”</li>)}</ul></>) });
  const vaz = result?.avisoVazamento;
  if (vaz?.length) itens.push({ id: "vazamento", tom: "atencao", rotulo: "🧹 Título interno na minuta", conteudo: caixa("border-amber-300 bg-amber-50 text-amber-900", "aviso-vazamento", <><strong>Título de etapa interna no texto:</strong> {vaz.join(", ")}. Remova antes de usar.</>) });
  const cit = result?.avisoCitacao;
  if (cit?.length) itens.push({ id: "citacao", tom: "atencao", rotulo: `📍 Arquivo/página inexistente (${cit.length})`, conteudo: caixa("border-amber-300 bg-amber-50 text-amber-900", "aviso-citacao", <><strong>Conferir citação:</strong> {cit.join("; ")} — o arquivo ou a página não existe nos carimbos dos autos enviados.</>) });

  if (itens.length === 0) return null;
  return (
    <div className="max-w-4xl mx-auto space-y-2" data-testid="avisos-da-minuta">
      <div className="flex flex-wrap gap-1.5">
        {itens.map((it) => (
          <button key={it.id} type="button" data-testid={`chip-${it.id}`} aria-expanded={abertos.has(it.id)} onClick={() => alternar(it.id)}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer transition flex items-center gap-1 ${COR[it.tom]} ${abertos.has(it.id) ? "ring-2 ring-offset-1 ring-slate-300" : ""}`}>
            <span>{it.rotulo}</span><span className="opacity-60">{abertos.has(it.id) ? "▲" : "▼"}</span>
          </button>
        ))}
      </div>
      {itens.map((it) => <div key={it.id} hidden={!abertos.has(it.id)} data-testid={`painel-${it.id}`}>{it.conteudo}</div>)}
    </div>
  );
}
