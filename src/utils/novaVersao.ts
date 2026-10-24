// Aviso de NOVA VERSÃO do sistema. O navegador compara o arquivo principal que carregou (index-XXXX.js) com o que o servidor publica agora (em /index.html).
// Não toca no banco de dados: é uma leitura de um arquivo pequeno do próprio site, a cada 10 minutos.
const INICIO_ASSETS = "/assets/index-";

const scriptAtual = (): string | null => {
  try {
    const teste = (globalThis as any).__scriptAtualTeste; if (teste) return String(teste);
    return document.querySelector(`script[type="module"][src^="${INICIO_ASSETS}"]`)?.getAttribute("src") || null;
  } catch { return null; }
};

export const scriptPublicado = (html: string): string | null => new RegExp(`<script[^>]+src="(${INICIO_ASSETS}[^"]+\\.js)"`, "i").exec(html)?.[1] || null;

/** true = o servidor já publicou uma versão diferente da que esta aba está usando. Em desenvolvimento (sem arquivos com código no nome) sempre false. */
export async function haVersaoNova(): Promise<boolean> {
  const atual = scriptAtual(); if (!atual) return false;
  try {
    const r = await fetch(`/index.html?v=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return false;
    const novo = scriptPublicado(await r.text());
    return !!novo && novo !== atual;
  } catch { return false; }
}

// pedidos ao servidor em andamento (análises, leituras...): enquanto houver algum, a página não se atualiza sozinha
let emAndamento = 0, instalado = false;
const IGNORAR = ["/api/progresso", "/api/native-key-info", "/api/custom-precedents", "/api/telemetry"];
export function acompanharPedidos(): void {
  if (instalado || typeof window === "undefined" || typeof window.fetch !== "function") return;
  instalado = true;
  const original = window.fetch.bind(window);
  window.fetch = ((input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const conta = /\/api\//.test(url) && !IGNORAR.some((x) => url.includes(x));
    if (!conta) return original(input, init);
    emAndamento++;
    return original(input, init).finally(() => { emAndamento = Math.max(0, emAndamento - 1); });
  }) as typeof window.fetch;
}
export const pedidosEmAndamento = () => emAndamento;

let ultimaAtividade = Date.now();
export function acompanharAtividade(): () => void {
  const marcar = () => { ultimaAtividade = Date.now(); };
  const eventos = ["keydown", "mousedown", "touchstart", "wheel", "scroll"];
  eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true, capture: true }));
  return () => eventos.forEach((e) => window.removeEventListener(e, marcar, { capture: true } as any));
}
export const minutosParado = () => (Date.now() - ultimaAtividade) / 60000;
