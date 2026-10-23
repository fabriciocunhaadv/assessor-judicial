// Monitor de erros do sistema: captura falhas da tela, das chamadas à IA e da rede, agrupa as repetidas e guarda em
// gabinetes/{gabinete}/error_events/{assinatura} (as regras atuais do Firestore já permitem). O super admin lê tudo no painel "Monitor de erros",
// pede o diagnóstico da IA e DECIDE se aceita ou recusa cada ajuste sugerido. Nada é corrigido sozinho.
// Privacidade: nunca grava o texto dos autos; números de processo, CPF/CNPJ, e-mails e chaves são mascarados antes de gravar.
import { medirLeitura } from "./medidorColeta";
import { collection, doc, getDocs, setDoc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { globalTenantId } from "../lib/firestoreUtils";

export type StatusErro = "novo" | "diagnosticado" | "aceito" | "recusado" | "resolvido";

export interface DiagnosticoErro {
  resumo: string;
  causa_provavel: string;
  gravidade: "alta" | "media" | "baixa";
  origem_provavel: string;
  acao_para_usuario: string;
  sugestoes: { tipo: string; titulo: string; descricao: string; onde: string; risco: string; esforco: string }[];
  precisa_desenvolvedor: boolean;
  confianca: string;
  geradoEm?: number;
}

export interface ErroMonitorado {
  id: string;
  tenantId: string;
  origem: string;            // api | rede | tela | promessa
  modulo: string;
  tipo: "passageiro" | "falha";
  status: number;            // status HTTP (0 quando não se aplica)
  mensagem: string;
  contagem: number;
  primeiraEm: number;
  ultimaEm: number;
  ultimoUsuario: string;
  usuarios: string[];
  versao: string;
  contexto?: Record<string, string>;
  situacao: StatusErro;
  diagnostico?: DiagnosticoErro;
  decisao?: { por: string; em: number; nota: string };
}

const MODULOS: Record<string, string> = {
  "/api/generate-minute": "analise_normal", "/api/generate-minute-turbo": "turbo", "/api/audit-assessor-draft": "lupa", "/api/hearing-copilot": "mesa_audiencia",
  "/api/mutirao-extract-ata": "mutirao", "/api/mutirao-video": "mutirao", "/api/chat-agaia": "chat", "/api/lateral-agent-chat": "copiloto",
  "/api/advogado-peticao": "peticao_inicial", "/api/gigante-lote": "gigantes", "/api/gigante-fusao": "gigantes", "/api/ocr-paginas": "ocr",
  "/api/extract-pdf-text": "leitura_pdf", "/api/generate-synopsis": "sinopse", "/api/parse-precedents-pdf": "precedentes", "/api/sync-precedents-weekly": "precedentes",
  "/api/scan-cabinet-theses": "teses", "/api/monitor/diagnosticar": "monitor",
};
const IGNORAR = ["/api/progresso", "/api/native-key-info", "/api/custom-precedents", "/api/test-api-key", "/api/telemetry", "/api/monitor/diagnosticar"];
const VERSAO = "web";

/** Tira do texto o que identifica pessoas, processos ou chaves. */
export function mascarar(t: unknown, max = 400): string {
  let s = String(t ?? "");
  s = s.replace(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g, "[PROCESSO]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]").replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[E-MAIL]")
    .replace(/\bAIza[\w-]{20,}\b|\bAQ\.[\w.-]{20,}\b|\bsk-[\w-]{20,}\b/g, "[CHAVE]")
    .replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); };
const normalizar = (s: string) => s.toLowerCase().replace(/\[[a-z-]+\]/g, "").replace(/"[^"]*"|'[^']*'/g, "").replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 140);
const ehPassageiro = (m: string, st: number) => st === 503 || st === 429 || st === 502 || st === 504 || /alta demanda|503|overloaded|unavailable|resource_exhausted|quota|cota|limite de requisi|failed to fetch|networkerror|load failed|interrompida/i.test(m);

const vistos = new Map<string, number>();
let enviados = 0;

export async function registrarErro(e: { origem: string; modulo?: string; mensagem: string; status?: number; contexto?: Record<string, string> }): Promise<void> {
  try {
    const user = auth.currentUser; if (!user) return;
    const mensagem = mascarar(e.mensagem), modulo = e.modulo || "outros", status = e.status || 0;
    if (!mensagem) return;
    const sig = hash(`${e.origem}|${modulo}|${status}|${normalizar(mensagem)}`);
    const agora = Date.now();
    if (agora - (vistos.get(sig) || 0) < 60000 || enviados >= 40) return;      // o mesmo erro no máximo 1x por minuto por aba; 40 por sessão
    vistos.set(sig, agora); enviados++;
    const tenantId = globalTenantId || "gabinete_default";
    const ref = doc(db, "gabinetes", tenantId, "error_events", sig);
    const email = (user.email || user.uid || "").toLowerCase();
    const contexto: Record<string, string> = { pagina: mascarar(typeof location !== "undefined" ? location.pathname : "", 80), online: typeof navigator !== "undefined" && navigator.onLine ? "sim" : "não", ...(e.contexto || {}) };
    try {
      await updateDoc(ref, { contagem: increment(1), ultimaEm: agora, ultimoUsuario: email, usuarios: arrayUnion(email), versao: VERSAO });
    } catch {
      await setDoc(ref, {
        assinatura: sig, origem: e.origem, modulo, tipo: ehPassageiro(mensagem, status) ? "passageiro" : "falha", status, mensagem, contagem: 1,
        primeiraEm: agora, ultimaEm: agora, ultimoUsuario: email, usuarios: [email], versao: VERSAO, contexto, situacao: "novo",
      }, { merge: true });
    }
  } catch { /* o monitor nunca pode derrubar o sistema */ }
}

let instalado = false;
/** Liga a captura: erros da tela, promessas rejeitadas e falhas das chamadas /api (inclusive as que chegam como erro dentro de uma resposta 200 com pulso de vida). */
export function instalarMonitorDeErros() {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  window.addEventListener("error", (ev) => {
    const m = String(ev?.message || "");
    if (!m || /ResizeObserver|Script error\.?$/i.test(m)) return;
    void registrarErro({ origem: "tela", modulo: "interface", mensagem: m });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const r: any = ev?.reason; const m = String(r?.message || r || "");
    if (!m || r?.name === "AbortError" || /abort|cancel/i.test(m)) return;
    void registrarErro({ origem: "promessa", modulo: "interface", mensagem: m });
  });
  if (typeof window.fetch !== "function") return;
  const original = window.fetch.bind(window);
  const novo = (async (input: any, init?: any) => {
    let caminho = "";
    try { const url = typeof input === "string" ? input : input?.url || String(input); caminho = url.split("?")[0].replace(/^https?:\/\/[^/]+/, ""); } catch { /* ignora */ }
    if (!caminho.startsWith("/api/") || IGNORAR.includes(caminho)) return original(input, init);
    const modulo = MODULOS[caminho] || "outros";
    try {
      const resp = await original(input, init);
      try {
        if (!resp.ok) {
          resp.clone().text().then((t) => { let m = t; try { const j = JSON.parse(t); m = j?.error || j?.message || t; } catch { /* texto puro */ } void registrarErro({ origem: "api", modulo, status: resp.status, mensagem: `${caminho}: ${m}` }); }, () => {});
        } else {
          // a resposta pode vir com status 200 e o erro dentro do corpo (pulso de vida): erro é um JSON pequeno com isError
          resp.clone().text().then((t) => { if (t.length < 6000 && /"isError"\s*:\s*true/.test(t)) { let m = t; try { m = JSON.parse(t.trim())?.error || t; } catch { /* texto */ } void registrarErro({ origem: "api", modulo, status: 200, mensagem: `${caminho}: ${m}` }); } }, () => {});
        }
      } catch { /* leitura opcional */ }
      return resp;
    } catch (err: any) {
      if (err?.name !== "AbortError") void registrarErro({ origem: "rede", modulo, mensagem: `${caminho}: ${err?.message || err}` });
      throw err;
    }
  }) as typeof window.fetch;
  try { window.fetch = novo; return; } catch { /* tenta o próximo */ }
  try { Object.defineProperty(window, "fetch", { value: novo, configurable: true, writable: true }); } catch { /* sem observador */ }
}

// ---------- leitura e decisão (super admin) ----------
export async function listaDeGabinetes(): Promise<string[]> {
  const ids = new Set<string>(["gabinete_default", "gab_rafael_machado", globalTenantId || "gabinete_default"]);
  try { (await getDocs(collection(db, "tenants"))).docs.forEach((d) => ids.add(d.id)); } catch { /* sem acesso */ }
  try { (await getDocs(collection(db, "users"))).docs.forEach((d) => { const t = (d.data() as any)?.tenantId; if (t && t !== "unassigned") ids.add(t); }); } catch { /* sem acesso */ }
  return [...ids];
}

export async function listarErros(): Promise<ErroMonitorado[]> {
  const out: ErroMonitorado[] = [];
  for (const tid of await listaDeGabinetes()) {
    try {
      const snapErros = await getDocs(collection(db, "gabinetes", tid, "error_events")); medirLeitura("erros_lista", snapErros.docs);
      snapErros.docs.forEach((d) => { const v: any = d.data(); out.push({ ...v, id: d.id, tenantId: tid, situacao: v.situacao || "novo", usuarios: v.usuarios || [], contagem: v.contagem || 1 }); });
    } catch { /* gabinete sem registros ou sem acesso */ }
  }
  return out.sort((a, b) => b.ultimaEm - a.ultimaEm);
}

export const salvarDiagnostico = (e: ErroMonitorado, diagnostico: DiagnosticoErro) =>
  updateDoc(doc(db, "gabinetes", e.tenantId, "error_events", e.id), { diagnostico: { ...diagnostico, geradoEm: Date.now() }, situacao: e.situacao === "novo" ? "diagnosticado" : e.situacao });

export const decidirErro = (e: ErroMonitorado, situacao: StatusErro, nota: string) =>
  updateDoc(doc(db, "gabinetes", e.tenantId, "error_events", e.id), { situacao, decisao: { por: auth.currentUser?.email || "", em: Date.now(), nota: mascarar(nota, 500) } });

/** Texto pronto para colar numa conversa com o Claude: só os ajustes ACEITOS pelo super admin. */
export function pedidoDeCorrecao(aceitos: ErroMonitorado[]): string {
  const L = ["Claude, o super admin ACEITOU os ajustes abaixo, sugeridos pelo Monitor de Erros do assessor-judicial. Analise cada um, mostre o trecho exato que pretende alterar e espere minha autorização antes de mexer no código.", ""];
  aceitos.forEach((e, i) => {
    L.push(`${i + 1}. [${e.modulo}] ${e.mensagem}`, `   Ocorrências: ${e.contagem} · usuários afetados: ${e.usuarios.length} · tipo: ${e.tipo} · assinatura: ${e.id}`);
    if (e.diagnostico) { L.push(`   Causa provável: ${e.diagnostico.causa_provavel}`); e.diagnostico.sugestoes.forEach((s) => L.push(`   - (${s.tipo}, risco ${s.risco}, esforço ${s.esforco}) ${s.titulo}: ${s.descricao} [onde: ${s.onde}]`)); }
    if (e.decisao?.nota) L.push(`   Nota do super admin: ${e.decisao.nota}`);
  });
  return L.join("\n");
}
