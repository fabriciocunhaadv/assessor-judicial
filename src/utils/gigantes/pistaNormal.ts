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
  const novo = (async (input: any, init?: any) => {
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
  // alguns ambientes (ex.: a prévia do Google AI Studio) deixam window.fetch só com "getter": a atribuição direta lança erro e derrubava o painel
  try { window.fetch = novo; return; } catch { /* tenta o próximo */ }
  try { Object.defineProperty(window, "fetch", { value: novo, configurable: true, writable: true }); return; } catch { /* tenta o próximo */ }
  // último recurso: sem trocar o fetch, só se percebe a atividade das análises normais pelas respostas que já terminaram
  try {
    const po = new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) {
        const caminho = String(e.name || "").split("?")[0].replace(/^https?:\/\/[^/]+/, "");
        if (ROTAS.includes(caminho)) ultima = Date.now();
      }
    });
    po.observe({ entryTypes: ["resource"] });
  } catch { /* sem observador: a pista normal não é percebida; os intervalos entre chamadas seguem valendo */ }
}

export const pistaNormalOcupada = () => emAndamento > 0;
export const ultimaAtividadePistaNormal = () => (emAndamento > 0 ? Date.now() : ultima);
