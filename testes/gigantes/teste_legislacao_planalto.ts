// Consulta à legislação oficial: acha os artigos citados, localiza o texto na página do Planalto (simulada) e monta o bloco do prompt. Rodar: npx tsx testes/gigantes/teste_legislacao_planalto.ts
import { decodificarPagina, extrairCitacoes, extrairTudo, candidatosDoAto, htmlParaLinhas, trechoDoArtigo, consultarLegislacao } from '../../src/utils/legislacaoPlanalto';
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
// ---- qualquer lei federal, leis locais e artigos alterados ----
ok(ids('art. 6º da Lei 8.987/95') === 'lei8987-1995:6', 'lei fora da lista conhecida (ano de 2 dígitos): ' + ids('art. 6º da Lei 8.987/95'));
ok(ids('Lei nº 8.987, de 13 de fevereiro de 1995, art. 6º') === 'lei8987-1995:6', 'lei antes do artigo, data por extenso: ' + ids('Lei nº 8.987, de 13 de fevereiro de 1995, art. 6º'));
ok(ids('art. 10 da Lei Complementar 101/2000') === 'lcp101-2000:10', 'lei complementar: ' + ids('art. 10 da Lei Complementar 101/2000'));
ok(ids('art. 2º do Decreto-Lei nº 3.365/41') === 'del3365-1941:2', 'decreto-lei: ' + ids('art. 2º do Decreto-Lei nº 3.365/41'));
ok(ids('art. 1º do Decreto nº 20.910/32') === 'dec20910-1932:1', 'decreto: ' + ids('art. 1º do Decreto nº 20.910/32'));
ok(ids('art. 3º da Lei 9.099/95') === 'l9099:3', 'lei conhecida continua usando a lista: ' + ids('art. 3º da Lei 9.099/95'));
const loc = extrairTudo('Aplica-se o art. 12 da Lei Municipal nº 1.234/2019 e o art. 3º da Lei nº 456/2018 do Município de Montes Claros de Goiás, além do art. 5º da Lei Estadual 15.000/2005.');
ok(loc.citacoes.length === 0 && loc.locais.length === 3, 'leis municipais/estaduais não viram consulta ao Planalto, só aviso: ' + JSON.stringify(loc.locais));
const c1 = candidatosDoAto({ tipo: 'lei', numero: '8987', ano: 1995 });
ok(c1[0].endsWith('/leis/l8987compilado.htm') && c1.some((u) => u.endsWith('/leis/l8987cons.htm')), 'candidatos de lei de 1995');
const c2 = candidatosDoAto({ tipo: 'lei', numero: '13709', ano: 2018 });
ok(c2.some((u) => u.includes('_ato2015-2018/2018/lei/l13709.htm')), 'candidatos de lei de 2018');
ok(candidatosDoAto({ tipo: 'del', numero: '3365' }).some((u) => u.endsWith('decreto-lei/del3365.htm')), 'candidatos de decreto-lei');
// resolução de uma lei fora da lista: só a página cujo cabeçalho é a lei pedida vale
const pag = (cab: string, extra = '') => ({ ok: true, status: 200, headers: { get: () => 'text/html; charset=windows-1252' }, arrayBuffer: async () => { const b = Buffer.from(`<html><body>${Array.from({ length: 25 }, (_, i) => `<p>Apresentação ${i}</p>`).join('')}<p>${cab}</p><p>Art. 6º Toda concessão ou permissão pressupõe a prestação de serviço adequado.</p><p>Art. 7º (Revogado pela Lei nº 9.999/2000)</p>${extra}</body></html>`, 'latin1'); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } });
const vistos: string[] = [];
(globalThis as any).fetch = async (url: string) => { vistos.push(url); if (url.endsWith('/leis/l8987cons.htm')) return pag('LEI Nº 8.987, DE 13 DE FEVEREIRO DE 1995.'); if (url.endsWith('/leis/l8987compilado.htm')) return pag('LEI Nº 1.111, DE 1 DE JANEIRO DE 1990.'); return { ok: false, status: 404, headers: { get: () => '' }, arrayBuffer: async () => new ArrayBuffer(0) }; };
const rd = await consultarLegislacao(['A concessionária descumpriu o art. 6º da Lei 8.987/95 e o art. 7º da mesma Lei 8.987/95.']);
ok(rd.consultados >= 1 && rd.bloco.includes('serviço adequado'), 'lei fora da lista localizada pelo número e ano: ' + rd.bloco.slice(0, 80));
ok(vistos.some((u) => u.endsWith('l8987compilado.htm')) && vistos.some((u) => u.endsWith('l8987cons.htm')), 'tentou o compilado primeiro e seguiu para o próximo endereço');
ok(!rd.bloco.includes('Lei 1.111'), 'página de outra lei (cabeçalho diferente) é descartada');
const rd2 = await consultarLegislacao(['art. 7º da Lei 8.987/95']); ok(rd2.bloco.includes('ARTIGO REVOGADO'), 'artigo revogado marcado');
const rd3 = await consultarLegislacao(['art. 12 da Lei Municipal nº 1.234/2019']); ok(rd3.bloco.includes('NÃO CONSULTADO') && rd3.consultados === 0, 'lei municipal: aviso de que não foi consultada');
(globalThis as any).fetch = async () => ({ ok: false, status: 404, headers: { get: () => '' }, arrayBuffer: async () => new ArrayBuffer(0) });
const rd4 = await consultarLegislacao(['art. 1º da Lei 12.345/2011']); ok(rd4.bloco === '' && rd4.falhas.length === 1, 'lei que não existe no Planalto: sem bloco e sem erro');
// ---- página exportada de editor de texto (como a da Lei 11.340): palavra partida em vários trechos e texto quebrado no meio do parágrafo ----
const sujo = `<html><body>${Array.from({ length: 30 }, (_, i) => `<p>Apresentação ${i}</p>`).join('')}
<p class=MsoNormal><span style='font-size:12.0pt'>A</span><span style='font-size:12.0pt'>rt. 5</span><sup><u>o</u></sup><span> Para os efeitos desta
Lei, configura violência doméstica e familiar contra a mulher qualquer ação ou omissão baseada no gênero,
conforme
art. 22 desta Lei: </span></p>
<p><span>Art.
22</span>. Constatada a prática de violência doméstica, poderá o juiz aplicar medidas protetivas.</p>
<p>Art. 23. Poderá o juiz.</p></body></html>`;
const ls = htmlParaLinhas(sujo);
const a5 = trechoDoArtigo(ls, '5'); ok(!!a5 && a5.texto.includes('configura violência doméstica') && a5.texto.includes('conforme art. 22 desta Lei') && !a5.texto.includes('Constatada'), 'art. 5 com palavra partida em trechos e texto quebrado no meio: ' + (a5 ? a5.texto.slice(0, 90) : 'null'));
const a22 = trechoDoArtigo(ls, '22'); ok(!!a22 && a22.texto.includes('Constatada a prática'), 'art. 22 com quebra de linha entre "Art." e o número: ' + (a22 ? a22.texto.slice(0, 60) : 'null'));
// ---- página sem marcas de parágrafo (só quebras de linha do arquivo) e motivo da falha ----
const semP = `<html><body><pre>\n${Array.from({ length: 30 }, (_, i) => `Apresentação ${i}`).join('\n')}\nArt.\n5o Para os efeitos desta Lei, configura violência doméstica.\nArt. 6o A violência doméstica constitui violação dos direitos humanos.\n</pre></body></html>`;
const ls2 = htmlParaLinhas(semP);
ok(ls2.length >= 20 && (trechoDoArtigo(ls2, '5')?.texto || '').includes('configura violência doméstica'), 'página sem <p>, "Art." sozinho na linha: ' + ls2.length + ' linhas');
ok((trechoDoArtigo(ls2, '6')?.texto || '').includes('violação dos direitos humanos'), 'art. 6 da página sem <p>');
(globalThis as any).fetch = async () => ({ ok: false, status: 403, headers: { get: () => '' }, arrayBuffer: async () => new ArrayBuffer(0) });
const { testarLegislacao } = await import('../../src/utils/legislacaoPlanalto');
const tt = await testarLegislacao('art. 5º da Lei 11.340/2006'); ok(tt.reconhecidos[0].diplomaLocalizado === false && /403/.test(tt.reconhecidos[0].motivoDaFalha || ''), 'teste manual informa o motivo da falha: ' + tt.reconhecidos[0].motivoDaFalha);
// ---- página gravada em UTF-16 (como a da Lei 11.340): big-endian sem marca, little-endian com marca ----
const paginaTxt = '<html><body>' + Array.from({ length: 30 }, (_, i) => `<p>Apresentação ${i}</p>`).join('') + '<p>Art. 5º Para os efeitos desta Lei, configura violência doméstica.</p><p>Art. 6º Fim.</p></body></html>';
const be = new Uint8Array(paginaTxt.length * 2); for (let i = 0; i < paginaTxt.length; i++) { const c = paginaTxt.charCodeAt(i); be[2 * i] = c >> 8; be[2 * i + 1] = c & 255; }
const leBytes = new Uint8Array(paginaTxt.length * 2 + 2); leBytes[0] = 0xff; leBytes[1] = 0xfe; for (let i = 0; i < paginaTxt.length; i++) { const c = paginaTxt.charCodeAt(i); leBytes[2 + 2 * i] = c & 255; leBytes[3 + 2 * i] = c >> 8; }
const leSemMarca = new Uint8Array(paginaTxt.length * 2); for (let i = 0; i < paginaTxt.length; i++) { const c = paginaTxt.charCodeAt(i); leSemMarca[2 * i] = c & 255; leSemMarca[2 * i + 1] = c >> 8; }
for (const [nome, bytes] of [['UTF-16 big-endian sem marca', be], ['UTF-16 little-endian com marca', leBytes], ['UTF-16 little-endian sem marca', leSemMarca]] as const) {
  const l16 = htmlParaLinhas(decodificarPagina(bytes, 'text/html'));
  ok(!!trechoDoArtigo(l16, '5')?.texto.includes('violência doméstica') && !trechoDoArtigo(l16, '5')?.texto.includes('\u0000'), nome + ': artigo 5 lido');
}
ok(decodificarPagina(Buffer.from('<p>Art. 1º ação</p>', 'latin1'), 'text/html; charset=windows-1252').includes('1º ação'), 'página comum em Windows-1252 continua certa');
process.exit(f ? 1 : 0);
