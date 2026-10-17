import React from "react";
import type { GenerationResult } from "../types";

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
      <div className="font-bold text-sm text-red-800 mb-1">🚨 Parte dos autos NÃO foi lida pelo sistema: confira antes de assinar</div>
      {lacunas.length > 0 && (
        <p className="leading-relaxed">
          Páginas sem texto lido (imagem/escaneado sem OCR):{" "}
          {lacunas.map((l, i) => <span key={i}>{i > 0 ? "; " : ""}<strong>{l.arquivo}</strong>, págs. {l.paginas}</span>)}.
          Essas páginas podem conter provas, documentos ou a contestação. Qualquer afirmação da minuta de que “não há prova” ou “não foi juntado” precisa ser conferida nelas.
        </p>
      )}
      {info.textoCortado && (
        <p className="mt-1 leading-relaxed">Os autos passaram do limite técnico de leitura e o <strong>final do processo foi cortado</strong>: documentos posteriores podem não ter sido lidos.</p>
      )}
      <p className="mt-1.5 leading-relaxed">O sistema foi instruído a não decidir por ausência de prova nessas condições e a marcar a minuta com “[CONFERIR PÁGINAS NÃO LIDAS]”. Você pode refazer a análise escolhendo OCR ou leitura visual dessas páginas.</p>
    </div>
  );
}
