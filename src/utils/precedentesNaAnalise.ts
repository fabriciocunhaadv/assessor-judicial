// Junta à requisição de análise os julgados anexados pelo gabinete (PDF) que se aplicam ao processo.
// O servidor não lê o banco: o navegador separa os poucos aplicáveis (no máximo 12) e eles entram na minuta junto das súmulas nativas.
import { selecionarPrecedentesAnexados } from "./bindingPrecedents";

const ROTAS = ["/api/generate-minute", "/api/generate-minute-turbo"];
const LIMITE_CORPO = 40_000_000;      // corpo gigante: não mexe (evita ler e reter dezenas de MB à toa)

export function anexarPrecedentesAoCorpo(corpo: string): string {
  try {
    if (corpo.length > LIMITE_CORPO || corpo.includes('"precedentesDoGabinete"')) return corpo;
    const b = JSON.parse(corpo);
    const contexto = [b.processText, ...(Array.isArray(b.pdfFiles) ? b.pdfFiles.map((p: any) => p?.extractedText || "") : []), b.actType, b.actSubtype, b.specificInstructions, b.customPromptText, b.paradigmModelText].filter((x) => typeof x === "string" && x).join("\n");
    const lista = selecionarPrecedentesAnexados(contexto, 12);
    if (!lista.length) return corpo;
    const fim = corpo.lastIndexOf("}");
    return fim < 0 ? corpo : corpo.slice(0, fim) + ',"precedentesDoGabinete":' + JSON.stringify(lista) + "}";
  } catch { return corpo; }
}

let instalado = false;
export function instalarEnvioDePrecedentes(): void {
  if (instalado || typeof window === "undefined" || typeof window.fetch !== "function") return;
  instalado = true;
  const original = window.fetch.bind(window);
  window.fetch = ((input: any, init?: any) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      if (init && typeof init.body === "string" && String(init.method || "GET").toUpperCase() === "POST" && url.split("?")[0].replace(/^https?:\/\/[^/]+/, "") && ROTAS.includes(url.split("?")[0].replace(/^https?:\/\/[^/]+/, ""))) {
        init = { ...init, body: anexarPrecedentesAoCorpo(init.body) };
      }
    } catch { /* qualquer falha: segue com a requisição original */ }
    return original(input, init);
  }) as typeof window.fetch;
}
