// Resumo leve de um ato: só o que a lista mostra, centenas de vezes menor que o ato completo. Rodar: npx tsx testes/gigantes/teste_resumo_leve.ts
import { resumoLeve, ehLeve } from '../../src/utils/historicoLeve';
let f = 0; const ok = (c: boolean, n: string) => { console.log(c ? 'ok' : 'FALHA', n); if (!c) f++; };
const pesado = 'x'.repeat(300000);
const a: any = { id: 'a1', promptTitle: 'P', date: 5, processNumber: '5530114-61.2025.8.09.0166', createdBy: 'u', processTextContext: pesado, chatMessages: [1, 2, 3], versions: [pesado, pesado], originalMinute: { fullFormattedText: pesado }, lancadoProjudi: null,
  result: { minute: { title: 'SENTENÇA', processNumber: '5530114-61.2025.8.09.0166', judicialUnit: 'Vara A', parties: { author: 'Fulano de Tal', defendant: 'Empresa X' }, fullFormattedText: pesado, relatorio: 'Trata-se de ' + pesado, fundamentacao: 'f'.repeat(900), dispositivo: 'd'.repeat(900) }, paradigmUsed: { title: 'Modelo 1', texto: pesado } } };
const r = resumoLeve(a, 'gabinetes/g/history'); const tam = JSON.stringify(r).length;
ok(tam < 3000 && JSON.stringify(a).length > 1_000_000, `leve (${tam} bytes) contra completo (${JSON.stringify(a).length} bytes)`);
ok(ehLeve(r) && r.chatCount === 3 && r.versoesCount === 2 && r.numeroLimpo === '55301146120258090166', 'marcas: leve, conversa, versões, número limpo');
ok(r.result.minute.fundamentacao.length === 500 && r.result.minute.dispositivo.length === 400 && r.result.minute.relatorio.length === 300, 'excertos cortados nos tamanhos usados pela memória do assistente');
ok(r.result.minute.parties.author === 'Fulano de Tal' && r.result.minute.title === 'SENTENÇA' && r.lancadoProjudi === null, 'partes, título e marca de lançado');
ok(!('processTextContext' in r) && !r.versions && !r.chatMessages && !r.originalMinute && !r.result.minute.fullFormattedText, 'sem os campos pesados');
ok(r.result.paradigmUsed.title === 'Modelo 1' && !r.result.paradigmUsed.texto, 'paradigma só com o título');
ok(r.fonte === 'gabinetes/g/history' && r.corrompido === false, 'fonte (para abrir o ato) e veredito de corrompido');
const sem: any = { id: 'a2', processNumber: '', result: { minute: { parties: { author: 'parte autora', defendant: '' }, fullFormattedText: 'PROCESSO Nº 5530114-61.2025.8.09.0166\nFULANO DE TAL x EMPRESA X LTDA\n' } } };
ok(resumoLeve(sem).result.minute.processNumber === '5530114-61.2025.8.09.0166', 'número tirado da capa quando o ato não tinha');
ok(resumoLeve({ id: 'a3' }).corrompido === true && resumoLeve({ id: 'a4', result: { error: 'x' } }).corrompido === true && resumoLeve({ id: 'a5', originalMinute: {} }).corrompido === false, 'corrompido: sem minuta ou com erro');
ok(!ehLeve(a) && !ehLeve(null), 'ato completo não é leve');
process.exit(f ? 1 : 0);
