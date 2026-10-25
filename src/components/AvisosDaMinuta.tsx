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
    itens.push({ id: "fontes", tom: atencao ? "atencao" : "ok", rotulo: `📚 Fontes consultadas · ${partes.join(" · ")}`, conteudo: <AvisoFontesConsultadas info={f} /> });
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
