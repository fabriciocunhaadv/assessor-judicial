// Limite de tamanho dos atos gravados no Histórico (nuvem).
// O Firestore rejeita documentos acima de 1 MiB. O ato salvo leva o texto dos autos (processTextContext) e outros blocos grandes;
// em processos longos (sentenças, entrada "texto extraído do PDF") o documento passava do limite, a gravação falhava sem aviso e o
// processo "concluído" não aparecia no Histórico. Aqui só a cópia que vai à nuvem é encurtada; a minuta nunca é cortada.
import type { SavedAnalysis } from "../types";

export const bytesUtf8 = (o: unknown): number => {
  try { return new TextEncoder().encode(JSON.stringify(o)).length; } catch { return JSON.stringify(o || "").length * 2; }
};

const AVISO_CORTE = "\n[... texto cortado nesta cópia por tamanho ...]";
const cortar = (s: unknown, max: number): unknown => (typeof s === "string" && s.length > max ? s.slice(0, max) + AVISO_CORTE : s);

// do menos importante para o mais importante (a minuta fica por último e só é tocada se nada mais resolver)
const BLOCOS_OPCIONAIS = ["holisticSynopsis", "stage1Snapshot", "auditAnalysis", "groundingSources", "cadernoTesesApplied", "paradigmUsed"];

export function limitarAtoParaNuvem(ato: SavedAnalysis, limiteBytes = 850_000): { dado: SavedAnalysis; cortou: string[] } {
  const dado: any = { ...ato, result: ato.result ? { ...(ato.result as any) } : ato.result };
  const cortou: string[] = [];
  if (bytesUtf8(dado) <= limiteBytes) return { dado, cortou };
  // 1) o texto dos autos, em metades, até 20 mil caracteres (serve só de contexto)
  for (let i = 0; i < 12 && bytesUtf8(dado) > limiteBytes && typeof dado.processTextContext === "string" && dado.processTextContext.length > 20_000; i++) {
    dado.processTextContext = cortar(dado.processTextContext.replace(AVISO_CORTE, "").slice(0, Math.floor(dado.processTextContext.length / 2)), Infinity) + AVISO_CORTE;
    if (!cortou.includes("processTextContext")) cortou.push("processTextContext");
  }
  // 2) blocos opcionais, um a um
  for (const b of BLOCOS_OPCIONAIS) {
    if (bytesUtf8(dado) <= limiteBytes) break;
    if (dado[b] !== undefined) { delete dado[b]; cortou.push(b); }
    if (dado.result && dado.result[b] !== undefined) { delete dado.result[b]; cortou.push("result." + b); }
  }
  // 3) mensagens do chat e, por fim, o contexto restante
  if (bytesUtf8(dado) > limiteBytes && Array.isArray(dado.chatMessages) && dado.chatMessages.length > 6) { dado.chatMessages = dado.chatMessages.slice(-6); cortou.push("chatMessages"); }
  if (bytesUtf8(dado) > limiteBytes && typeof dado.processTextContext === "string") { dado.processTextContext = cortar(dado.processTextContext, 2000); if (!cortou.includes("processTextContext")) cortou.push("processTextContext"); }
  return { dado, cortou };
}

// O Firestore não aceita lista dentro de lista (erro "Nested arrays are not supported"). Cada lista interna vira { __lista: [...] }.
export function semListasAninhadas<T>(valor: T): T {
  const ir = (v: any): any => {
    if (Array.isArray(v)) return v.map((x) => (Array.isArray(x) ? { __lista: ir(x) } : ir(x)));
    if (v && typeof v === "object") { const o: any = {}; for (const k of Object.keys(v)) o[k] = ir(v[k]); return o; }
    return v;
  };
  return ir(valor);
}

// Versão mínima do ato (só o que o Histórico precisa para abrir a minuta), usada como segunda tentativa se a completa for recusada.
export function versaoMinimaDoAto(ato: SavedAnalysis): SavedAnalysis {
  const r: any = ato.result || {};
  const { minute, originalMinute, indicacaoTpuCnj, usage, modelUsed, analysisId, gigante, alertaInjecao, fontesConsultadas } = r;
  const o: any = { ...ato, result: { minute, originalMinute, indicacaoTpuCnj, usage, modelUsed, analysisId, gigante, alertaInjecao, fontesConsultadas }, chatMessages: [], processTextContext: typeof ato.processTextContext === "string" ? ato.processTextContext.slice(0, 2000) : "" };
  delete o.holisticSynopsis;
  return o as SavedAnalysis;
}
