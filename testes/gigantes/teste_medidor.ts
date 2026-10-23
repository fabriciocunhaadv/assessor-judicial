// Medidor de leitura: estimativa por amostra, soma por origem, chaves seguras e resumo para o painel. Rodar: npx tsx testes/gigantes/teste_medidor.ts
import { Acumulador, chaveSegura, estimarBytes, formatarBytes, resumir } from '../../src/utils/medidorRegras';
import { medirLeitura, acumuladorMedidor } from '../../src/utils/medidorColeta';
let f = 0; const ok = (c: boolean, n: string) => { console.log(c ? 'ok' : 'FALHA', n); if (!c) f++; };
const doc = (n: number) => ({ data: () => ({ texto: 'x'.repeat(n), id: 1 }) });
ok(estimarBytes([]) === 0, 'lista vazia = 0 bytes');
const e = estimarBytes([doc(1000), doc(1000), doc(1000), doc(1000)]);
ok(e > 3900 && e < 4400, `4 docs de ~1 KB estimam ~4 KB (deu ${e})`);
ok(estimarBytes(Array.from({ length: 200 }, () => doc(100000))) > 15_000_000, '200 docs de 100 KB estimam > 15 MB (por amostra)');
ok(estimarBytes([{ a: 1 }, null as any, { b: 2 }]) > 0, 'documento nulo não derruba');
const circ: any = {}; circ.eu = circ; ok(estimarBytes([circ]) === 0, 'objeto circular é ignorado');
ok(chaveSegura('Histórico: janela 8 s!') === 'historico__janela_8_s_', 'chave sem acento, espaço ou ponto: ' + chaveSegura('Histórico: janela 8 s!'));
ok(chaveSegura('a.b') === 'a_b', 'ponto vira _ (ponto quebraria o campo do Firestore)');
const a = new Acumulador(); a.add('hist_app_60s', 200, 5_000_000); a.add('hist_app_60s', 100, 1_000_000); a.add('usuarios_lista', 11, 20_000);
const p = a.pegar(); ok(p.hist_app_60s.chamadas === 2 && p.hist_app_60s.docs === 300 && p.hist_app_60s.bytes === 6_000_000, 'soma por origem');
a.limpar(); ok(!a.temDados(), 'limpar zera'); a.devolver(p); ok(a.pegar().hist_app_60s.bytes === 6_000_000, 'devolver recoloca o que não foi enviado');
medirLeitura('teste_origem', [doc(500), doc(500)]); medirLeitura('teste_origem', null); ok(acumuladorMedidor.pegar().teste_origem.chamadas === 2, 'medirLeitura aceita lista nula');
const r = resumir([
  { data: '2026-10-22', uid: 'u1', email: 'a@x', nome: 'A', por: { hist_app_60s: { chamadas: 10, docs: 2000, bytes: 3e9 }, usuarios_lista: { chamadas: 1, docs: 11, bytes: 1e4 } } },
  { data: '2026-10-23', uid: 'u2', email: 'b@x', nome: 'B', por: { hist_app_60s: { chamadas: 5, docs: 1000, bytes: 1e9 } } },
]);
ok(r.porOrigem[0].origem === 'hist_app_60s' && r.porOrigem[0].usuarios === 2 && r.porOrigem[0].chamadas === 15, 'origem mais pesada primeiro, com usuários e chamadas somados');
ok(r.porDia.length === 2 && r.porUsuario[0].email === 'a@x' && r.totalBytes === 4e9 + 1e4, 'por dia, por usuário e total');
ok(formatarBytes(3e9).endsWith('GB') && formatarBytes(5e6).endsWith('MB') && formatarBytes(2048) === '2 KB', 'formatação de bytes');
ok(r.porOrigem[0].rotulo.includes('60 s'), 'rótulo legível para o painel');
process.exit(f ? 1 : 0);
