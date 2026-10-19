import React from "react";
import type { GenerationResult } from "../types";
import { textoDoCorte } from "../utils/corteAutos";

// Aviso fixo na minuta quando partes dos autos não foram lidas pelo sistema: a "ausência de prova" pode ser só falta de leitura.
export function AvisoCoberturaLeitura({ info }: { info: NonNullable<GenerationResult["coberturaLeitura"]> }) {
  const lacunas = info.lacunas || [];
  if (lacunas.length === 0 && !info.textoCortado) {
    if (!info.paginasOcr && !info.paginasImagem) return null;
    return (
      <div className="max-w-4xl mx-auto px-4 py-2 bg-emerald-50 text-emerald-900 rounded-lg text-xs font-sans border border-emerald-300" data-testid="aviso-cobertura-ok">
        ✅ Leitura completa dos autos ({info.totalPaginas} páginas).
        {info.paginasOcr ? ` ${info.paginasOcr} página(s) sem texto foram lidas por OCR com IA.` : ""}
        {info.paginasImagem ? ` ${info.paginasImagem} página(s) foram enviadas como imagem para leitura visual.` : ""} Confira nomes, valores e datas dessas páginas, pois a leitura por imagem pode errar.
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-3 bg-red-50 text-red-950 rounded-lg text-xs font-sans shadow-xs border-2 border-red-500" data-testid="aviso-cobertura-lacunas">
      <div className="font-bold text-sm text-red-800 mb-1">⚠️ Atenção: algumas páginas dos autos não puderam ser lidas — confira antes de assinar</div>
      {lacunas.length > 0 && (
        <p className="leading-relaxed">
          Páginas que continuam sem texto, mesmo depois da tentativa de OCR (imagem/escaneado):{" "}
          {lacunas.map((l, i) => <span key={i}>{i > 0 ? "; " : ""}<strong>{l.arquivo}</strong>, págs. {l.paginas}</span>)}.
          Essas páginas podem conter provas, documentos ou a contestação. Qualquer afirmação da minuta de que “não há prova” ou “não foi juntado” precisa ser conferida nelas.
        </p>
      )}
      {info.textoCortado && (
        <div className="mt-1 leading-relaxed" data-testid="aviso-corte">
          <p>Os autos passaram do limite de leitura da análise normal e <strong>parte do final do processo foi CORTADA e NÃO foi lida</strong>:</p>
          {(info.cortes || []).length > 0 && <ul className="list-disc pl-5 my-1">{(info.cortes || []).map((c, i) => <li key={i}><strong>{textoDoCorte(c)}</strong></li>)}</ul>}
          <p>Documentos, contestação, provas ou decisões que estejam nessas páginas não foram considerados. Para ler tudo, use a leitura em lotes (processo gigante) ou envie o processo dividido em partes menores.</p>
        </div>
      )}
      <p className="mt-1.5 leading-relaxed">O sistema foi instruído a não decidir por ausência de prova nessas condições e a marcar a minuta com “[CONFERIR PÁGINAS NÃO LIDAS]”. Você pode refazer a análise escolhendo OCR ou leitura visual dessas páginas.</p>
    </div>
  );
}
