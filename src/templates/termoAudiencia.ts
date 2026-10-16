// Termo de Audiência (aba 5 da Mesa): monta o texto no layout do termo do TJGO e converte para os blocos usados pelo visualizador.
import type { Bloco, ContextoAta } from "./ataPreliminarModelo";

const apenasComarca = (c?: string) => String(c || "").replace(/^\s*comarca\s+de\s+/i, "").replace(/\s*[\/-]\s*GO\s*$/i, "").trim();
const dataBr = (iso?: string) => { const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || ""); };
const horaBr = (h?: string) => { const m = String(h || "").match(/^(\d{1,2})[:hH](\d{2})/); return m ? `${m[1].padStart(2, "0")}h${m[2]}min` : String(h || ""); };
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]);
const tratar = (n?: string) => String(n || "").trim();

export const SECOES_TERMO = ["PRESENTES", "OCORRÊNCIAS", "DELIBERAÇÕES", "ENCERRAMENTO DA AUDIÊNCIA"];

// Texto-base do termo, sem nomes de exemplo: o que não consta fica entre [colchetes] para preencher.
export function montarTermoTexto(h: any, ctx: ContextoAta = {}): string {
  const crim = h.hearingArea === "criminal" || /penal|crime/i.test(String(h.actionClass || ""));
  const comarca = apenasComarca(ctx.comarca || h.comarcaName);
  const vara = tratar(ctx.vara || h.courtName) || "[vara / juízo]";
  const juiz = tratar(ctx.juiz);
  const juizN = juiz ? (/^dr/i.test(juiz) ? juiz : `Dr. ${juiz}`) : "[nome do Juiz de Direito]";
  const data = ctx.data || h.scheduledDate;
  const hora = ctx.hora || h.scheduledTime;
  const dataTxt = data ? `${dataBr(data)}${hora ? ", às " + horaBr(hora) : ""}` : "[data e hora]";
  const modal = (ctx.modalidade || h.hearingModality) === "presencial" ? "presencial" : (ctx.modalidade || h.hearingModality) ? "telepresencial, por meio do aplicativo Zoom Meetings, nos termos da Resolução CNJ n. 354/2020" : "[presencial / telepresencial]";
  const L: string[] = [];
  L.push("PODER JUDICIÁRIO", comarca ? `Comarca de ${comarca}` : "Comarca de [comarca]", vara, "Sala de Audiências", "", "TERMO DE AUDIÊNCIA", "");
  L.push(`Data: ${dataTxt}`);
  L.push(`Número do Processo: ${tratar(h.processNumber) || "[número do processo]"}`);
  L.push(`Natureza: ${tratar(h.actionClass) || tratar(h.hearingTitle) || "[natureza]"}`);
  const autor = tratar(h.author) || "[parte autora]";
  const reu = tratar(h.defendant) || "[parte ré]";
  const advA = tratar(h.plaintiffLawyerName), advR = tratar(h.defendantLawyerName);
  if (crim) {
    L.push(`Promotor: ${tratar(h.prosecutorName) || "[promotor(a) de justiça]"}`, `Acusado: ${reu}`, `Advogado: ${advR || "[advogado(a)]"}`);
    if (tratar(h.victimsNames)) L.push(`Vítima: ${tratar(h.victimsNames)}`);
  } else {
    L.push(`Requerente: ${autor}`, `Advogado: ${advA || "[advogado(a) do requerente]"}`, `Requerido: ${reu}`, `Advogado: ${advR || "[advogado(a) do requerido]"}`);
  }
  if (tratar(h.studentOuvinte)) L.push(`Estudante: ${tratar(h.studentOuvinte)}`);
  L.push("", "PRESENTES");
  const pres: string[] = [`[Presente presencialmente na sala de audiências] o Juiz de Direito, ${juizN}.`];
  if (crim) {
    pres.push("[Presente/Ausente] o representante do Ministério Público.", `[Presente/Ausente] o acusado ${reu}, [acompanhado(a) de seu(sua) advogado(a)${advR ? ", " + advR : ""}].`);
    if (tratar(h.victimsNames)) pres.push(`[Presente/Ausente] a(s) vítima(s) ${tratar(h.victimsNames)}.`);
  } else {
    pres.push(`[Presente/Ausente] o(a) requerente ${autor}, [acompanhado(a) de seu(sua) advogado(a)${advA ? ", " + advA : ""}].`);
    const prep = tratar(h.defendantPrepostoName);
    pres.push(`[Presente/Ausente] o(a) requerido(a) ${reu}${prep ? `, na pessoa de seu preposto ${prep}` : ""}, [acompanhado(a) de seu(sua) advogado(a)${advR ? ", " + advR : ""}].`);
  }
  const tes = (h.witnesses || []).filter((w: any) => w?.name);
  if (tes.length) pres.push(`Testemunhas: ${lista(tes.map((w: any) => `${w.name} [${w.status === "dispensado" ? "dispensada" : "presente/ausente"}]`))}.`);
  L.push(pres.join(" "), "", "OCORRÊNCIAS");
  L.push(`Declarada aberta a audiência, na forma da lei, o ato foi realizado de modo ${modal}. Na sequência, o Magistrado advertiu as partes acerca da vedação à divulgação não autorizada dos registros audiovisuais a pessoas estranhas ao processo.`);
  L.push(tratar(h.hearingOccurrences) || "[Registrar as ocorrências: oitivas, requerimentos e decisões incidentais.]");
  const depo = tratar(h.witnessesSummary);
  if (depo) L.push(depo);
  L.push("", "DELIBERAÇÕES", "Pelo MM. Juiz de Direito foi proferida a seguinte D E C I S Ã O:");
  const sent = tratar(h.instantSentenceDraft), del = tratar(h.deliberationDraft);
  if (sent) L.push(sent); else if (del) L.push(del);
  else {
    const prazo = tratar(h.alegacoesFinaisPrazo) || (crim ? "05 (cinco) dias" : "10 (dez) dias");
    L.push(`[Texto da decisão. Se for o caso: encerrada a instrução, abra-se vista às partes para alegações finais / memoriais, no prazo sucessivo de ${prazo}. Após, conclusos para sentença.]`);
  }
  L.push("", "ENCERRAMENTO DA AUDIÊNCIA");
  const assessor = tratar(ctx.assessor);
  L.push(`[Pelo MM. Juiz foram dispensadas as assinaturas, por se tratar de audiência realizada por videoconferência.] Facultam-se às partes indicar eventual desconformidade ou irregularidade no conteúdo do presente termo de audiência, no prazo de 2 (dois) dias, contados da disponibilização deste no sistema PJD/TJGO. Encerrado o ato. Eu, ${assessor || "[nome do assessor]"}, Assessor de Juiz de Direito, o digitei.`);
  L.push("", juiz ? juiz.replace(/^dr\.?a?\s+/i, "").toUpperCase() : "[NOME DO JUIZ DE DIREITO]", "Juiz de Direito", "(assinado digitalmente)");
  return L.join("\n");
}

// Converte o texto do termo (gerado pela IA, pelo esqueleto ou editado à mão) em blocos de layout.
export function termoTextoParaBlocos(texto: string, ctx: ContextoAta = {}): Bloco[] {
  const linhas = String(texto || "").replace(/\r/g, "").split("\n").map((l) => l.trim());
  const b: Bloco[] = [];
  const ehTitulo = (l: string) => /^(TERMO|ATA)\s+DE\s+AUDI[ÊE]NCIA/i.test(l);
  let i = 0;
  const idxTit = linhas.findIndex(ehTitulo);
  const cab: string[] = [];
  if (idxTit > 0) { for (; i < idxTit; i++) if (linhas[i]) cab.push(linhas[i]); }
  if (!cab.length) cab.push("PODER JUDICIÁRIO", ctx.comarca ? `Comarca de ${apenasComarca(ctx.comarca)}` : "Comarca de [comarca]", ctx.vara || "[vara / juízo]", "Sala de Audiências");
  b.push({ tipo: "cabecalho", linhas: cab.slice(0, 5) });
  b.push({ tipo: "titulo", texto: idxTit >= 0 ? linhas[idxTit].toUpperCase() : "TERMO DE AUDIÊNCIA" });
  i = idxTit >= 0 ? idxTit + 1 : 0;
  // assinatura: bloco final a partir da linha anterior a "Juiz de Direito"
  let fim = linhas.length;
  while (fim > 0 && !linhas[fim - 1]) fim--;
  let ini = -1;
  for (let k = fim - 1; k >= Math.max(i, fim - 6); k--) if (/^Ju[ií]z(a)?\s+de\s+Direito$/i.test(linhas[k])) { ini = k > i && linhas[k - 1] ? k - 1 : k; break; }
  const assin = ini >= 0 ? linhas.slice(ini, fim).filter(Boolean) : [];
  const corpoFim = ini >= 0 ? ini : fim;
  let emMeta = true;
  for (; i < corpoFim; i++) {
    const l = linhas[i];
    if (!l) continue;
    if (SECOES_TERMO.includes(l.toUpperCase().replace(/:$/, ""))) { emMeta = false; b.push({ tipo: "secao", texto: l.toUpperCase().replace(/:$/, "") }); continue; }
    const m = emMeta ? l.match(/^([A-Za-zÀ-ú][^:]{1,45}):\s*(.*)$/) : null;
    if (m) { b.push({ tipo: "meta", rotulo: m[1] + ":", valor: m[2] }); continue; }
    emMeta = false;
    b.push({ tipo: "paragrafo", texto: l, destaque: "corpo" });
  }
  if (assin.length) b.push({ tipo: "assinatura", linhas: assin });
  return b;
}
