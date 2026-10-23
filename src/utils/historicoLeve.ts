// HISTÓRICO LEVE: resumo de cada ato com só o que a LISTA mostra (processo, partes, título, unidade, autor, data, marca de lançado, excertos da fundamentação e do dispositivo).
// A minuta completa e o texto dos autos (centenas de KB por ato) ficam só no documento completo e só são baixados quando o usuário abre aquele ato.
// Sem Firebase de propósito: é função pura, testável sozinha.
import { extractFromCoverPage, isInvalidPartyName } from "./judicialMetadataExtractor";

const PESADOS = new Set(["processTextContext", "chatMessages", "versions", "originalMinute", "result", "holisticSynopsis"]);
export const digitosDoProcesso = (s: any): string => String(s || "").replace(/\D/g, "");
export const ehLeve = (a: any): boolean => !!a && a.leve === true;

/** Cópia enxuta do ato para a lista. `fonte` é o caminho do documento completo (para abri-lo depois). */
export function resumoLeve(a: any, fonte?: string): any {
  const out: any = {};
  for (const [k, v] of Object.entries(a || {})) {
    if (PESADOS.has(k) || k === "leve") continue;
    if (v === null || typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length <= 400)) out[k] = v;
  }
  const min: any = a?.result?.minute || {};
  const partes: any = min.parties || {};
  const semAutor = isInvalidPartyName(partes.author), semReu = isInvalidPartyName(partes.defendant);
  const semProc = !min.processNumber || String(min.processNumber).length < 5, semUnidade = !min.judicialUnit;
  // o que a lista antes tirava da capa dos autos já vai pronto no resumo (a capa em si não vai)
  const capa = semAutor || semReu || semProc || semUnidade
    ? extractFromCoverPage([a?.processTextContext, min.fullFormattedText, min.relatorio].filter(Boolean).join("\n").slice(0, 60000))
    : null;
  const num = (!semProc ? min.processNumber : "") || capa?.processNumber || a?.processNumber || "";
  out.result = {
    minute: {
      title: min.title, processNumber: num, judicialUnit: min.judicialUnit || capa?.judicialUnit || "", comarca: min.comarca, vara: min.vara,
      parties: { author: !semAutor ? partes.author : capa?.author || "", defendant: !semReu ? partes.defendant : capa?.defendant || "" },
      relatorio: typeof min.relatorio === "string" ? min.relatorio.slice(0, 300) : undefined,
      fundamentacao: typeof min.fundamentacao === "string" ? min.fundamentacao.slice(0, 500) : undefined,
      dispositivo: typeof min.dispositivo === "string" ? min.dispositivo.slice(0, 400) : undefined,
    },
    ...(a?.result?.paradigmUsed?.title ? { paradigmUsed: { title: a.result.paradigmUsed.title } } : {}),
  };
  out.chatCount = Array.isArray(a?.chatMessages) ? a.chatMessages.length : 0;
  out.versoesCount = Math.max(Array.isArray(a?.versions) ? a.versions.length : 0, Array.isArray(a?.result?.versions) ? a.result.versions.length : 0);
  out.numeroLimpo = digitosDoProcesso(a?.processNumber || num);
  out.corrompido = !a?.id || !!(a?.result?.error || a?.result?.isError) || (!a?.result?.minute && !a?.originalMinute);
  if (fonte) out.fonte = fonte;
  out.leve = true;
  return out;
}
