// fetch que SOBREVIVE à queda de conexão: se a rede cair (ou o navegador do celular congelar a página) depois de o servidor já ter recebido o pedido, em vez de falhar busca o resultado
// na caixa de resultados do servidor e devolve uma resposta normal. Quem chama continua com o mesmo código de sempre.
import { consultarResultado, ativosNestaPagina } from "./analisePendente";

const novoId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function esperarResultado(progId: string, maxMs: number): Promise<{ status: number; body: string } | null> {
  const limite = Date.now() + maxMs; let primeiraVez = Date.now(), visto = false;
  while (Date.now() < limite) {
    try {
      const r = await consultarResultado(progId);
      if (r.pronto) return { status: r.status || 200, body: r.body || "" };
      if (r.andamento) visto = true;
      else if (r.desconhecido && !visto && Date.now() - primeiraVez > 12_000) return null;      // o servidor nunca recebeu o pedido: quem chamou pode tentar de novo
    } catch { /* sem rede ainda: segue tentando */ }
    await esperar(4000);
  }
  return null;
}

export interface OpcoesRecuperavel { esperaMaxMs?: number; aoSalvarMarcador?: (progId: string) => void }
export async function fetchRecuperavel(url: string, init: RequestInit & { headers?: Record<string, string> } = {}, opcoes: OpcoesRecuperavel = {}): Promise<Response> {
  const headers = { ...(init.headers || {}) } as Record<string, string>;
  const progId = headers["x-progresso-id"] || novoId(); headers["x-progresso-id"] = progId;
  opcoes.aoSalvarMarcador?.(progId); ativosNestaPagina.add(progId);
  try {
    const r = await fetch(url, { ...init, headers });
    const texto = await r.text();      // lê tudo aqui: se a conexão cair no meio da leitura, também cai no plano B
    return new Response(texto, { status: r.status, statusText: r.statusText, headers: { "Content-Type": r.headers.get("Content-Type") || "application/json" } });
  } catch (e: any) {
    if (e?.name === "AbortError" || (init.signal as AbortSignal | undefined)?.aborted) throw e;      // cancelado de propósito (ou limite de tempo): não recupera
    const rec = await esperarResultado(progId, opcoes.esperaMaxMs ?? 12 * 60_000);
    if (!rec) throw e;
    return new Response(rec.body, { status: rec.status >= 200 && rec.status <= 599 ? rec.status : 200, headers: { "Content-Type": "application/json" } });
  } finally { ativosNestaPagina.delete(progId); }
}
