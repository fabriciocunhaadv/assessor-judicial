// RETENÇÃO DO HISTÓRICO: as minutas ficam no Histórico por alguns dias (7, por padrão) e depois são apagadas do banco.
// Avisos: faltando 3 dias e faltando 1 dia. Minutas feitas até o dia do corte (23/10/2026) ganham uma carência de 7 dias a partir do dia em que a regra é ligada.
// Sem Firebase de propósito: funções puras (e o estado em memória), testáveis sozinhas.
export const DIA_MS = 86_400_000;
/** 24/10/2026 00:00 no horário de Brasília (UTC-3): quem foi gerado antes disso é "antigo" e tem carência. */
export const CORTE_ANTIGAS_PADRAO = Date.UTC(2026, 9, 24, 3, 0, 0);

export interface ConfigRetencao { ativa: boolean; dias: number; ativadaEm: number; corteAntigas: number }
export const configPadraoRetencao = (): ConfigRetencao => ({ ativa: false, dias: 7, ativadaEm: 0, corteAntigas: CORTE_ANTIGAS_PADRAO });

export function normalizarConfigRetencao(raw: any): ConfigRetencao {
  const p = configPadraoRetencao(), r = raw || {};
  const dias = Number(r.dias); const ativadaEm = Number(r.ativadaEm); const corte = Number(r.corteAntigas);
  return { ativa: r.ativa === true, dias: Number.isFinite(dias) && dias >= 1 && dias <= 365 ? Math.floor(dias) : p.dias, ativadaEm: Number.isFinite(ativadaEm) && ativadaEm > 0 ? ativadaEm : 0, corteAntigas: Number.isFinite(corte) && corte > 0 ? corte : p.corteAntigas };
}

/** Quando o ato vence (ms) ou null se a regra está desligada ou o ato não tem data. Atos de antes do corte vencem `dias` depois de a regra ser ligada. */
export function expiraEm(date: any, cfg: ConfigRetencao): number | null {
  const d = Number(date);
  if (!cfg.ativa || !cfg.ativadaEm || !Number.isFinite(d) || d <= 0) return null;
  const normal = d + cfg.dias * DIA_MS;
  return d < cfg.corteAntigas ? Math.max(normal, cfg.ativadaEm + cfg.dias * DIA_MS) : normal;
}

export type FaseValidade = 'ok' | 'aviso3' | 'aviso1' | 'vencido' | 'sem_regra';
export interface SituacaoValidade { fase: FaseValidade; expiraEm: number | null; diasRestantes: number; texto: string }

export function situacaoValidade(date: any, cfg: ConfigRetencao, agora: number = Date.now()): SituacaoValidade {
  const exp = expiraEm(date, cfg);
  if (exp === null) return { fase: 'sem_regra', expiraEm: null, diasRestantes: Infinity, texto: '' };
  const resto = exp - agora, dias = Math.ceil(resto / DIA_MS);
  if (resto <= 0) return { fase: 'vencido', expiraEm: exp, diasRestantes: 0, texto: 'Vencida: será apagada' };
  if (dias <= 1) return { fase: 'aviso1', expiraEm: exp, diasRestantes: 1, texto: 'Expira em menos de 24 h' };
  if (dias <= 3) return { fase: 'aviso3', expiraEm: exp, diasRestantes: dias, texto: `Expira em ${dias} dias` };
  return { fase: 'ok', expiraEm: exp, diasRestantes: dias, texto: `Expira em ${dias} dias` };
}

/** Atos mais antigos que isto são candidatos à exclusão (usado na consulta; o veredito final é situacaoValidade). */
export const limiteDeCandidatos = (cfg: ConfigRetencao, agora: number = Date.now()) => agora - cfg.dias * DIA_MS;

export interface ResumoValidade { vencidas: number; ate1: number; ate3: number; ate7: number; total: number }
export function resumirValidade(atos: Array<{ date?: any }>, cfg: ConfigRetencao, agora: number = Date.now()): ResumoValidade {
  const r: ResumoValidade = { vencidas: 0, ate1: 0, ate3: 0, ate7: 0, total: 0 };
  for (const a of atos) {
    const s = situacaoValidade(a?.date, cfg, agora); if (s.fase === 'sem_regra') continue;
    r.total++;
    if (s.fase === 'vencido') r.vencidas++; else if (s.fase === 'aviso1') r.ate1++; else if (s.fase === 'aviso3') r.ate3++; else r.ate7++;
  }
  return r;
}

/** Data de referência de uma audiência: a mais tardia entre a última alteração e o dia da audiência (audiência marcada para o futuro nunca vence antes de acontecer). */
export function referenciaAudiencia(h: { updatedAt?: any; scheduledDate?: any } | null | undefined): number {
  const up = Number(h?.updatedAt) || 0;
  const dia = typeof h?.scheduledDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(h.scheduledDate) ? Date.parse(h.scheduledDate.slice(0, 10) + "T23:59:59-03:00") : 0;
  return Math.max(up, Number.isFinite(dia) ? dia : 0);
}

// ---- estado em memória (a tela e o historyDb leem daqui sem depender do Firebase) ----
let _cfg: ConfigRetencao = configPadraoRetencao();
export const configRetencaoAtual = (): ConfigRetencao => _cfg;
export const definirConfigRetencao = (c: ConfigRetencao) => {
  _cfg = c;
  try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('assessor-retencao-config')); } catch { /* sem janela */ }
};
