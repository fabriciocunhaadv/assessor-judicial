// Monitor de OPERAÇÃO: acompanha, de todos os usuários e gabinetes, o que o Studio fez (análise normal, Turbo, processos gigantes) e se veio da esteira da extensão ou do uso manual.
// Cada operação grava um registro enxuto em gabinetes/{gabinete}/ops_events (sem partes, sem texto dos autos) e passa por regras que apontam anomalias, por exemplo
// "prompt Criminal usado numa unidade de Juizado Cível". O super admin vê tudo no painel "Monitor de operação" e copia o pedido de correção para o Claude.
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { globalTenantId } from "../lib/firestoreUtils";
import { mascarar, listaDeGabinetes } from "./monitorErros";
import { areaDoTexto, detectarAnomalias } from "./operacaoRegras";
import type { AnomaliaOperacao, GravidadeAnomalia, ResultadoOperacao } from "./operacaoRegras";
export { areaDoTexto, detectarAnomalias };
export type { AnomaliaOperacao, GravidadeAnomalia, ResultadoOperacao };

export type ModuloOperacao = "normal" | "turbo" | "gigante";
export interface OperacaoRegistrada {
  id: string;
  tenantId: string;
  ts: number;
  uid: string;
  email: string;
  nome: string;
  unitId: string;
  unitName: string;
  modulo: ModuloOperacao;
  origem: "esteira" | "manual";
  promptTitle: string;
  promptCategory: string;
  promptEhPadraoDaLista: boolean;
  processo: string;
  resultado: ResultadoOperacao;
  erro: string;
  duracaoMs: number;
  anomalias: AnomaliaOperacao[];
}

let enviadas = 0;
/** Grava a operação (melhor esforço: nunca derruba o sistema). */
export async function registrarOperacao(op: { modulo: ModuloOperacao; origem?: "esteira" | "manual"; unitId?: string; unitName?: string; promptTitle?: string; promptCategory?: string; promptEhPadraoDaLista?: boolean; processo?: string; resultado: ResultadoOperacao; erro?: string; duracaoMs?: number }): Promise<void> {
  try {
    const user = auth.currentUser; if (!user || enviadas >= 400) return;
    let origem: "esteira" | "manual" = op.origem || "manual";
    if (!op.origem) { try { origem = document.documentElement.dataset.assessorAuto === "1" ? "esteira" : "manual"; } catch { /* sem dataset */ } }
    const base = { unitName: op.unitName || "", promptTitle: op.promptTitle || "", promptCategory: op.promptCategory || "", promptEhPadraoDaLista: !!op.promptEhPadraoDaLista, origem, resultado: op.resultado, erro: mascarar(op.erro || "", 300), modulo: op.modulo };
    const ts = Date.now(), id = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
    enviadas++;
    await setDoc(doc(db, "gabinetes", globalTenantId || "gabinete_default", "ops_events", id), {
      ts, uid: user.uid, email: (user.email || "").toLowerCase(), nome: user.displayName || (user.email || "").split("@")[0] || "Usuário",
      unitId: op.unitId || "", ...base, processo: String(op.processo || "").replace(/[^\d.\-]/g, "").slice(0, 30), duracaoMs: Math.round(op.duracaoMs || 0),
      anomalias: detectarAnomalias(base),
    });
  } catch { /* o monitor nunca pode derrubar o sistema */ }
}

export async function listarOperacoes(limite = 600): Promise<OperacaoRegistrada[]> {
  const out: OperacaoRegistrada[] = [];
  for (const tid of await listaDeGabinetes()) {
    try { (await getDocs(collection(db, "gabinetes", tid, "ops_events"))).docs.forEach((d) => { const v: any = d.data(); out.push({ ...v, id: d.id, tenantId: tid, anomalias: v.anomalias || [] }); }); } catch { /* gabinete sem registros ou sem acesso */ }
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, limite);
}

export interface AlertaAgrupado { chave: string; codigo: string; gravidade: GravidadeAnomalia; texto: string; usuario: string; email: string; tenantId: string; unitName: string; promptTitle: string; total: number; primeira: number; ultima: number; processos: string[] }

/** Junta as anomalias iguais (mesmo usuário, mesma regra, mesmo prompt/unidade) em um alerta só, com a contagem e uma amostra de processos. */
export function agruparAlertas(ops: OperacaoRegistrada[]): AlertaAgrupado[] {
  const mapa = new Map<string, AlertaAgrupado>();
  for (const o of ops) for (const a of o.anomalias) {
    if (a.codigo === "falha_na_operacao" && !o.erro) continue;
    const chave = [o.tenantId, o.email, a.codigo, o.promptTitle, o.unitName].join("|");
    const g = mapa.get(chave) || { chave, codigo: a.codigo, gravidade: a.gravidade, texto: a.texto, usuario: o.nome, email: o.email, tenantId: o.tenantId, unitName: o.unitName, promptTitle: o.promptTitle, total: 0, primeira: o.ts, ultima: o.ts, processos: [] };
    g.total++; g.primeira = Math.min(g.primeira, o.ts); g.ultima = Math.max(g.ultima, o.ts);
    if (o.processo && g.processos.length < 8 && !g.processos.includes(o.processo)) g.processos.push(o.processo);
    mapa.set(chave, g);
  }
  return [...mapa.values()].sort((a, b) => (a.gravidade === b.gravidade ? b.ultima - a.ultima : a.gravidade === "alta" ? -1 : 1));
}

export function pedidoDeCorrecaoOperacao(alertas: AlertaAgrupado[]): string {
  const L = ["Claude, o Monitor de Operação do assessor-judicial apontou os alertas abaixo (comportamento de usuários na esteira e no Studio). Investigue a causa de cada um, mostre o trecho exato que pretende alterar e espere minha autorização antes de mexer no código.", ""];
  alertas.forEach((a, i) => {
    L.push(`${i + 1}. [${a.gravidade.toUpperCase()}] ${a.texto}`, `   Usuário: ${a.usuario} <${a.email}> · gabinete: ${a.tenantId} · unidade: ${a.unitName || "—"} · prompt: ${a.promptTitle || "—"}`,
      `   Ocorrências: ${a.total} (de ${new Date(a.primeira).toLocaleString("pt-BR")} a ${new Date(a.ultima).toLocaleString("pt-BR")}) · exemplos: ${a.processos.join(", ") || "—"}`);
  });
  return L.join("\n");
}
