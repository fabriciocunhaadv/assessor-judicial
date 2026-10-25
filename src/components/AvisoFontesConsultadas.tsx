import React from "react";
import { CheckCircle2, AlertTriangle, Info, CloudOff } from "lucide-react";
import type { FontesConsultadas } from "../types";

const Grupo = ({ cor, icone, titulo, itens, dica }: { cor: string; icone: React.ReactNode; titulo: string; itens: string[]; dica?: string }) => (
  <div className={`rounded-md border px-2.5 py-1.5 ${cor}`}>
    <div className="font-bold flex items-center gap-1.5">{icone}<span>{titulo}</span></div>
    <ul className="mt-0.5 list-disc pl-5 leading-relaxed">{itens.map((x, i) => <li key={i}>{x}</li>)}</ul>
    {dica && <p className="mt-0.5 pl-0.5 opacity-80">{dica}</p>}
  </div>
);

// Mostra, junto da minuta, o que o sistema realmente consultou: o que DEU CERTO (verde suave) separado do que não pôde ser conferido (âmbar, azul e rosa suaves).
export function AvisoFontesConsultadas({ info }: { info: FontesConsultadas }) {
  const n = (l?: string[]) => (l || []).length;
  if (!info.consultado && !n(info.legislacao) && !n(info.precedentes) && !n(info.naoLocalizados) && !n(info.indisponiveis) && !n(info.locais)) return null;
  return (
    <div className="max-w-4xl mx-auto px-3 py-2.5 rounded-lg text-xs font-sans border border-slate-200 bg-slate-50 text-slate-800 space-y-1.5" data-testid="aviso-fontes">
      <div className="font-bold text-slate-900">📚 Fontes consultadas nesta minuta</div>
      {n(info.legislacao) > 0 && <Grupo cor="bg-emerald-50 border-emerald-200 text-emerald-950" icone={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />} titulo="Conferido no texto oficial do Planalto" itens={info.legislacao} />}
      {n(info.precedentes) > 0 && <Grupo cor="bg-emerald-50 border-emerald-200 text-emerald-950" icone={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />} titulo="Súmulas, teses e informativos aplicáveis" itens={info.precedentes.slice(0, 8)} />}
      {n(info.naoLocalizados) > 0 && <Grupo cor="bg-amber-50 border-amber-200 text-amber-950" icone={<AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />} titulo="Não consegui localizar o artigo no texto oficial" itens={info.naoLocalizados} dica="Confira o número do artigo e a redação; a IA foi avisada de que este dispositivo não foi conferido." />}
      {n(info.indisponiveis) > 0 && <Grupo cor="bg-rose-50 border-rose-200 text-rose-950" icone={<CloudOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />} titulo="Site do Planalto não respondeu para" itens={info.indisponiveis} dica="Estes dispositivos não foram conferidos agora; confira manualmente." />}
      {n(info.locais) > 0 && <Grupo cor="bg-sky-50 border-sky-200 text-sky-950" icone={<Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />} titulo="Leis municipais ou estaduais (o sistema não consulta)" itens={info.locais} dica="Confira o teor nos autos." />}
      {!n(info.legislacao) && !n(info.naoLocalizados) && !n(info.indisponiveis) && <p className="text-slate-600">Nenhum artigo de lei federal foi citado nos autos para conferir no Planalto. Os artigos que a própria minuta citar são conferidos na 2ª etapa.</p>}
    </div>
  );
}
