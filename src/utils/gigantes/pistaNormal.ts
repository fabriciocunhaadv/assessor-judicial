// A "pista normal" são as análises comuns (principal, Turbo, Lupa, Mesa…), que têm prioridade sobre o processamento em lotes dos gigantes.
// O app não precisa ser alterado: este módulo conta as chamadas dessas análises que ainda estão em andamento, observando o fetch.
const ROTAS = ["/api/generate-minute", "/api/generate-minute-turbo", "/api/audit-assessor-draft", "/api/hearing-copilot", "/api/mutirao-extract-ata", "/api/mutirao-video"];

let emAndamento = 0;
let ultima = 0;
let instalado = false;

export function instalarObservadorPistaNormal() {
  if (instalado || typeof window === "undefined" || typeof window.fetch !== "function") return;
  instalado = true;
  const original = window.fetch.bind(window);
  window.fetch = (async (input: any, init?: any) => {
    let url = "";
    try { url = typeof input === "string" ? input : input?.url || String(input); } catch { /* ignora */ }
    const caminho = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
    if (!ROTAS.includes(caminho)) return original(input, init);
    emAndamento++; ultima = Date.now();
    let liberado = false;
    const liberar = () => { if (!liberado) { liberado = true; emAndamento = Math.max(0, emAndamento - 1); ultima = Date.now(); } };
    try {
      const resp = await original(input, init);
      // a resposta chega com cabeçalho cedo (pulso de vida): a chamada só termina quando o corpo termina
      try { resp.clone().arrayBuffer().then(liberar, liberar); } catch { liberar(); }
      return resp;
    } catch (e) {
      liberar();
      throw e;
    }
  }) as typeof window.fetch;
}

export const pistaNormalOcupada = () => emAndamento > 0;
export const ultimaAtividadePistaNormal = () => (emAndamento > 0 ? Date.now() : ultima);
