// "Fazenda Nova" é comarca, não vara da Fazenda Pública: o Monitor de operação e o perfil de matéria não podem confundir. Rodar: npx tsx testes/gigantes/teste_area_fazenda.ts
import { areaDoTexto, detectarAnomalias } from '../../src/utils/operacaoRegras';
import { materiasDoPrompt } from '../../src/utils/perfisMateria';
let f = 0; const ok = (c: boolean, n: string) => { console.log(c ? 'ok' : 'FALHA', n); if (!c) f++; };
const an = (u: string, p: string) => detectarAnomalias({ unitName: u, promptTitle: p, promptCategory: '', promptEhPadraoDaLista: false, origem: 'manual', resultado: 'ok', erro: '', modulo: 'normal' }).some((a) => a.codigo === 'prompt_incompativel_unidade');
ok(!an('Fazenda Nova', 'Outros Área Judicial - Cível'), 'Fazenda Nova + Cível: sem alerta');
ok(!an('Juizado Especial Cível de Fazenda Nova', 'Outros Área Judicial - Juizado Especial Cível'), 'JEC de Fazenda Nova + JEC: sem alerta');
ok(an('Vara da Fazenda Pública', 'Outros Área Judicial - Cível'), 'Vara Faz. Pública + Cível: alerta');
ok(an('Juizado Especial da Fazenda Pública', 'Outros Área Judicial - Juizado Especial Cível'), 'Juizado Faz. Pública + JEC: alerta');
ok(!an('Vara das Fazendas Públicas', 'Outros Área Judicial - Fazenda Pública Comum'), 'Vara das Fazendas Públicas + Fazenda: sem alerta');
ok(!an('Execução Fiscal', 'Outros Área Judicial - Execução Fiscal Estadual'), 'Exec Fiscal: sem alerta');
ok(areaDoTexto('Juizado Faz.Pub.') === 'fazenda', 'Juizado Faz.Pub.');
ok(materiasDoPrompt({ titulo: 'Prompt sem matéria', categoria: '', unidade: 'Fazenda Nova' }).length === 0, 'perfil: Fazenda Nova não vira Fazenda');
ok(materiasDoPrompt({ titulo: 'Outros Área Judicial - Fazenda Pública Comum' }).includes('fazenda'), 'perfil: Fazenda Pública Comum');
ok(materiasDoPrompt({ titulo: 'x', unidade: 'Vara da Fazenda Pública' }).includes('fazenda'), 'perfil: unidade Vara da Fazenda Pública');
process.exit(f ? 1 : 0);
