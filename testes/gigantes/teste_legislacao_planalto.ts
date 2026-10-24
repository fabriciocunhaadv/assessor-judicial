// Consulta à legislação oficial: acha os artigos citados, localiza o texto na página do Planalto (simulada) e monta o bloco do prompt. Rodar: npx tsx testes/gigantes/teste_legislacao_planalto.ts
import { extrairCitacoes, htmlParaLinhas, trechoDoArtigo, consultarLegislacao } from '../../src/utils/legislacaoPlanalto';
let f = 0; const ok = (c: boolean, n: string) => { console.log(c ? 'ok' : 'FALHA', n); if (!c) f++; };
const ids = (t: string) => extrairCitacoes(t).map((c) => `${c.diploma.id}:${c.artigo}`).sort().join(',');
ok(ids('conforme o art. 489, § 1º, do CPC') === 'cpc:489', 'art. 489 do CPC');
ok(ids('arts. 389 e 406 do Código Civil') === 'cc:389,cc:406', 'dois artigos do CC: ' + ids('arts. 389 e 406 do Código Civil'));
ok(ids('art. 6º, VIII, do CDC e art. 14 do CDC') === 'cdc:14,cdc:6', 'CDC com inciso: ' + ids('art. 6º, VIII, do CDC e art. 14 do CDC'));
ok(ids('art. 55 da Lei nº 9.099/95') === 'l9099:55', 'Lei 9.099');
ok(ids('art. 489-A do CPC') === 'cpc:489-A', 'artigo com letra');
ok(ids('o art. 5º da CF/88') === 'cf:5', 'CF/88');
ok(ids('art. 155 do CPP e art. 155 do CP') === 'cp:155,cpp:155', 'CPP e CP separados: ' + ids('art. 155 do CPP e art. 155 do CP'));
ok(ids('o artigo 10 da peça inicial') === '', 'artigo sem diploma: ignora');
const html = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252"></head><body>` +
  Array.from({ length: 30 }, (_, i) => `<p>Linha de apresentação ${i}</p>`).join('') +
  `<p>CAPÍTULO I</p><p>Art. 1o O processo civil será ordenado, disciplinado e interpretado conforme as normas fundamentais.</p>` +
  `<p>Art. 489. São elementos essenciais da sentença:</p><p>I - o relatório;</p><p>II - os fundamentos;</p><p>&sect; 1&ordm; N&atilde;o se considera fundamentada qualquer decis&atilde;o judicial.</p>` +
  `<p>Art. 489-A. Texto distinto do 489.</p><p>Art. 490. Fim.</p><p>Art. 500. (Revogado pela Lei nº 1/2020)</p>`;
const linhas = htmlParaLinhas(html);
const a489 = trechoDoArtigo(linhas, '489');
ok(!!a489 && a489.texto.includes('elementos essenciais') && a489.texto.includes('§ 1º Não se considera') && !a489.texto.includes('Texto distinto'), 'art. 489 completo, sem invadir o 489-A');
ok(trechoDoArtigo(linhas, '489-A')?.texto.includes('Texto distinto') === true, 'art. 489-A');
ok(trechoDoArtigo(linhas, '1')?.texto.includes('normas fundamentais') === true, 'Art. 1o');
ok(trechoDoArtigo(linhas, '500')?.revogado === true, 'revogado reconhecido');
ok(trechoDoArtigo(linhas, '999') === null, 'artigo inexistente: null');
// consulta completa com o Planalto simulado (página em windows-1252)
let chamadas = 0;
(globalThis as any).fetch = async (url: string) => { chamadas++; const buf = Buffer.from(html.replace(/&sect;/g, '§'), 'latin1'); return { ok: true, status: 200, headers: { get: () => 'text/html; charset=windows-1252' }, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }; };
const r = await consultarLegislacao(['sentença com art. 489 do CPC e art. 999 do CPC']);
ok(r.consultados === 1 && r.bloco.includes('elementos essenciais') && r.naoAchados.length === 1 && r.bloco.includes('Não localizei'), 'bloco montado e artigo inexistente avisado');
await consultarLegislacao(['art. 490 do CPC']); ok(chamadas === 1, 'segunda consulta usa a cópia em memória (sem novo acesso ao site)');
(globalThis as any).fetch = async () => { throw new Error('rede fora do ar'); };
const r2 = await consultarLegislacao(['art. 5º da CF/88']); ok(r2.bloco === '' && r2.falhas.length === 1, 'site fora do ar: sem bloco, sem erro');
ok((await consultarLegislacao(['sem artigos'])).bloco === '', 'sem citação: nada a consultar');
process.exit(f ? 1 : 0);
