// Retenção do Histórico: prazo de 7 dias, avisos de 3 e 1 dia e carência de 7 dias para as minutas de 23/10/2026 para trás. Rodar: npx tsx testes/gigantes/teste_retencao_regras.ts
import { CORTE_ANTIGAS_PADRAO, DIA_MS, ConfigRetencao, configPadraoRetencao, expiraEm, normalizarConfigRetencao, resumirValidade, situacaoValidade } from '../../src/utils/retencaoRegras';
let f = 0; const ok = (c: boolean, n: string) => { console.log(c ? 'ok' : 'FALHA', n); if (!c) f++; };
const ativada = Date.UTC(2026, 9, 25, 15, 0, 0);       // regra ligada em 25/10/2026
const cfg: ConfigRetencao = { ...configPadraoRetencao(), ativa: true, ativadaEm: ativada };
const nova = Date.UTC(2026, 9, 26, 12, 0, 0), antiga = Date.UTC(2026, 9, 20, 12, 0, 0);
ok(situacaoValidade(nova, configPadraoRetencao()).fase === 'sem_regra', 'regra desligada: sem prazo e nada é apagado');
ok(expiraEm(nova, cfg) === nova + 7 * DIA_MS, 'ato novo vence 7 dias depois de criado');
ok(expiraEm(antiga, cfg) === ativada + 7 * DIA_MS, 'ato antigo (até 23/10) ganha 7 dias a partir de ligar a regra, e não é apagado na hora');
ok(situacaoValidade(antiga, cfg, ativada + 1000).fase === 'ok' && situacaoValidade(antiga, cfg, ativada + 1000).diasRestantes === 7, 'ato antigo no dia de ligar: faltam 7 dias');
const exp = nova + 7 * DIA_MS;
ok(situacaoValidade(nova, cfg, exp - 5 * DIA_MS).fase === 'ok', 'faltando 5 dias: sem aviso');
ok(situacaoValidade(nova, cfg, exp - 3 * DIA_MS + 1).fase === 'aviso3' && situacaoValidade(nova, cfg, exp - 3 * DIA_MS + 1).diasRestantes === 3, 'faltando 3 dias: aviso de 3 dias');
ok(situacaoValidade(nova, cfg, exp - 2 * DIA_MS).fase === 'aviso3', 'faltando 2 dias: continua o aviso de 3');
ok(situacaoValidade(nova, cfg, exp - DIA_MS + 1).fase === 'aviso1' && situacaoValidade(nova, cfg, exp - 3600_000).texto.includes('24 h'), 'faltando 1 dia: aviso de 1 dia');
ok(situacaoValidade(nova, cfg, exp).fase === 'vencido' && situacaoValidade(nova, cfg, exp + DIA_MS).fase === 'vencido', 'depois do prazo: vencido');
ok(CORTE_ANTIGAS_PADRAO === Date.UTC(2026, 9, 24, 3, 0, 0) && expiraEm(CORTE_ANTIGAS_PADRAO - 1, cfg) === ativada + 7 * DIA_MS && expiraEm(CORTE_ANTIGAS_PADRAO, cfg) === CORTE_ANTIGAS_PADRAO + 7 * DIA_MS, 'o corte é 24/10/2026 00:00 de Brasília: 23/10 23:59 é antigo; 24/10 00:00 já é novo');
ok(expiraEm(undefined, cfg) === null && expiraEm(0, cfg) === null && expiraEm('abc', cfg) === null, 'ato sem data não vence');
const semAntigas: ConfigRetencao = { ...cfg, corteAntigas: 1 };      // para este resumo nenhum ato é "antigo"
const r = resumirValidade([{ date: nova }, { date: nova - 5 * DIA_MS }, { date: nova - 6.5 * DIA_MS }, { date: nova - 8 * DIA_MS }, { date: nova - 4 * DIA_MS }], semAntigas, nova + 1000);
ok(r.total === 5 && r.vencidas === 1 && r.ate1 === 1 && r.ate3 === 2 && r.ate7 === 1, 'resumo por fase: ' + JSON.stringify(r));
ok(normalizarConfigRetencao({ ativa: 'sim', dias: 0 }).ativa === false && normalizarConfigRetencao({ ativa: true, dias: 9999 }).dias === 7 && normalizarConfigRetencao({ ativa: true, dias: 14, ativadaEm: 5 }).dias === 14 && normalizarConfigRetencao(null).dias === 7, 'configuração inválida volta ao padrão');
process.exit(f ? 1 : 0);
