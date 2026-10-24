// CONSULTA À LEGISLAÇÃO OFICIAL (planalto.gov.br): os artigos citados nos autos e na minuta são buscados no texto oficial e entram no prompt, para a IA conferir número e redação
// em vez de citar de memória. Roda no servidor. Qualquer falha (site fora do ar, artigo não achado) é silenciosa: a minuta segue como antes, sem o bloco.
export interface Diploma { id: string; nome: string; url: string; alias: RegExp }
const P = "https://www.planalto.gov.br/ccivil_03/";
export const DIPLOMAS: Diploma[] = [
  { id: "cpc", nome: "Código de Processo Civil (Lei 13.105/2015)", url: P + "_ato2015-2018/2015/lei/l13105.htm", alias: /\bCPC\b|C[óo]digo de Processo Civil|13\.?105/i },
  { id: "cc", nome: "Código Civil (Lei 10.406/2002)", url: P + "leis/2002/l10406compilada.htm", alias: /\bCC(?:\/0?2)?\b|C[óo]digo Civil|10\.?406/i },
  { id: "cdc", nome: "Código de Defesa do Consumidor (Lei 8.078/1990)", url: P + "leis/l8078compilado.htm", alias: /\bCDC\b|Defesa do Consumidor|8\.?078/i },
  { id: "cf", nome: "Constituição Federal de 1988", url: P + "constituicao/constituicao.htm", alias: /\bCF(?:\/88)?\b|\bCRFB\b|Constitui[çc][ãa]o Federal|Constitui[çc][ãa]o da Rep[úu]blica/i },
  { id: "cpp", nome: "Código de Processo Penal (Decreto-Lei 3.689/1941)", url: P + "decreto-lei/del3689compilado.htm", alias: /\bCPP\b|Processo Penal|3\.?689/i },
  { id: "cp", nome: "Código Penal (Decreto-Lei 2.848/1940)", url: P + "decreto-lei/del2848compilado.htm", alias: /\bCP\b|C[óo]digo Penal|2\.?848/i },
  { id: "l9099", nome: "Lei dos Juizados Especiais (Lei 9.099/1995)", url: P + "leis/l9099.htm", alias: /9\.?099/ },
  { id: "l12153", nome: "Juizados da Fazenda Pública (Lei 12.153/2009)", url: P + "_ato2007-2010/2009/lei/l12153.htm", alias: /12\.?153/ },
  { id: "l10259", nome: "Juizados Especiais Federais (Lei 10.259/2001)", url: P + "leis/leis_2001/l10259.htm", alias: /10\.?259/ },
  { id: "lef", nome: "Lei de Execução Fiscal (Lei 6.830/1980)", url: P + "leis/l6830.htm", alias: /6\.?830|Execu[çc][ãa]o Fiscal/i },
  { id: "eca", nome: "Estatuto da Criança e do Adolescente (Lei 8.069/1990)", url: P + "leis/l8069.htm", alias: /\bECA\b|8\.?069|Estatuto da Crian/i },
  { id: "l8429", nome: "Lei de Improbidade Administrativa (Lei 8.429/1992)", url: P + "leis/l8429.htm", alias: /8\.?429|Improbidade/i },
  { id: "clt", nome: "Consolidação das Leis do Trabalho (Decreto-Lei 5.452/1943)", url: P + "decreto-lei/del5452.htm", alias: /\bCLT\b|Consolida[çc][ãa]o das Leis do Trabalho/i },
  { id: "ctn", nome: "Código Tributário Nacional (Lei 5.172/1966)", url: P + "leis/l5172compilado.htm", alias: /\bCTN\b|5\.?172|C[óo]digo Tribut[áa]rio/i },
  { id: "l8213", nome: "Lei de Benefícios da Previdência (Lei 8.213/1991)", url: P + "leis/l8213cons.htm", alias: /8\.?213/ },
  { id: "l11340", nome: "Lei Maria da Penha (Lei 11.340/2006)", url: P + "_ato2004-2006/2006/lei/l11340.htm", alias: /11\.?340|Maria da Penha/i },
  { id: "l11343", nome: "Lei de Drogas (Lei 11.343/2006)", url: P + "_ato2004-2006/2006/lei/l11343.htm", alias: /11\.?343|Lei de Drogas/i },
  { id: "ctb", nome: "Código de Trânsito Brasileiro (Lei 9.503/1997)", url: P + "leis/l9503compilado.htm", alias: /\bCTB\b|9\.?503|C[óo]digo de Tr[âa]nsito/i },
  { id: "l14133", nome: "Lei de Licitações (Lei 14.133/2021)", url: P + "_ato2019-2022/2021/lei/l14133.htm", alias: /14\.?133/ },
  { id: "l12016", nome: "Lei do Mandado de Segurança (Lei 12.016/2009)", url: P + "_ato2007-2010/2009/lei/l12016.htm", alias: /12\.?016/ },
  { id: "l6015", nome: "Lei de Registros Públicos (Lei 6.015/1973)", url: P + "leis/l6015compilada.htm", alias: /6\.?015|Registros P[úu]blicos/i },
  { id: "lindb", nome: "LINDB (Decreto-Lei 4.657/1942)", url: P + "decreto-lei/del4657compilado.htm", alias: /\bLINDB\b|4\.?657|Introdu[çc][ãa]o [àa]s Normas/i },
  { id: "l8245", nome: "Lei do Inquilinato (Lei 8.245/1991)", url: P + "leis/l8245.htm", alias: /8\.?245|Inquilinato/i },
  { id: "l14905", nome: "Juros e correção (Lei 14.905/2024)", url: P + "_ato2023-2026/2024/lei/l14905.htm", alias: /14\.?905/ },
];

export interface Citacao { diploma: Diploma; artigo: string }

/** Acha "art. 489 do CPC", "arts. 389 e 406 do CC", "art. 6º, VIII, do CDC", "art. 5º da Lei 9.099/95"... Só vale quando o diploma aparece logo depois do artigo. */
export function extrairCitacoes(texto: string, max = 10): Citacao[] {
  const t = String(texto || "");
  const cont = new Map<string, { c: Citacao; n: number }>();
  const re = /\bart(?:igo)?s?\.?\s*(\d{1,4}(?:\s*-\s*[A-Z])?)\s*[º°o]?((?:\s*(?:,|e|a|ao|à)\s*\d{1,4}(?:\s*-\s*[A-Z])?\s*[º°o]?){0,3})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const janela = t.slice(m.index + m[0].length, m.index + m[0].length + 90);
    let achado: { d: Diploma; pos: number } | null = null;
    for (const d of DIPLOMAS) {
      const r = d.alias.exec(janela); if (!r) continue;
      if (!achado || r.index < achado.pos) achado = { d, pos: r.index };
    }
    if (!achado) continue;
    const nums = [m[1], ...(m[2] || "").split(/[,]|\be\b|\ba\b|\bao\b|à/i).map((x) => x.trim()).filter((x) => /^\d/.test(x))];
    for (const raw of nums) {
      const artigo = raw.replace(/[º°o\s]/g, "").replace(/-/g, "-").toUpperCase();
      if (!artigo) continue;
      const k = `${achado.d.id}:${artigo}`, x = cont.get(k);
      if (x) x.n++; else cont.set(k, { c: { diploma: achado.d, artigo }, n: 1 });
    }
  }
  return [...cont.values()].sort((a, b) => b.n - a.n).slice(0, max).map((x) => x.c);
}

const ACENTOS: Record<string, string> = { a: "aáàâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç", n: "nñ" };
const ENTIDADES: Record<string, string> = { nbsp: " ", ordm: "º", deg: "°", sect: "§", ordf: "ª", quot: '"', amp: "&", lt: "<", gt: ">", ndash: "–", mdash: "—", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’" };
for (const [base, lista] of Object.entries(ACENTOS)) for (const [nome, ch] of [["acute", 1], ["grave", 2], ["circ", 3], ["tilde", 4], ["uml", 5]] as const) { const c = lista[ch as number]; if (c) { ENTIDADES[base + nome] = c; ENTIDADES[base.toUpperCase() + nome] = c.toUpperCase(); } }
ENTIDADES.ccedil = "ç"; ENTIDADES.Ccedil = "Ç"; ENTIDADES.ntilde = "ñ";
const decodificarEntidades = (s: string) => s.replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES[n] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** HTML do Planalto -> linhas de texto (uma por parágrafo). */
export function htmlParaLinhas(html: string): string[] {
  const t = decodificarEntidades(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<\/(p|div|tr|li|h\d)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
  return t.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export interface TextoArtigo { texto: string; revogado: boolean }
/** Pega o artigo (caput, parágrafos e incisos) até o início do próximo artigo. */
export function trechoDoArtigo(linhas: string[], artigo: string, limite = 2200): TextoArtigo | null {
  const m = /^(\d{1,4})(?:-([A-Z]))?$/.exec(artigo.toUpperCase()); if (!m) return null;
  const sufixo = m[2] ? `\\s*-\\s*${m[2]}` : "(?!\\s*-\\s*[A-Z])";
  const ini = new RegExp(`^Art\\.?\\s*${m[1]}\\s*[º°o]?${sufixo}(?![\\d])`, "i");
  const i = linhas.findIndex((l) => ini.test(l));
  if (i < 0) return null;
  const partes = [linhas[i]];
  for (let j = i + 1; j < linhas.length && partes.join("\n").length < limite; j++) {
    if (/^Art\.?\s*\d/i.test(linhas[j]) || /^(CAP[ÍI]TULO|T[ÍI]TULO|LIVRO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|PARTE)\b/i.test(linhas[j])) break;
    partes.push(linhas[j]);
  }
  const texto = partes.join("\n").slice(0, limite);
  return { texto, revogado: /\(\s*Revogad[oa]/i.test(partes[0].slice(0, 400)) && partes[0].length < 400 };
}

const cache = new Map<string, { em: number; linhas: string[] }>();
const VALIDADE_MS = 12 * 3600_000;
async function linhasDoDiploma(d: Diploma, timeoutMs: number): Promise<string[] | null> {
  const c = cache.get(d.id);
  if (c && Date.now() - c.em < VALIDADE_MS) return c.linhas;
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(d.url.replace("https://www.planalto.gov.br/", process.env.PLANALTO_BASE || "https://www.planalto.gov.br/"), { signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; AssessorJudicial/1.0)", "Accept": "text/html" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const buf = await r.arrayBuffer();
    const cs = /charset=([\w-]+)/i.exec(r.headers.get("content-type") || "")?.[1] || (/<meta[^>]+charset=["']?([\w-]+)/i.exec(Buffer.from(buf).subarray(0, 2000).toString("latin1"))?.[1]) || "windows-1252";
    let html: string; try { html = new TextDecoder(cs).decode(buf); } catch { html = new TextDecoder("windows-1252").decode(buf); }
    const linhas = htmlParaLinhas(html);
    if (linhas.length < 20) throw new Error("página sem conteúdo reconhecível");
    if (cache.size >= 10) cache.delete(cache.keys().next().value as string);
    cache.set(d.id, { em: Date.now(), linhas });
    return linhas;
  } catch (e: any) { console.warn(`[Legislação] ${d.id}: não consegui consultar o Planalto (${e?.name === "AbortError" ? "tempo esgotado" : e?.message || e}).`); return null; }
  finally { clearTimeout(to); }
}

export interface ResultadoLegislacao { bloco: string; consultados: number; naoAchados: string[]; falhas: string[] }
/** Consulta os artigos citados e monta o bloco para o prompt. Nunca lança erro. */
export async function consultarLegislacao(textos: string[], opts: { maxArtigos?: number; timeoutMs?: number } = {}): Promise<ResultadoLegislacao> {
  const vazio: ResultadoLegislacao = { bloco: "", consultados: 0, naoAchados: [], falhas: [] };
  try {
    const citacoes: Citacao[] = [];
    for (const t of textos) for (const c of extrairCitacoes(t, opts.maxArtigos ?? 10)) if (!citacoes.some((x) => x.diploma.id === c.diploma.id && x.artigo === c.artigo)) citacoes.push(c);
    const lista = citacoes.slice(0, opts.maxArtigos ?? 10);
    if (!lista.length) return vazio;
    const diplomas = [...new Set(lista.map((c) => c.diploma))];
    const baixados = new Map<string, string[] | null>();
    await Promise.all(diplomas.map(async (d) => baixados.set(d.id, await linhasDoDiploma(d, opts.timeoutMs ?? 8000))));
    const linhas: string[] = [], naoAchados: string[] = [], falhas: string[] = [];
    for (const c of lista) {
      const base = baixados.get(c.diploma.id);
      if (!base) { if (!falhas.includes(c.diploma.nome)) falhas.push(c.diploma.nome); continue; }
      const tr = trechoDoArtigo(base, c.artigo);
      if (!tr) { naoAchados.push(`${c.diploma.nome}, art. ${c.artigo}`); continue; }
      linhas.push(`• ${c.diploma.nome} — ${tr.revogado ? "ARTIGO REVOGADO (não fundamentar nele) — " : ""}\n${tr.texto}`);
    }
    if (!linhas.length && !naoAchados.length) return { ...vazio, falhas };
    const hoje = new Date().toLocaleDateString("pt-BR");
    const bloco = `\n\n[LEGISLAÇÃO OFICIAL CONSULTADA NO PLANALTO (planalto.gov.br) em ${hoje}]:\n${linhas.join("\n\n")}` +
      (naoAchados.length ? `\n\nNão localizei no texto oficial: ${naoAchados.join("; ")}. Confira se o número do artigo e o diploma citados estão corretos.` : "") +
      `\n\nDIRETRIZ: ao citar esses dispositivos, confira o número, o caput e os parágrafos com o texto oficial acima; se a citação do rascunho divergir, corrija. Não cite como vigente o que estiver marcado como revogado. Para dispositivos que não constam acima, cite com cautela e apenas o que tiver certeza.\n`;
    return { bloco, consultados: linhas.length, naoAchados, falhas };
  } catch (e) { console.warn("[Legislação] falha inesperada na consulta; segue sem o bloco:", e); return vazio; }
}

/** Diagnóstico: quais diplomas o servidor consegue consultar agora (sem devolver conteúdo). */
export async function diagnosticoLegislacao(): Promise<Array<{ id: string; ok: boolean }>> {
  return Promise.all(DIPLOMAS.map(async (d) => ({ id: d.id, ok: !!(await linhasDoDiploma(d, 10000)) })));
}
