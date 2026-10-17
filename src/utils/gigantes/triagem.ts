import type { PaginaGig } from "./db";

// Triagem SEM IA, só por palavras-chave do cabeçalho da página: nada é descartado do índice, apenas decide
// o quanto de cada página segue para a IA (inteira, limitada ou só o cabeçalho). Páginas repetidas vão uma vez só.
const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

const ESSENCIAL = /PETICAO INICIAL|INICIAL|CONTESTACAO|REPLICA|IMPUGNACAO|SENTENCA|ACORDAO|DECISAO|DESPACHO|ATA DE AUDIENCIA|TERMO DE AUDIENCIA|LAUDO|PARECER|EMBARGOS|APELACAO|RECURSO|AGRAVO|MANDADO|CITACAO|INTIMACAO|CUMPRIMENTO DE SENTENCA|PLANILHA DE (CALCULO|DEBITO)|CALCULO|ALEGACOES FINAIS|MEMORIAIS|RELATORIO MEDICO|PERICIA/;
const DISPENSAVEL = /^\s*(PROCURACAO|SUBSTABELECIMENTO|DECLARACAO DE (HIPOSSUFICIENCIA|POBREZA|RESIDENCIA)|COMPROVANTE DE (RESIDENCIA|PAGAMENTO|ENDERECO)|CARTEIRA DE IDENTIDADE|REGISTRO GERAL|CPF|CNH|TITULO DE ELEITOR|CERTIDAO DE (NASCIMENTO|CASAMENTO|OBITO)|GUIA DE (CUSTAS|RECOLHIMENTO)|AVISO DE RECEBIMENTO|ATO ORDINATORIO|CERTIDAO DE (JUNTADA|DECURSO)|TERMO DE JUNTADA|FATURA|EXTRATO)/;

export function classificarPagina(texto: string): { tipo: PaginaGig["tipo"]; rotulo?: string } {
  const cab = sem(texto.replace(/^\[P[aá]gina[^\]]*\]\s*/i, "").slice(0, 600));
  const dm = cab.match(DISPENSAVEL);
  if (dm) return { tipo: "dispensavel", rotulo: dm[1].toLowerCase() };
  if (ESSENCIAL.test(cab)) return { tipo: "essencial", rotulo: (cab.match(ESSENCIAL)?.[0] || "").toLowerCase() };
  if (texto.replace(/\s+/g, "").length < 60) return { tipo: "dispensavel", rotulo: "página quase sem texto" };
  return { tipo: "relevante" };
}

const normalizar = (t: string) => t.toLowerCase().replace(/\[p[aá]gina[^\]]*\]/g, "").replace(/[^a-z0-9à-ú]+/g, " ").trim();
function hash(t: string): string { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return String(h) + ":" + t.length; }

export function classificarTodas(paginas: { texto: string }[]): { tipo: PaginaGig["tipo"]; rotuloTipo?: string }[] {
  const vistas = new Set<string>();
  return paginas.map((p) => {
    const norm = normalizar(p.texto);
    if (norm.length > 250) {
      const h = hash(norm);
      if (vistas.has(h)) return { tipo: "repetida" as const, rotuloTipo: "página idêntica a outra já lida" };
      vistas.add(h);
    }
    const c = classificarPagina(p.texto);
    return { tipo: c.tipo, rotuloTipo: c.rotulo };
  });
}

// quanto de cada página segue para a IA
export const LIMITE_RELEVANTE = 9000;
export const LIMITE_ESSENCIAL = 20000;
export const LIMITE_DISPENSAVEL = 500;
export function textoParaIa(p: PaginaGig): string {
  if (p.tipo === "repetida") return "";
  const lim = p.tipo === "essencial" ? LIMITE_ESSENCIAL : p.tipo === "relevante" ? LIMITE_RELEVANTE : LIMITE_DISPENSAVEL;
  const t = p.texto.length > lim ? p.texto.slice(0, lim) + " […página abreviada pelo sistema]" : p.texto;
  return t;
}
