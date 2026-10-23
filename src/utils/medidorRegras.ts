// Regras puras (sem Firebase) do MEDIDOR de leitura: estima quanto cada parte do sistema baixou do banco (documentos e bytes) para achar o que mais pesa na fatura.
// O medidor só observa: não muda o que é lido.
export interface Medida { chamadas: number; docs: number; bytes: number }
export interface RegistroMedidor { data: string; uid: string; email: string; nome: string; por: Record<string, Medida> }

export const ROTULO_ORIGEM: Record<string, string> = {
  hist_app_60s: "Histórico: atualização automática de 60 s (todas as abas)",
  hist_modal_8s: "Histórico: atualização automática de 8 s (janela aberta)",
  hist_app_evento: "Histórico (aba): recarga por evento (nova análise, janela, troca de unidade)",
  hist_app_foco: "Histórico (aba): ao voltar depois de mais de 15 min parada",
  hist_modal_evento: "Histórico (janela aberta): recarga por ato gravado ou excluído",
  hist_modal_abrir: "Histórico: ao abrir ou atualizar a janela",
  hist_outros: "Histórico: outros usos (assistente, teses, limpeza)",
  atualiza_unidade: "Ler a coleção inteira para trocar a unidade de um processo",
  atualiza_categoria: "Ler a coleção inteira para trocar a categoria de um processo",
  snapshot_criar: "Backup (snapshot): leitura do gabinete",
  snapshot_restaurar: "Backup (snapshot): leitura dos blocos",
  metricas_gabinetes: "Painel super admin: métricas dos gabinetes (leitura antiga, antes da contagem leve)",
  metricas_contagem: "Painel super admin: contagens leves (não baixam documentos)",
  hist_ao_vivo: "Histórico (lista leve ao vivo): documentos que chegaram do índice",
  indice_reconciliar: "Histórico: montagem ou conferência do índice leve (leitura completa, rara)",
  ato_completo: "Histórico: minuta completa aberta pelo usuário",
  teses_minerar: "Teses: mineração das minutas completas (só quando clicada)",
  hist_exportar: "Histórico: backup (exportar tudo)",
  retencao_limpeza: "Retenção do Histórico: busca dos atos vencidos (leve)",
  hist_completo: "Histórico: leitura completa (uso interno)",
  usuarios_lista: "Lista de usuários (coleção inteira)",
  uso_logs: "Registros de uso (usageLogs)",
  auditorias: "Auditorias",
  ops_eventos: "Monitor de operação (lista)",
  erros_lista: "Monitor de erros (lista)",
  prompts_escuta: "Prompts do gabinete (escuta em tempo real)",
};

/** Nome seguro para chave de campo do Firestore (sem ponto, espaço ou acento). */
export const chaveSegura = (s: string): string => String(s || "outros").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9_]/g, "_").toLowerCase().slice(0, 40) || "outros";

/** Estima os bytes de uma lista de documentos medindo uma amostra (medir tudo travaria a tela). Aceita snapshots (.data()) ou objetos simples. */
export function estimarBytes(docs: any[], amostra = 5): number {
  if (!Array.isArray(docs) || docs.length === 0) return 0;
  const n = Math.min(amostra, docs.length), passo = docs.length / n;
  let soma = 0, lidos = 0;
  for (let i = 0; i < n; i++) {
    const d = docs[Math.floor(i * passo)];
    try { const v = d && typeof d.data === "function" ? d.data() : d; soma += JSON.stringify(v ?? "").length; lidos++; } catch { /* documento que não serializa: ignora na amostra */ }
  }
  return lidos ? Math.round((soma / lidos) * docs.length) : 0;
}

export class Acumulador {
  private m = new Map<string, Medida>();
  add(origem: string, docs: number, bytes: number) {
    const k = chaveSegura(origem), v = this.m.get(k) || { chamadas: 0, docs: 0, bytes: 0 };
    v.chamadas += 1; v.docs += docs; v.bytes += bytes; this.m.set(k, v);
  }
  temDados() { return this.m.size > 0; }
  pegar(): Record<string, Medida> { const o: Record<string, Medida> = {}; this.m.forEach((v, k) => { o[k] = { ...v }; }); return o; }
  limpar() { this.m.clear(); }
  devolver(o: Record<string, Medida>) { Object.entries(o).forEach(([k, v]) => { const a = this.m.get(k) || { chamadas: 0, docs: 0, bytes: 0 }; this.m.set(k, { chamadas: a.chamadas + v.chamadas, docs: a.docs + v.docs, bytes: a.bytes + v.bytes }); }); }
}

export interface LinhaResumo { origem: string; rotulo: string; chamadas: number; docs: number; bytes: number; usuarios: number }
export function resumir(regs: RegistroMedidor[]): { porOrigem: LinhaResumo[]; porUsuario: { email: string; nome: string; bytes: number }[]; porDia: { data: string; bytes: number }[]; totalBytes: number } {
  const orig = new Map<string, LinhaResumo & { u: Set<string> }>(), usr = new Map<string, { email: string; nome: string; bytes: number }>(), dia = new Map<string, number>();
  let total = 0;
  for (const r of regs) {
    for (const [k, v] of Object.entries(r.por || {})) {
      const l = orig.get(k) || { origem: k, rotulo: ROTULO_ORIGEM[k] || k, chamadas: 0, docs: 0, bytes: 0, usuarios: 0, u: new Set<string>() };
      l.chamadas += v.chamadas || 0; l.docs += v.docs || 0; l.bytes += v.bytes || 0; l.u.add(r.uid); orig.set(k, l);
      const u = usr.get(r.email) || { email: r.email, nome: r.nome, bytes: 0 }; u.bytes += v.bytes || 0; usr.set(r.email, u);
      dia.set(r.data, (dia.get(r.data) || 0) + (v.bytes || 0)); total += v.bytes || 0;
    }
  }
  return {
    porOrigem: [...orig.values()].map(({ u, ...l }) => ({ ...l, usuarios: u.size })).sort((a, b) => b.bytes - a.bytes),
    porUsuario: [...usr.values()].sort((a, b) => b.bytes - a.bytes),
    porDia: [...dia.entries()].map(([data, bytes]) => ({ data, bytes })).sort((a, b) => a.data.localeCompare(b.data)),
    totalBytes: total,
  };
}
export const formatarBytes = (b: number) => (b >= 1073741824 ? (b / 1073741824).toFixed(2) + " GB" : b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB");
