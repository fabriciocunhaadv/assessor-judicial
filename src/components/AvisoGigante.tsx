import React from "react";
import type { GenerationResult } from "../types";

const faixa = (x: { de: number; ate: number }) => (x.de === x.ate ? `${x.de}` : `${x.de}–${x.ate}`);

// Aviso fixo no topo da minuta de processo gigante: foi lido em lotes, e o que foi abreviado ou repetido fica à vista.
export function AvisoGigante({ info }: { info: NonNullable<GenerationResult["gigante"]> }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-3 bg-sky-50 text-sky-950 rounded-lg text-xs font-sans shadow-xs border-2 border-sky-400" data-testid="aviso-gigante">
      <div className="font-bold text-sm text-sky-900 mb-1">📚 Processo gigante: lido em lotes, em segundo plano</div>
      <p className="leading-relaxed">
        Os autos têm <strong>{info.paginas} páginas</strong>. A IA leu todos os trechos em <strong>{info.lotes} lote(s)</strong>{info.niveis > 0 ? `, fundidos em ${info.niveis} nível(is)` : ""}, e a minuta foi redigida a partir do dossiê resultante
        mais <strong>{info.essenciaisIntegra} página(s) essenciais na íntegra</strong> (petições, contestação, decisões, laudos). Cada item do dossiê cita a página de origem.
      </p>
      {info.parte && (
        <p className="mt-1.5 leading-relaxed font-bold text-red-800" data-testid="aviso-parte">⚠️ Esta minuta cobre só a PARTE {info.parte.indice} de {info.parte.total} dos autos (páginas {info.parte.de.toLocaleString("pt-BR")} a {info.parte.ate.toLocaleString("pt-BR")} de {info.parte.totalPaginas.toLocaleString("pt-BR")}). As outras partes não foram consideradas aqui: confira também a minuta das demais partes antes de assinar.</p>
      )}
      {info.ocrPaginas ? <p className="mt-1.5 leading-relaxed">🔤 <strong>{info.ocrPaginas} página(s) sem texto foram lidas por OCR com IA</strong>: confira nomes, valores e datas dessas páginas, pois a leitura por imagem pode errar.</p> : null}
      {(info.verificacaoAusencia || []).length > 0 && (
        <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-400 text-amber-950" data-testid="verificacao-ausencia">
          <p className="font-bold">🔎 Conferir: a minuta afirma ausência de prova, mas o índice dos autos encontrou o termo em outras páginas</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            {(info.verificacaoAusencia || []).map((v, i) => (
              <li key={i}><em>“{v.trecho}”</em><br />Termo “{v.termo}” aparece em {v.total} página(s), por exemplo: {v.paginas.slice(0, 4).map((p, k) => <span key={k}>{k > 0 ? "; " : ""}{p.arquivo}, pág. {p.pagina}</span>)}. Pode ser falso alarme (o termo pode aparecer em outro contexto): confira antes de assinar.</li>
            ))}
          </ul>
        </div>
      )}
      {info.dossieAbreviado && (
        <p className="mt-1.5 leading-relaxed font-bold text-red-800">⚠️ O dossiê passou do limite de entrada da IA e parte dele foi omitida: confira os pontos decisivos diretamente nos autos.</p>
      )}
      {info.omitidas.length > 0 && (
        <p className="mt-1.5 leading-relaxed"><strong>Páginas idênticas a outras já lidas (lidas uma vez só):</strong> {info.omitidas.slice(0, 30).map((x, i) => <span key={i}>{i > 0 ? "; " : ""}{faixa(x)}</span>)}{info.omitidas.length > 30 ? "; …" : ""}</p>
      )}
      {info.abreviadas.length > 0 && (
        <p className="mt-1.5 leading-relaxed"><strong>Documentos sem relevância para a minuta (só o cabeçalho foi lido):</strong> {info.abreviadas.slice(0, 30).map((x, i) => <span key={i}>{i > 0 ? "; " : ""}{faixa(x)}{x.motivo ? ` (${x.motivo.toLowerCase()})` : ""}</span>)}{info.abreviadas.length > 30 ? "; …" : ""}</p>
      )}
      <p className="mt-1.5 leading-relaxed text-sky-900">Como o texto passou por resumos, confira nos autos os pontos decisivos (valores, datas, nomes e documentos) antes de assinar.</p>
    </div>
  );
}
