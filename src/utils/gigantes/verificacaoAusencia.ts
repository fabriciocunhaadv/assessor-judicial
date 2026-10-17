import { procurarTermos, semAcento } from "./indice";

// A minuta de um processo gigante é redigida a partir de um dossiê (resumo). Antes de o usuário assinar, confere se uma afirmação do tipo
// "não há prova de X" tem X em alguma página do ÍNDICE COMPLETO dos autos (inclusive páginas que não entraram no dossiê).
const NEGATIVA = /(n[ãa]o\s+(h[áa]|existe[m]?|existiu|consta[m]?|foi[ram]*\s+(juntad|apresentad|comprovad|produzid|anexad|trazid)\w*|restou\s+comprovad\w*|comprovou|comprovaram|trouxe|trouxeram|juntou|juntaram|apresentou|anexou|demonstrou)|aus[êe]ncia\s+de|inexist[êe]ncia\s+de|sem\s+(qualquer\s+)?(prova|comprova\w*|document\w*)|falta\s+de\s+(prova|document\w*|comprova\w*)|n[ãa]o\s+se\s+desincumbiu)/i;

const VOCABULARIO = [
  "laudo pericial", "laudo", "pericia", "contrato social", "contrato", "extrato", "recibo", "comprovante de pagamento", "comprovante", "nota fiscal", "fatura", "boleto",
  "procuracao", "certidao", "prontuario", "receita medica", "relatorio medico", "exame", "testemunha", "gravacao", "fotografia", "fotos", "protocolo", "e-mail", "conversa",
  "notificacao", "carta", "escritura", "matricula", "alvara", "planilha de calculo", "calculo", "declaracao", "termo de acordo", "ordem de servico", "orcamento", "boletim de ocorrencia",
  "comprovante de residencia", "carteira de trabalho", "holerite", "contracheque", "cartao", "emprestimo", "financiamento", "seguro", "apolice",
];

export interface AfirmacaoNegativa { trecho: string; termos: string[] }
export interface ConferenciaAusencia { trecho: string; termo: string; total: number; paginas: { arquivo: number; pagina: number; trecho: string }[] }

export function extrairAfirmacoesNegativas(texto: string, maximo = 14): AfirmacaoNegativa[] {
  const frases = String(texto || "").split(/(?<=[.!?;])\s+/);
  const out: AfirmacaoNegativa[] = [];
  for (const f of frases) {
    if (f.length < 25 || !NEGATIVA.test(f)) continue;
    const n = semAcento(f);
    const termos = VOCABULARIO.filter((t) => n.includes(t)).sort((a, b) => b.length - a.length);
    const unicos = termos.filter((t, i) => !termos.slice(0, i).some((m) => m.includes(t)));       // "laudo pericial" já cobre "laudo"
    if (unicos.length) out.push({ trecho: f.trim().slice(0, 280), termos: unicos.slice(0, 3) });
    if (out.length >= maximo) break;
  }
  return out;
}

export async function conferirAusencias(jobId: string, minuta: { relatorio?: string; fundamentacao?: string; dispositivo?: string }): Promise<ConferenciaAusencia[]> {
  const afirmacoes = extrairAfirmacoesNegativas([minuta.relatorio, minuta.fundamentacao, minuta.dispositivo].filter(Boolean).join("\n"));
  if (afirmacoes.length === 0) return [];
  const termos = Array.from(new Set(afirmacoes.flatMap((a) => a.termos)));
  const achados = await procurarTermos(jobId, termos, 6);
  const out: ConferenciaAusencia[] = [];
  for (const a of afirmacoes) {
    for (const t of a.termos) {
      const r = achados[t];
      if (r && r.total > 0) { out.push({ trecho: a.trecho, termo: t, total: r.total, paginas: r.achados }); break; }
    }
  }
  return out.slice(0, 10);
}
