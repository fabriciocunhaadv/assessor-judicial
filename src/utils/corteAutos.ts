// Descreve EXATAMENTE o que fica de fora quando os autos passam do limite de leitura da análise normal.
// Usado pelo servidor (corte real) e pelo app (estimativa mostrada antes de o usuário decidir).
export interface CorteArquivo {
  arquivo: string;
  de: number;            // primeira página NÃO lida
  ate: number;           // última página NÃO lida
  total: number;         // total de páginas do arquivo
  parcial?: number;      // página em que o corte caiu no meio (lida só em parte)
  inteiro?: boolean;     // o arquivo inteiro ficou de fora
}
export interface CorteInfo { cortou: boolean; lidoPct: number; cortes: CorteArquivo[] }

const CABECALHO = /\[=== AUTOS DO PROCESSO: ([^\]]*?)(?: \([^)]*\))? ===\]/g;
const PAGINA = /\[Página (\d+) de (\d+)\]/g;

/** Monta o texto no mesmo formato do servidor (um cabeçalho por arquivo), para estimar o corte no app. */
export function juntarComoServidor(arquivos: { nome: string; texto: string; paginas?: number }[]): string {
  return arquivos.map((a) => `\n\n[=== AUTOS DO PROCESSO: ${a.nome} (${a.paginas || "várias"} páginas) ===]\n${a.texto}\n`).join("");
}

export function descreverCorte(texto: string, limite: number, nomePadrao = "texto dos autos"): CorteInfo {
  if (!texto || texto.length <= limite) return { cortou: false, lidoPct: 100, cortes: [] };
  const marcas: { nome: string; ini: number }[] = [];
  let m: RegExpExecArray | null;
  CABECALHO.lastIndex = 0;
  while ((m = CABECALHO.exec(texto))) marcas.push({ nome: m[1].trim(), ini: m.index });
  const segs = marcas.length
    ? marcas.map((mk, i) => ({ nome: mk.nome, ini: mk.ini, fim: i + 1 < marcas.length ? marcas[i + 1].ini : texto.length }))
    : [{ nome: nomePadrao, ini: 0, fim: texto.length }];
  const cortes: CorteArquivo[] = [];
  for (const s of segs) {
    if (s.fim <= limite) continue;                       // arquivo lido por inteiro
    const corpo = texto.slice(s.ini, s.fim);
    const pags: { n: number; total: number; pos: number }[] = [];
    PAGINA.lastIndex = 0;
    while ((m = PAGINA.exec(corpo))) pags.push({ n: Number(m[1]), total: Number(m[2]), pos: s.ini + m.index });
    const total = pags.length ? Math.max(...pags.map((p) => p.total)) : 0;
    if (s.ini >= limite) { cortes.push({ arquivo: s.nome, de: 1, ate: total || 0, total, inteiro: true }); continue; }
    const perdidas = pags.filter((p) => p.pos >= limite);
    const lidas = pags.filter((p) => p.pos < limite);
    if (perdidas.length) cortes.push({ arquivo: s.nome, de: perdidas[0].n, ate: perdidas[perdidas.length - 1].n, total, parcial: lidas.length ? lidas[lidas.length - 1].n : undefined });
    else cortes.push({ arquivo: s.nome, de: 0, ate: 0, total });                // sem marcadores de página: só se sabe que o final foi cortado
  }
  return { cortou: cortes.length > 0, lidoPct: Math.max(1, Math.min(99, Math.round((limite / texto.length) * 100))), cortes };
}

export function textoDoCorte(c: CorteArquivo): string {
  if (c.inteiro) return `${c.arquivo}: o arquivo inteiro${c.total ? ` (${c.total} págs.)` : ""}`;
  if (!c.de) return `${c.arquivo}: o final do arquivo`;
  return `${c.arquivo}: págs. ${c.de} a ${c.ate}${c.total ? ` (de ${c.total})` : ""}${c.parcial ? `; a pág. ${c.parcial} foi lida só em parte` : ""}`;
}
