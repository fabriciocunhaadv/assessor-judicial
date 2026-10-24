// CONSULTA À LEGISLAÇÃO OFICIAL (planalto.gov.br): os artigos citados nos autos e na minuta são buscados no texto oficial e entram no prompt, para a IA conferir número e redação
// em vez de citar de memória. Roda no servidor. Qualquer falha (site fora do ar, artigo não achado) é silenciosa: a minuta segue como antes, sem o bloco.
export type TipoAto = "lei" | "lcp" | "del" | "dec" | "emc";
export interface RefAto { tipo: TipoAto; numero: string; ano?: number }
export interface Diploma { id: string; nome: string; url: string; alias: RegExp; ref?: RefAto }
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

// ===== QUALQUER LEI FEDERAL (não só as 24 conhecidas): o número e o ano citados nos autos levam ao endereço no Planalto =====
const ROTULO: Record<TipoAto, string> = { lei: "Lei", lcp: "Lei Complementar", del: "Decreto-Lei", dec: "Decreto", emc: "Emenda Constitucional" };
const RANGES: Array<[number, number]> = [[2004, 2006], [2007, 2010], [2011, 2014], [2015, 2018], [2019, 2022], [2023, 2026]];
const ANCORAS: Array<[number, number]> = [[1, 1937], [4000, 1962], [5000, 1966], [6000, 1973], [7000, 1984], [8000, 1990], [9000, 1994], [9500, 1997], [10000, 1999], [10500, 2002], [11000, 2005], [11500, 2007], [12000, 2008], [12500, 2010], [13000, 2015], [13500, 2017], [14000, 2020], [14500, 2022], [15000, 2023], [15500, 2024]];
const anoCompleto = (y?: string | number): number | undefined => { if (y == null || y === "") return undefined; const n = Number(y); if (!isFinite(n)) return undefined; return n >= 1000 ? n : (n <= 26 ? 2000 + n : 1900 + n); };
const anosProvaveis = (n: number): number[] => { let est = 2024; for (let i = 0; i < ANCORAS.length; i++) if (n >= ANCORAS[i][0]) est = ANCORAS[i][1] + (ANCORAS[i + 1] ? Math.round(((n - ANCORAS[i][0]) / (ANCORAS[i + 1][0] - ANCORAS[i][0])) * (ANCORAS[i + 1][1] - ANCORAS[i][1])) : 0); return [est, est - 1, est + 1].filter((y) => y >= 1937 && y <= 2026); };
const faixa = (y: number) => RANGES.find(([a, b]) => y >= a && y <= b);
const numPonto = (n: string) => (n.length > 3 ? `${n.slice(0, -3)}.${n.slice(-3)}` : n);

/** Endereços prováveis no Planalto para o ato (o Planalto não segue um padrão único); o texto compilado (atualizado) vem primeiro. */
export function candidatosDoAto(ref: RefAto): string[] {
  const n = ref.numero.replace(/\D/g, ""), nd = numPonto(n), out: string[] = [];
  const add = (u: string) => { if (!out.includes(u)) out.push(P + u); };
  const anos = ref.ano ? [ref.ano] : anosProvaveis(Number(n));
  if (ref.tipo === "lei") {
    const dirs = ["leis/"]; for (const y of anos) { if (y === 2001) dirs.push("leis/leis_2001/", "leis/2001/"); else if (y === 2002 || y === 2003) dirs.push(`leis/${y}/`); else { const f = faixa(y); if (f) dirs.push(`_ato${f[0]}-${f[1]}/${y}/lei/`); } }
    for (const d of [...new Set(dirs)]) for (const suf of ["compilado", "cons", "compilada", ""]) for (const pre of ["l", "L"]) { add(`${d}${pre}${n}${suf}.htm`); if (/\/(2002|2003)\//.test(d)) add(`${d}${pre}${nd}${suf}.htm`); }
  } else if (ref.tipo === "lcp") {
    for (const suf of ["compilado", "", "cons"]) for (const pre of ["lcp", "Lcp"]) add(`leis/lcp/${pre}${n}${suf}.htm`);
    for (const y of anos) { const f = faixa(y); if (f) for (const pre of ["lcp", "Lcp"]) add(`_ato${f[0]}-${f[1]}/${y}/lei/${pre}${n}.htm`); }
  } else if (ref.tipo === "del") {
    const pad = n.padStart(4, "0");
    for (const suf of ["compilado", ""]) for (const num of [pad, n]) for (const pre of ["del", "Del"]) add(`decreto-lei/${pre}${num}${suf}.htm`);
  } else if (ref.tipo === "dec") {
    for (const y of anos) { const f = faixa(y); if (f) for (const pre of ["d", "D"]) { add(`_ato${f[0]}-${f[1]}/${y}/decreto/${pre}${n}.htm`); } }
    for (const pre of ["d", "D"]) { add(`decreto/${pre}${n}compilado.htm`); add(`decreto/${pre}${n}.htm`); }
  } else {
    add(`constituicao/emendas/emc/emc${n}compilado.htm`); add(`constituicao/emendas/emc/emc${n}.htm`); add(`constituicao/emendas/emc/Emc${n}.htm`);
  }
  return out;
}

const cabecalhoDoAto = (ref: RefAto): RegExp => { const n = ref.numero.replace(/\D/g, ""), num = n.length > 3 ? `${n.slice(0, -3)}\\.?${n.slice(-3)}` : n; const nome = { lei: "lei", lcp: "lei\\s+complementar", del: "decreto[\\s-]+lei", dec: "decreto", emc: "emenda\\s+constitucional" }[ref.tipo]; return new RegExp(`(?<![a-z-])${nome}\\s+n[º°o.]{0,2}\\s*${num}(?!\\d)`, "i"); };

const dinamicos = new Map<string, Diploma>();
export function diplomaDoAto(ref: RefAto): Diploma {
  const id = `${ref.tipo}${ref.numero.replace(/\D/g, "")}-${ref.ano || 0}`;
  let d = dinamicos.get(id);
  if (!d) { d = { id, nome: `${ROTULO[ref.tipo]} ${numPonto(ref.numero.replace(/\D/g, ""))}${ref.ano ? "/" + ref.ano : ""}`, url: "", alias: /$^/, ref }; if (dinamicos.size > 200) dinamicos.clear(); dinamicos.set(id, d); }
  return d;
}

const LEI_RE = /\b(Lei\s+Complementar|Lei|Decreto[\s-]+Lei|Decreto|Emenda\s+Constitucional)\s*(?:Federal\s+)?(?:n[º°o.]{0,2}\s*)?(\d{1,2}\.\d{3}|\d{1,5})(?:\s*(?:\/|-)\s*(\d{4}|\d{2})\b|\s*,\s*de\s+(?:\d{1,2}[º°]?\s+de\s+[a-zç]+\s+de\s+)?(\d{4}))?/gi;
const LOCAL_RE = /\bLei\s+(?:Complementar\s+)?(?:Municipal|Estadual|Distrital|Org[âa]nica)(?:\s+(?:Complementar|Ordin[áa]ria))?\s*(?:n[º°o.]{0,2}\s*)?\d[\d.]*(?:\s*\/\s*\d{2,4})?(?:[^.;\n]{0,40}?\b(?:do|da)\s+(?:Munic[íi]pio|Estado)\s+d[eao]s?\s+[A-ZÁ-Ú][\wá-ú]+(?:\s+(?:de\s+)?[A-ZÁ-Ú][\wá-ú]+){0,2})?/gi;
const tipoDe = (r: string): TipoAto => { const x = r.toLowerCase().replace(/\s+/g, " "); return x.startsWith("lei complementar") ? "lcp" : x.startsWith("emenda") ? "emc" : /^decreto[ -]lei/.test(x) ? "del" : x.startsWith("decreto") ? "dec" : "lei"; };
const ehLocal = (t: string, fim: number) => /^[^.;\n]{0,45}?\b(?:do|da)\s+(?:Munic[íi]pio|Estado)\b/i.test(t.slice(fim, fim + 70));

export interface ExtracaoCitacoes { citacoes: Citacao[]; locais: string[] }
const ARTIGO_APOS = /^\s*[,;(]?\s*(?:c\/c\s*)?(?:em\s+seu\s+|no\s+|nos\s+)?art(?:igo)?s?\.?\s*(\d{1,4}(?:\s*-\s*[A-Z])?)/i;

/** Acha "art. 489 do CPC", "arts. 389 e 406 do CC", "art. 6º da Lei 8.987/95", "Lei 8.987/95, art. 6º"... A lei pode ser qualquer lei federal; leis municipais e estaduais são listadas à parte (o texto delas não é consultado). */
export function extrairTudo(texto: string, max = 10): ExtracaoCitacoes {
  const t = String(texto || "");
  const cont = new Map<string, { c: Citacao; n: number }>();
  const locais = new Set<string>();
  const somar = (d: Diploma, artigo: string) => { const a = artigo.replace(/[º°o\s]/g, "").toUpperCase(); if (!a) return; const k = `${d.id}:${a}`, x = cont.get(k); if (x) x.n++; else cont.set(k, { c: { diploma: d, artigo: a }, n: 1 }); };
  const diplomaDoMatch = (m: RegExpExecArray): Diploma | null => {
    const estatico = DIPLOMAS.find((d) => d.alias.test(m[0])); if (estatico) return estatico;
    return diplomaDoAto({ tipo: tipoDe(m[1]), numero: m[2].replace(/\D/g, ""), ano: anoCompleto(m[3] || m[4]) });
  };
  let lm: RegExpExecArray | null;
  const rl = new RegExp(LOCAL_RE.source, "gi"); while ((lm = rl.exec(t)) && locais.size < 6) locais.add(lm[0].replace(/\s+/g, " ").trim().slice(0, 110));
  const re = /\bart(?:igo)?s?\.?\s*(\d{1,4}(?:\s*-\s*[A-Z])?)\s*[º°o]?((?:\s*(?:,|e|a|ao|à)\s*\d{1,4}(?:\s*-\s*[A-Z])?\s*[º°o]?){0,3})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const ini = m.index + m[0].length, janela = t.slice(ini, ini + 90);
    let achado: { d: Diploma; pos: number } | null = null;
    for (const d of DIPLOMAS) { const r = d.alias.exec(janela); if (!r) continue; if (!achado || r.index < achado.pos) achado = { d, pos: r.index }; }
    const rj = new RegExp(LEI_RE.source, "gi"); let dm: RegExpExecArray | null;
    while ((dm = rj.exec(janela))) {
      if (achado && dm.index >= achado.pos) break;
      if (ehLocal(janela, dm.index + dm[0].length) || /(?:municipal|estadual|distrital)\s*$/i.test(janela.slice(Math.max(0, dm.index - 14), dm.index))) { achado = null; break; }
      const d = diplomaDoMatch(dm); if (d) achado = { d, pos: dm.index };
      break;
    }
    if (!achado) continue;
    const nums = [m[1], ...(m[2] || "").split(/[,]|\be\b|\ba\b|\bao\b|à/i).map((x) => x.trim()).filter((x) => /^\d/.test(x))];
    for (const raw of nums) somar(achado.d, raw);
  }
  // lei citada primeiro, artigo depois: "Lei 8.987/95, art. 6º"
  const rr = new RegExp(LEI_RE.source, "gi");
  while ((m = rr.exec(t))) {
    const fim = m.index + m[0].length;
    if (ehLocal(t, fim)) { const cauda = /^[^.;\n]{0,45}?\b(?:do|da)\s+(?:Munic[íi]pio|Estado)\s+d[eao]s?\s+[A-ZÁ-Ú][\wá-ú]+(?:\s+(?:de\s+)?[A-ZÁ-Ú][\wá-ú]+){0,2}/i.exec(t.slice(fim, fim + 110)); if (locais.size < 6) locais.add((m[0] + (cauda ? cauda[0] : "")).replace(/\s+/g, " ").trim().slice(0, 110)); continue; }
    if (/(?:municipal|estadual|distrital)\s*$/i.test(t.slice(Math.max(0, m.index - 14), m.index))) continue;
    const a = ARTIGO_APOS.exec(t.slice(fim, fim + 60)); if (!a) continue;
    const d = diplomaDoMatch(m); if (d) somar(d, a[1]);
  }
  return { citacoes: [...cont.values()].sort((x, y) => y.n - x.n).slice(0, max).map((x) => x.c), locais: [...locais] };
}
export const extrairCitacoes = (texto: string, max = 10): Citacao[] => extrairTudo(texto, max).citacoes;

const ACENTOS: Record<string, string> = { a: "aáàâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç", n: "nñ" };
const ENTIDADES: Record<string, string> = { nbsp: " ", ordm: "º", deg: "°", sect: "§", ordf: "ª", quot: '"', amp: "&", lt: "<", gt: ">", ndash: "–", mdash: "—", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’" };
for (const [base, lista] of Object.entries(ACENTOS)) for (const [nome, ch] of [["acute", 1], ["grave", 2], ["circ", 3], ["tilde", 4], ["uml", 5]] as const) { const c = lista[ch as number]; if (c) { ENTIDADES[base + nome] = c; ENTIDADES[base.toUpperCase() + nome] = c.toUpperCase(); } }
ENTIDADES.ccedil = "ç"; ENTIDADES.Ccedil = "Ç"; ENTIDADES.ntilde = "ñ";
const decodificarEntidades = (s: string) => s.replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES[n] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** HTML do Planalto -> linhas de texto (uma por parágrafo). */
function limparHtml(html: string, manterQuebrasDoArquivo: boolean): string[] {
  // marcas de bloco (parágrafo, linha, quebra) viram quebra de linha; marcas de célula viram espaço; as demais (span, font, a, b, sup...) somem SEM deixar espaço,
  // porque páginas exportadas de editores de texto partem uma palavra em vários trechos ("A" + "rt. 5"): trocar por espaço quebraria "Art."
  // por padrão, quebras de linha e tabulações do arquivo-fonte são só espaço (o Planalto quebra o texto no meio do parágrafo, até entre "Art." e o número)
  const t = decodificarEntidades(html
    .replace(/[\r\n\t]+/g, manterQuebrasDoArquivo ? "\n" : " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:p|div|tr|li|ul|ol|table|tbody|h\d|blockquote|center|dl|dt|dd|pre|hr|br)\b[^>]*>/gi, "\n")
    .replace(/<\/?(?:td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, ""));
  const linhas = t.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!manterQuebrasDoArquivo) return linhas;
  // páginas sem marcas de parágrafo: o "Art." pode ter ficado sozinho numa linha; junta com a seguinte
  const out: string[] = [];
  for (let i = 0; i < linhas.length; i++) out.push(/^art\.?$/i.test(linhas[i]) && linhas[i + 1] ? `${linhas[i]} ${linhas[++i]}` : linhas[i]);
  return out;
}
export function htmlParaLinhas(html: string): string[] {
  const l = limparHtml(html, false);
  return l.length >= 20 ? l : limparHtml(html, true);      // página sem marcas de parágrafo: usa as quebras do próprio arquivo
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
  return { texto, revogado: /\(\s*Revogad[oa]/i.test(partes[0]) && partes.length <= 2 };
}

const cache = new Map<string, { em: number; linhas: string[]; url?: string }>();
const negativos = new Map<string, number>();      // lei que não achei: não fica tentando de novo por 30 min
const VALIDADE_MS = 12 * 3600_000, NEGATIVO_MS = 30 * 60_000;
const baseUrl = (u: string) => u.replace("https://www.planalto.gov.br/", process.env.PLANALTO_BASE || "https://www.planalto.gov.br/");

/** Bytes da página -> texto. Algumas páginas do Planalto estão gravadas em UTF-16 (um byte zero entre as letras); lidas como Windows-1252 viravam "\\0A\\0r\\0t". */
export function decodificarPagina(buf: ArrayBuffer | Uint8Array, contentType = ""): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const trocar = (x: Uint8Array) => { const o = new Uint8Array(x.length - (x.length % 2)); for (let i = 0; i < o.length; i += 2) { o[i] = x[i + 1]; o[i + 1] = x[i]; } return o; };
  const le = (x: Uint8Array) => new TextDecoder("utf-16le").decode(x);
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return le(b.subarray(2));
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return le(trocar(b.subarray(2)));
  const amostra = b.subarray(0, Math.min(b.length, 600)); let pares = 0, impares = 0;
  for (let i = 0; i < amostra.length; i++) if (amostra[i] === 0) (i % 2 === 0 ? pares++ : impares++);
  if (amostra.length >= 20 && (pares + impares) / amostra.length > 0.25) return impares > pares ? le(b) : le(trocar(b));      // zeros nas posições ímpares = UTF-16 little-endian; nas pares = big-endian
  const cs = /charset=([\w-]+)/i.exec(contentType)?.[1] || (/<meta[^>]+charset=["']?([\w-]+)/i.exec(Buffer.from(b.subarray(0, 2000)).toString("latin1"))?.[1]) || "windows-1252";
  try { return new TextDecoder(cs).decode(b); } catch { return new TextDecoder("windows-1252").decode(b); }
}

const motivoFalha = new Map<string, string>();      // url -> por que não consegui (para o teste manual)
async function baixarLinhas(url: string, timeoutMs: number): Promise<string[] | null> {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(baseUrl(url), { signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; AssessorJudicial/1.0)", "Accept": "text/html" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const buf = await r.arrayBuffer();
    const html = decodificarPagina(buf, r.headers.get("content-type") || "");
    const linhas = htmlParaLinhas(html);
    if (linhas.length < 20) { motivoFalha.set(url, `página com poucas linhas de texto (${linhas.length}; ${buf.byteLength} bytes)`); return null; }
    motivoFalha.delete(url); return linhas;
  } catch (e: any) { motivoFalha.set(url, e?.name === "AbortError" ? "tempo esgotado" : String(e?.message || e).slice(0, 120)); return null; }
  finally { clearTimeout(to); }
}
const guardar = (id: string, linhas: string[], url?: string) => { if (cache.size >= 40) cache.delete(cache.keys().next().value as string); cache.set(id, { em: Date.now(), linhas, url }); };

async function linhasDoDiploma(d: Diploma, timeoutMs: number): Promise<string[] | null> {
  const c = cache.get(d.id);
  if (c && Date.now() - c.em < VALIDADE_MS) return c.linhas;
  if (negativos.has(d.id) && Date.now() - (negativos.get(d.id) as number) < NEGATIVO_MS) return null;
  if (!d.ref) {
    const linhas = await baixarLinhas(d.url, timeoutMs);
    if (!linhas) { console.warn(`[Legislação] ${d.id}: não consegui consultar o Planalto.`); return null; }
    guardar(d.id, linhas, d.url); return linhas;
  }
  // lei qualquer: tenta os endereços prováveis, 4 de cada vez, dentro do orçamento de tempo, e só aceita a página cujo cabeçalho é mesmo a lei pedida
  const cand = candidatosDoAto(d.ref), cab = cabecalhoDoAto(d.ref), limite = Date.now() + Math.max(timeoutMs, 6000);
  for (let i = 0; i < cand.length && Date.now() < limite; i += 4) {
    const lote = await Promise.all(cand.slice(i, i + 4).map(async (u) => { const l = await baixarLinhas(u, 5000); return l && cab.test(l.slice(0, 60).join(" ")) ? { l, u } : null; }));
    const ok = lote.find(Boolean);
    if (ok) { guardar(d.id, ok.l, ok.u); console.log(`[Legislação] ${d.nome}: localizada em ${ok.u}`); return ok.l; }
  }
  negativos.set(d.id, Date.now()); console.warn(`[Legislação] ${d.nome}: não localizei no Planalto (${cand.length} endereços tentados).`); return null;
}

export interface ResultadoLegislacao { bloco: string; consultados: number; naoAchados: string[]; falhas: string[]; locais: string[]; conferidos: string[] }
/** Consulta os artigos citados e monta o bloco para o prompt. Nunca lança erro. */
export async function consultarLegislacao(textos: string[], opts: { maxArtigos?: number; timeoutMs?: number } = {}): Promise<ResultadoLegislacao> {
  const vazio: ResultadoLegislacao = { bloco: "", consultados: 0, naoAchados: [], falhas: [], locais: [], conferidos: [] };
  try {
    const citacoes: Citacao[] = [], locais: string[] = [];
    for (const t of textos) {
      const ex = extrairTudo(t, opts.maxArtigos ?? 10);
      for (const c of ex.citacoes) if (!citacoes.some((x) => x.diploma.id === c.diploma.id && x.artigo === c.artigo)) citacoes.push(c);
      for (const l of ex.locais) if (!locais.includes(l)) locais.push(l);
    }
    // no máximo 4 leis fora da lista conhecida por análise (cada uma exige procurar o endereço no Planalto)
    const novas = new Set<string>(); const lista = citacoes.filter((c) => { if (!c.diploma.ref) return true; if (novas.has(c.diploma.id)) return true; if (novas.size >= 4) return false; novas.add(c.diploma.id); return true; }).slice(0, opts.maxArtigos ?? 10);
    const localTxt = locais.slice(0, 6);
    if (!lista.length && !localTxt.length) return vazio;
    const diplomas = [...new Set(lista.map((c) => c.diploma))];
    const baixados = new Map<string, string[] | null>();
    await Promise.all(diplomas.map(async (d) => baixados.set(d.id, await linhasDoDiploma(d, opts.timeoutMs ?? 8000))));
    const linhas: string[] = [], naoAchados: string[] = [], falhas: string[] = [], conferidos: string[] = [];
    const curto = (n: string) => n.replace(/\s*\(.*\)\s*$/, "");
    for (const c of lista) {
      const base = baixados.get(c.diploma.id);
      if (!base) { if (!falhas.includes(c.diploma.nome)) falhas.push(c.diploma.nome); continue; }
      const tr = trechoDoArtigo(base, c.artigo);
      if (!tr) { naoAchados.push(`${c.diploma.nome}, art. ${c.artigo}`); continue; }
      conferidos.push(`${curto(c.diploma.nome)}, art. ${c.artigo}${tr.revogado ? " (REVOGADO)" : ""}`);
      linhas.push(`• ${c.diploma.nome} — ${tr.revogado ? "ARTIGO REVOGADO (não fundamentar nele) — " : ""}\n${tr.texto}`);
    }
    const hoje = new Date().toLocaleDateString("pt-BR");
    let bloco = "";
    if (linhas.length || naoAchados.length) {
      bloco += `\n\n[LEGISLAÇÃO OFICIAL CONSULTADA NO PLANALTO (planalto.gov.br) em ${hoje}]:\n${linhas.join("\n\n")}` +
        (naoAchados.length ? `\n\nNão localizei no texto oficial: ${naoAchados.join("; ")}. Confira se o número do artigo e o diploma citados estão corretos.` : "") +
        (falhas.length ? `\n\nNão consegui consultar agora: ${falhas.join("; ")}. Cite estes diplomas com cautela e só o que tiver certeza.` : "") +
        `\n\nDIRETRIZ: ao citar esses dispositivos, confira o número, o caput e os parágrafos com o texto oficial acima; se a citação do rascunho divergir, corrija. O texto oficial traz as marcações de alteração — "(Revogado ...)", "(Redação dada pela Lei ...)", "(Incluído pela Lei ...)": respeite-as, não cite como vigente o que estiver revogado e, quando a redação tiver sido dada ou o dispositivo incluído por lei posterior aos fatos do processo, aplique a redação vigente à época dos fatos e registre a alteração. Para dispositivos que não constam acima, cite com cautela e apenas o que tiver certeza.\n`;
    }
    if (localTxt.length) bloco += `\n\n[LEIS MUNICIPAIS/ESTADUAIS CITADAS — TEXTO NÃO CONSULTADO]: ${localTxt.join("; ")}.\nDIRETRIZ: o sistema não consulta leis locais. Aplique apenas o conteúdo que os autos ou a base de conhecimento do gabinete reproduzirem; não invente o teor, o número de artigo nem a vigência dessas leis e registre na fundamentação, quando necessário, que o texto da lei local não foi conferido.\n`;
    if (!bloco) return { ...vazio, falhas };
    return { bloco, consultados: linhas.length, naoAchados, falhas, locais: localTxt, conferidos };
  } catch (e) { console.warn("[Legislação] falha inesperada na consulta; segue sem o bloco:", e); return vazio; }
}

/** Teste manual: dado um texto como "art. 6º da Lei 8.987/1995", mostra o que foi reconhecido e onde a lei foi localizada. */
export async function testarLegislacao(texto: string): Promise<any> {
  const ex = extrairTudo(texto, 6);
  const itens = await Promise.all(ex.citacoes.map(async (c) => { negativos.delete(c.diploma.id); cache.delete(c.diploma.id); const l = await linhasDoDiploma(c.diploma, 15000); const tr = l ? trechoDoArtigo(l, c.artigo) : null; return { diploma: c.diploma.nome, artigo: c.artigo, diplomaLocalizado: !!l, motivoDaFalha: l ? undefined : (motivoFalha.get(c.diploma.url) || (c.diploma.ref ? "não achei a lei nos endereços tentados" : "sem resposta")), url: cache.get(c.diploma.id)?.url || null, linhasDaPagina: l ? l.length : 0, artigoLocalizado: !!tr, revogado: tr?.revogado || false, inicio: tr ? tr.texto.slice(0, 160) : null,
    // quando o artigo não é achado: como a página escreve os artigos (para ajustar a leitura)
    amostraDoMeioDaPagina: !tr && l ? l.slice(Math.floor(l.length / 2), Math.floor(l.length / 2) + 6).map((x) => x.slice(0, 100)) : undefined, amostraDeArtigos: !tr && l ? l.filter((x) => /\bArt\.?\s*\d/i.test(x)).slice(0, 8).map((x) => x.slice(0, 80)) : undefined, linhasComOArtigo: !tr && l ? l.filter((x) => new RegExp(`\\b${c.artigo.replace(/\D.*$/, "")}\\b`).test(x) && /art/i.test(x)).slice(0, 5).map((x) => x.slice(0, 100)) : undefined }; }));
  return { reconhecidos: itens, locaisNaoConsultadas: ex.locais };
}

/** Diagnóstico: quais diplomas o servidor consegue consultar agora (sem devolver conteúdo). */
export async function diagnosticoLegislacao(): Promise<Array<{ id: string; ok: boolean }>> {
  return Promise.all(DIPLOMAS.map(async (d) => ({ id: d.id, ok: !!(await linhasDoDiploma(d, 10000)) })));
}
