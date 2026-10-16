// MODELO DA ATA PRELIMINAR (layout igual ao "Termo de Audiência" do gabinete: brasão, cabeçalho em Courier, título, linhas "rótulo: valor",
// seções centralizadas e rodapé com número da página e nome do juiz). Para trocar o modelo, edite SOMENTE este arquivo:
//  - MODELO_ATA: textos fixos, nomes e ordem das seções;
//  - montarBlocos(): como cada seção é escrita (colunas das tabelas, frases, campos a completar entre [colchetes]);
//  - CSS_ATA: aparência (fontes, tamanhos, cores).
// O visualizador, a impressão/PDF, o Word e o "copiar" usam os mesmos blocos, então mudam juntos.
import type { AtaPreliminarDados } from "../types";
import { BRASAO_GOIAS_SRC } from "./brasaoGoias";

export type SecaoAta = "resumo" | "testemunhas" | "citacoes" | "pedidos" | "atencao" | "controversia";
export interface ModeloAta { id: string; nome: string; orgao: string; salaTexto: string; titulo: string; aviso: string; secoes: { id: SecaoAta; titulo: string }[] }

export const MODELO_ATA: ModeloAta = {
  id: "termo-goias-v1",
  nome: "Ata preliminar — modelo Termo de Audiência",
  orgao: "PODER JUDICIÁRIO",
  salaTexto: "Sala de Audiências",
  titulo: "ATA PRELIMINAR DE AUDIÊNCIA",
  aviso: "Documento de apoio ao magistrado, elaborado a partir dos autos. Os campos entre [colchetes] são para completar durante o ato; os itens “conferir” devem ser verificados nos autos.",
  secoes: [
    { id: "resumo", titulo: "RESUMO DO PROCESSO" },
    { id: "testemunhas", titulo: "TESTEMUNHAS INDICADAS" },
    { id: "citacoes", titulo: "CITAÇÕES E INTIMAÇÕES" },
    { id: "pedidos", titulo: "PEDIDOS RELACIONADOS À AUDIÊNCIA" },
    { id: "atencao", titulo: "PONTOS DE ATENÇÃO" },
    { id: "controversia", titulo: "PONTOS CONTROVERTIDOS E O QUE FALTA PROVAR" },
  ],
};

// Dados do gabinete e da audiência que não vêm dos autos
export interface ContextoAta { juiz?: string; assessor?: string; data?: string; hora?: string; modalidade?: "presencial" | "telepresencial" | "hibrida"; vara?: string; comarca?: string }

export type Bloco =
  | { tipo: "cabecalho"; linhas: string[] }
  | { tipo: "titulo"; texto: string }
  | { tipo: "meta"; rotulo: string; valor: string }
  | { tipo: "secao"; texto: string }
  | { tipo: "paragrafo"; texto: string; destaque?: "aviso" | "conferir" | "vazio" | "corpo" }
  | { tipo: "lista"; itens: { texto: string; conferir?: boolean; nivel?: string }[] }
  | { tipo: "tabela"; colunas: string[]; linhas: { celulas: string[]; conferir?: boolean }[] }
  | { tipo: "assinatura"; linhas: string[] };

const NC = "não consta nos autos";
const v = (x?: string) => (x && String(x).trim() ? String(x).trim() : NC);
const loc = (x?: string) => (x && String(x).trim() ? String(x).trim() : "localização não identificada");
const RESULT: Record<string, string> = { positiva: "Positiva", negativa: "Negativa", edital: "Por edital", hora_certa: "Hora certa", aguardando: "Aguardando cumprimento", nao_localizada: "Não localizada nos autos" };
const SIT: Record<string, string> = { intimada: "Intimada", nao_intimada: "Não intimada", negativa: "Intimação negativa", aguardando: "Aguardando", nao_localizada: "Não localizada nos autos" };
const INDICADA: Record<string, string> = { autor: "Autor", reu: "Réu", outro: "Outro" };
const ROTULO_POLO: Record<string, string> = { ativo: "Requerente", passivo: "Requerido", terceiro: "Terceiro Interessado", ministerio_publico: "Ministério Público" };

const apenasComarca = (c?: string) => String(c || "").replace(/^\s*comarca\s+de\s+/i, "").replace(/\s*[\/-]\s*GO\s*$/i, "").trim();
const dataBr = (iso?: string) => { const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || ""); };
const horaBr = (h?: string) => { const m = String(h || "").match(/^(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, "0")}h${m[2]}min` : String(h || ""); };
const dr = (nome?: string) => { const n = String(nome || "").trim(); return !n ? "" : /^(dr|dra|des)\.?\s/i.test(n) ? n : n; };
const advTxt = (p: { advogados?: { nome?: string; oab?: string }[] }) => (p.advogados || []).filter((a) => a?.nome).map((a) => `${a.nome}${a.oab ? ` – OAB/${/^[A-Z]{2}\b/.test(String(a.oab).trim()) ? String(a.oab).trim().replace(/^([A-Z]{2})\s*/, "$1 n. ") : "GO n. " + a.oab}` : ""}`).join(" e ");
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]);

export function montarBlocos(d: AtaPreliminarDados, m: ModeloAta = MODELO_ATA, ctx: ContextoAta = {}): Bloco[] {
  const b: Bloco[] = [];
  const c = d.cabecalho || {};
  const comarca = apenasComarca(ctx.comarca || c.comarca);
  const vara = String(ctx.vara || c.vara || "").trim();
  b.push({ tipo: "cabecalho", linhas: [m.orgao, comarca ? `Comarca de ${comarca}` : "Comarca de [comarca]", vara || "[vara / juízo]", m.salaTexto] });
  b.push({ tipo: "titulo", texto: m.titulo });
  if (d.alertaInjecao && d.alertaInjecao.total > 0) {
    b.push({ tipo: "paragrafo", destaque: "conferir", texto: `ALERTA: possível tentativa de manipular a IA nos autos (${d.alertaInjecao.total} trecho(s)). ` + d.alertaInjecao.achados.slice(0, 5).map((a) => `${[a.movimentacao != null ? `Mov. ${a.movimentacao}` : "", a.arquivo != null ? `Arq. ${a.arquivo}` : "", a.pagina != null ? `Pág. ${a.pagina}` : ""].filter(Boolean).join(", ") || "local não identificado"}: “${a.trecho.slice(0, 160)}”`).join(" | ") });
  }
  // linhas "rótulo: valor" do termo
  const dataTxt = c.dataHoraAudiencia && String(c.dataHoraAudiencia).trim() ? String(c.dataHoraAudiencia).trim() : (ctx.data ? `${dataBr(ctx.data)}${ctx.hora ? ", às " + horaBr(ctx.hora) : ""}` : "[data e hora]");
  b.push({ tipo: "meta", rotulo: "Data:", valor: dataTxt });
  b.push({ tipo: "meta", rotulo: "Número do Processo:", valor: v(c.numeroProcesso) });
  b.push({ tipo: "meta", rotulo: "Natureza:", valor: v(c.assunto || c.classe) });
  if (c.valorCausa && String(c.valorCausa).trim()) b.push({ tipo: "meta", rotulo: "Valor da causa:", valor: String(c.valorCausa).trim() });
  const partes = d.partes || [];
  if (!partes.length) b.push({ tipo: "meta", rotulo: "Partes:", valor: NC });
  for (const p of partes) {
    const rot = ROTULO_POLO[p.polo || ""] || "Parte";
    b.push({ tipo: "meta", rotulo: rot + ":", valor: [v(p.nome), p.qualificacao && p.qualificacao.trim() ? `(${p.qualificacao.trim()})` : ""].filter(Boolean).join(" ") + (p.conferir ? " [conferir]" : "") });
    const adv = advTxt(p);
    if (adv) b.push({ tipo: "meta", rotulo: (p.advogados || []).length > 1 ? "Advogados:" : (p.polo === "ministerio_publico" ? "Promotor:" : "Advogado:"), valor: adv });
  }

  for (const s of m.secoes) {
    b.push({ tipo: "secao", texto: s.titulo });
    if (s.id === "resumo") {
      b.push({ tipo: "paragrafo", texto: v(d.resumo), destaque: "corpo" });
    } else if (s.id === "testemunhas") {
      const l = d.testemunhas || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: "Nenhuma testemunha arrolada nos autos.", destaque: "vazio" });
      else b.push({ tipo: "tabela", colunas: ["Testemunha", "Indicada por", "Onde foi indicada", "Intimação", "Onde consta a intimação"], linhas: l.map((t) => ({ conferir: t.conferir, celulas: [v(t.nome) + (t.qualificacao ? ` — ${t.qualificacao}` : ""), INDICADA[t.indicadaPor || ""] || v(t.indicadaPor), loc(t.localizacao), (SIT[t.situacaoIntimacao || ""] || NC) + (t.dataIntimacao ? ` (${t.dataIntimacao})` : ""), loc(t.localizacaoIntimacao) + (t.conferir ? " [conferir]" : "")] })) });
    } else if (s.id === "citacoes") {
      const l = d.citacoesIntimacoes || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: NC, destaque: "vazio" });
      else b.push({ tipo: "tabela", colunas: ["Destinatário", "Ato", "Resultado", "Data", "Onde consta"], linhas: l.map((x) => ({ conferir: x.conferir, celulas: [v(x.destinatario) + (x.papel ? ` (${x.papel})` : ""), x.ato === "citacao" ? "Citação" : x.ato === "intimacao" ? "Intimação" : v(x.ato), (RESULT[x.resultado || ""] || NC) + (x.observacao ? ` — ${x.observacao}` : ""), v(x.data), loc(x.localizacao) + (x.conferir ? " [conferir]" : "")] })) });
    } else if (s.id === "pedidos") {
      const l = d.pedidosAudiencia || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: "Nenhum pedido relacionado à audiência localizado nos autos.", destaque: "vazio" });
      else b.push({ tipo: "tabela", colunas: ["Pedido", "Requerente", "Resumo", "Decisão", "Onde consta"], linhas: l.map((x) => ({ conferir: x.conferir, celulas: [v(x.tipo), v(x.requerente) + (x.data ? ` (${x.data})` : ""), v(x.resumo), x.decisao && x.decisao.trim() ? x.decisao : "sem decisão localizada", loc(x.localizacao) + (x.conferir ? " [conferir]" : "")] })) });
    } else if (s.id === "atencao") {
      const l = d.pontosAtencao || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: "Nenhum ponto de atenção identificado.", destaque: "vazio" });
      else b.push({ tipo: "lista", itens: l.map((p) => ({ nivel: p.nivel, conferir: p.conferir, texto: `${p.nivel === "alto" ? "[ALTO] " : p.nivel === "medio" ? "[MÉDIO] " : ""}${v(p.texto)} (${loc(p.localizacao)})${p.conferir ? " [conferir: " + (p.motivoConferir || "") + "]" : ""}` })) });
    } else if (s.id === "controversia") {
      const l = d.pontosControvertidos || [];
      if (l.length) b.push({ tipo: "lista", itens: l.map((x) => ({ texto: x })) }); else b.push({ tipo: "paragrafo", texto: NC, destaque: "vazio" });
      b.push({ tipo: "paragrafo", texto: "O que falta provar: " + v(d.faltaProvar), destaque: "corpo" });
    }
  }

  // ===== minuta do termo, para completar durante o ato =====
  const juiz = String(c.juizDesignouAudiencia || "").trim().replace(/^(excelent[ií]ssimo|exmo\.?)\s+/i, "") || String(ctx.juiz || "").trim();
  const juizN = juiz ? (/^dr/i.test(juiz) ? juiz : `Dr. ${juiz}`) : "[nome do Juiz de Direito]";
  const modo = ctx.modalidade === "presencial" ? "presencial" : ctx.modalidade === "telepresencial" ? "telepresencial, por meio do aplicativo Zoom Meetings, nos termos da Resolução CNJ n. 354/2020" : "[telepresencial, por meio do aplicativo Zoom Meetings, nos termos da Resolução CNJ n. 354/2020 / presencial]";
  b.push({ tipo: "secao", texto: "PRESENTES" });
  const linhasP: string[] = [`[Presente presencialmente na sala de audiências] o Juiz de Direito, ${juizN}.`];
  for (const p of partes) {
    const rot = (ROTULO_POLO[p.polo || ""] || "parte").toLowerCase();
    const adv = advTxt(p);
    linhasP.push(`[Presente/Ausente] ${rot === "requerente" || rot === "requerido" ? "o(a) " : ""}${rot} ${v(p.nome)}${adv ? `, [acompanhado(a) de seu(sua) advogado(a), ${adv}]` : ""}.`);
  }
  const tes = (d.testemunhas || []).filter((t) => t.nome);
  if (tes.length) linhasP.push(`Testemunhas indicadas: ${lista(tes.map((t) => String(t.nome)))} [presentes/ausentes].`);
  b.push({ tipo: "paragrafo", texto: linhasP.join(" "), destaque: "corpo" });
  b.push({ tipo: "secao", texto: "OCORRÊNCIAS" });
  b.push({ tipo: "paragrafo", destaque: "corpo", texto: `Declarada aberta a audiência, na forma da lei, o ato foi realizado de modo ${modo}. Na sequência, o Magistrado advertiu as partes acerca da vedação à divulgação não autorizada dos registros audiovisuais a pessoas estranhas ao processo.` });
  const pend = (d.pedidosAudiencia || []).filter((x) => !x.decisao || !String(x.decisao).trim());
  if (pend.length) b.push({ tipo: "paragrafo", destaque: "corpo", texto: `Requerimentos constantes dos autos ainda sem decisão: ${pend.map((x) => `${v(x.tipo)} (${v(x.requerente)}, ${loc(x.localizacao)})`).join("; ")}.` });
  b.push({ tipo: "paragrafo", destaque: "corpo", texto: "[Registrar as ocorrências: oitivas, requerimentos e decisões incidentais.]" });
  b.push({ tipo: "secao", texto: "DELIBERAÇÕES" });
  b.push({ tipo: "paragrafo", destaque: "corpo", texto: "Pelo MM. Juiz de Direito foi proferida a seguinte D E C I S Ã O:" });
  b.push({ tipo: "paragrafo", destaque: "corpo", texto: "[Texto da decisão.]" });
  b.push({ tipo: "secao", texto: "ENCERRAMENTO DA AUDIÊNCIA" });
  const assessor = String(ctx.assessor || "").trim() || "[nome do assessor]";
  b.push({ tipo: "paragrafo", destaque: "corpo", texto: `[Pelo MM. Juiz foram dispensadas as assinaturas, por se tratar de audiência realizada por videoconferência.] Facultam-se às partes indicar eventual desconformidade ou irregularidade no conteúdo do presente termo de audiência, no prazo de 2 (dois) dias, contados da disponibilização deste no sistema PJD/TJGO. Encerrado o ato. Eu, ${assessor}, Assessor de Juiz de Direito, o digitei.` });
  b.push({ tipo: "assinatura", linhas: [juiz ? juiz.replace(/^dr\.?a?\s+/i, "").toUpperCase() : "[NOME DO JUIZ DE DIREITO]", "Juiz de Direito", "(assinado digitalmente)"] });
  return b;
}

const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
// campos a completar: trechos entre [colchetes] ficam marcados
const comCampos = (s: string) => esc(s).replace(/\[[^\]]{1,300}\]/g, (m) => `<span class="preencher">${m}</span>`);

export const CSS_ATA = `
.ata{background:#fff;font-family:Candara,Calibri,"Segoe UI",Arial,sans-serif;color:#111;font-size:11.5pt;line-height:1.5}
.ata .cab{text-align:center;margin:0 0 6px}
.ata .cab img{height:78px;width:auto;display:block;margin:0 auto 6px}
.ata .cab p{margin:0;font-family:"Courier New",Courier,monospace;font-weight:bold;font-size:9.5pt;line-height:1.25;text-align:center}
.ata .titulo{text-align:center;font-weight:bold;font-size:17pt;margin:34px 0 22px}
.ata .meta{margin:1px 0;text-align:left}
.ata .meta .rot{font-weight:normal}
.ata .meta b{font-weight:bold}
.ata .secao,.ata .sub{text-align:center;font-weight:bold;font-size:12pt;margin:26px 0 10px;break-after:avoid}
.ata p{margin:4px 0}
.ata .corpo{text-align:justify;text-indent:30px;margin:6px 0}
.ata .preencher{background:#fff1a8;border-radius:3px;padding:0 2px}
.ata .aviso{font-size:9pt;color:#444;border:1px solid #bbb;padding:5px 8px;background:#f6f6f6;margin:10px 0}
.ata .conferir{color:#8a1c1c;border:1px solid #c33;background:#fdecea;padding:5px 8px;font-weight:bold}
.ata .vazio{color:#555;font-style:italic}
.ata table{width:100%;border-collapse:collapse;margin:6px 0;font-size:10pt}
.ata th,.ata td{border:1px solid #888;padding:3px 5px;vertical-align:top;text-align:left}
.ata th{background:#ececec}
.ata tr.conf td{background:#fff6d6}
.ata ul{margin:4px 0 4px 20px;padding:0}
.ata li.conf{background:#fff6d6}
.ata li.alto{color:#8a1c1c;font-weight:bold}
.ata tr{break-inside:avoid}
.ata .assin{text-align:center;margin:34px 0 0;break-inside:avoid}
.ata .assin p{margin:0;font-weight:bold}
.ata .assin p+p{font-weight:normal}
.ata-rodape{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #777;margin-top:34px;padding-top:4px;font-family:Arial,sans-serif;font-size:8pt;color:#222}
.ata-rodape div:last-child{text-align:right}
`;

export function blocosParaHtml(bl: Bloco[]): string {
  return `<div class="ata">` + bl.map((x) => {
    if (x.tipo === "cabecalho") return `<div class="cab"><img src="${BRASAO_GOIAS_SRC}" alt="Brasão do Estado de Goiás">` + x.linhas.map((l) => `<p>${esc(l)}</p>`).join("") + `</div>`;
    if (x.tipo === "titulo") return `<p class="titulo">${esc(x.texto)}</p>`;
    if (x.tipo === "meta") return `<p class="meta"><span class="rot">${esc(x.rotulo)}</span> <b>${esc(x.valor)}</b></p>`;
    if (x.tipo === "secao") return `<p class="secao">${esc(x.texto)}</p>`;
    if (x.tipo === "paragrafo") return `<p class="${x.destaque || ""}">${x.destaque === "corpo" ? comCampos(x.texto) : esc(x.texto)}</p>`;
    if (x.tipo === "lista") return `<ul>` + x.itens.map((i) => `<li class="${i.conferir ? "conf " : ""}${i.nivel === "alto" ? "alto" : ""}">${esc(i.texto)}</li>`).join("") + `</ul>`;
    if (x.tipo === "assinatura") return `<div class="assin">` + x.linhas.map((l) => `<p>${esc(l)}</p>`).join("") + `</div>`;
    return `<table><thead><tr>${x.colunas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>` + x.linhas.map((l) => `<tr class="${l.conferir ? "conf" : ""}">${l.celulas.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") + `</tbody></table>`;
  }).join("") + `</div>`;
}

export function blocosParaTexto(bl: Bloco[]): string {
  return bl.map((x) => {
    if (x.tipo === "cabecalho") return x.linhas.join("\n") + "\n";
    if (x.tipo === "titulo") return x.texto.toUpperCase() + "\n";
    if (x.tipo === "meta") return `${x.rotulo} ${x.valor}`;
    if (x.tipo === "secao") return "\n" + x.texto.toUpperCase();
    if (x.tipo === "paragrafo") return x.texto;
    if (x.tipo === "lista") return x.itens.map((i) => "• " + i.texto).join("\n");
    if (x.tipo === "assinatura") return "\n" + x.linhas.join("\n");
    return x.linhas.map((l) => "• " + l.celulas.map((c, i) => (x.colunas[i] ? x.colunas[i] + ": " : "") + c).join(" | ")).join("\n");
  }).join("\n");
}

// Rodapé do termo (número da página + nome do juiz): usado na tela, na impressão e no Word
export const rodapeJuiz = (ctx: ContextoAta) => ({ nome: String(ctx.juiz || "").replace(/^dr\.?a?\s+/i, "").trim() || "[nome do Juiz]", cargo: "Juiz de Direito" });

// ===== Edição: o documento editado é guardado como HTML; estas funções limpam o HTML e o convertem de volta em blocos (Word) =====
const TAGS_OK = new Set(["DIV", "P", "SPAN", "B", "STRONG", "I", "EM", "U", "BR", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "IMG"]);
const CLASSES_OK = new Set(["ata", "brasao", "titulo", "sub", "aviso", "conferir", "vazio", "conf", "alto", "cab", "meta", "rot", "secao", "corpo", "preencher", "assin"]);

export function sanitizarHtmlAta(html: string): string {
  const doc = new DOMParser().parseFromString(`<div id="raiz">${html || ""}</div>`, "text/html");
  const raiz = doc.getElementById("raiz")!;
  const limpar = (no: Element) => {
    for (const f of Array.from(no.children)) {
      if (!TAGS_OK.has(f.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "FORM", "INPUT", "BUTTON", "SVG"].includes(f.tagName.toUpperCase())) { f.remove(); continue; }
        const frag = doc.createDocumentFragment(); while (f.firstChild) frag.appendChild(f.firstChild); f.replaceWith(frag); continue;
      }
      if (f.tagName === "IMG") {
        const src = f.getAttribute("src") || "";
        if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+$/.test(src)) { f.remove(); continue; }
      }
      for (const a of Array.from(f.attributes)) {
        if (a.name === "class") { const ok = a.value.split(/\s+/).filter((c) => CLASSES_OK.has(c)); if (ok.length) f.setAttribute("class", ok.join(" ")); else f.removeAttribute("class"); }
        else if (f.tagName === "IMG" && (a.name === "src" || a.name === "alt")) { /* mantém */ }
        else if (!(["colspan", "rowspan"].includes(a.name))) f.removeAttribute(a.name);
      }
      limpar(f);
    }
  };
  for (let i = 0; i < 3; i++) limpar(raiz);
  return raiz.innerHTML;
}

export function htmlParaBlocos(html: string): Bloco[] {
  const doc = new DOMParser().parseFromString(`<div id="raiz">${html || ""}</div>`, "text/html");
  const raiz = doc.getElementById("raiz")!;
  const topo = (raiz.querySelector(".ata") as Element) || raiz;
  const txt = (e: Element) => (e.textContent || "").replace(/\s+/g, " ").trim();
  const bl: Bloco[] = [];
  for (const f of Array.from(topo.children)) {
    const cl = f.className || "";
    if (f.tagName === "TABLE") {
      const cab = Array.from(f.querySelectorAll("thead th")).map(txt);
      const linhas = Array.from(f.querySelectorAll("tbody tr")).map((tr) => ({ celulas: Array.from(tr.children).map(txt), conferir: /conf/.test(tr.className) }));
      bl.push({ tipo: "tabela", colunas: cab.length ? cab : (linhas[0]?.celulas.map(() => "") || []), linhas });
    } else if (f.tagName === "UL" || f.tagName === "OL") {
      bl.push({ tipo: "lista", itens: Array.from(f.querySelectorAll("li")).map((li) => ({ texto: txt(li), conferir: /conf/.test(li.className), nivel: /alto/.test(li.className) ? "alto" : undefined })) });
    } else if (/\bcab\b/.test(cl)) {
      bl.push({ tipo: "cabecalho", linhas: Array.from(f.querySelectorAll("p")).map(txt).filter(Boolean) });
    } else if (/\bassin\b/.test(cl)) {
      bl.push({ tipo: "assinatura", linhas: Array.from(f.querySelectorAll("p")).map(txt).filter(Boolean) });
    } else if (txt(f) || f.tagName === "P") {
      if (/\bbrasao\b/.test(cl)) bl.push({ tipo: "cabecalho", linhas: [txt(f)] });
      else if (/\btitulo\b/.test(cl)) bl.push({ tipo: "titulo", texto: txt(f) });
      else if (/\b(secao|sub)\b/.test(cl)) bl.push({ tipo: "secao", texto: txt(f) });
      else if (/\bmeta\b/.test(cl)) { const r = f.querySelector(".rot"); const rot = r ? txt(r) : ""; const todo = txt(f); bl.push({ tipo: "meta", rotulo: rot, valor: rot ? todo.slice(todo.indexOf(rot) + rot.length).trim() : todo }); }
      else if (txt(f)) bl.push({ tipo: "paragrafo", texto: txt(f), destaque: /conferir/.test(cl) ? "conferir" : /aviso/.test(cl) ? "aviso" : /vazio/.test(cl) ? "vazio" : /corpo/.test(cl) ? "corpo" : undefined });
    }
  }
  return bl;
}

// ===== Copiloto rápido: em vez de pedir à IA o documento inteiro de volta, numeramos os blocos e ela devolve só as OPERAÇÕES (poucas linhas) =====
export interface BlocoNumerado { id: number; tipo: "p" | "li" | "tr"; classe?: string; texto?: string; celulas?: string[] }
export interface OperacaoAta {
  op: "replace" | "insert_after" | "delete";
  id: number;
  texto?: string;            // novo texto (p, li)
  celulas?: string[];        // novas células (tr)
  tipo?: "p" | "li" | "tr";  // insert_after: tipo do novo bloco
  classe?: string;           // insert_after: sub | conferir | vazio ...
}

const SELETOR_BLOCOS = "p, li, tr";
const txtc = (e: Element) => (e.textContent || "").replace(/\s+/g, " ").trim();

export function numerarBlocos(html: string): BlocoNumerado[] {
  const doc = new DOMParser().parseFromString(`<div id="raiz">${html || ""}</div>`, "text/html");
  return Array.from(doc.getElementById("raiz")!.querySelectorAll(SELETOR_BLOCOS)).map((e, i) => {
    const tipo = e.tagName.toLowerCase() as "p" | "li" | "tr";
    const classe = (e.getAttribute("class") || "").trim() || undefined;
    return tipo === "tr" ? { id: i + 1, tipo, classe, celulas: Array.from(e.children).map(txtc) } : { id: i + 1, tipo, classe, texto: txtc(e) };
  });
}

// Aplica as operações sobre o HTML (a numeração é a de numerarBlocos sobre o MESMO html). Operações com id inexistente são ignoradas e contadas.
export function aplicarOperacoes(html: string, ops: OperacaoAta[]): { html: string; aplicadas: number; ignoradas: number } {
  const doc = new DOMParser().parseFromString(`<div id="raiz">${html || ""}</div>`, "text/html");
  const raiz = doc.getElementById("raiz")!;
  const alvos = Array.from(raiz.querySelectorAll(SELETOR_BLOCOS));
  let aplicadas = 0, ignoradas = 0;
  const limpo = (t: string) => String(t ?? "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]*>/g, "").trim();
  for (const o of ops || []) {
    const alvo = alvos[Number(o?.id) - 1];
    if (!alvo) { ignoradas++; continue; }
    try {
      if (o.op === "delete") { alvo.remove(); aplicadas++; }
      else if (o.op === "replace") {
        if (alvo.tagName === "TR" && Array.isArray(o.celulas)) { Array.from(alvo.children).forEach((c, i) => { if (o.celulas![i] != null) c.textContent = limpo(o.celulas![i]); }); aplicadas++; }
        else if (o.texto != null && alvo.tagName !== "TR") {
          const t = limpo(o.texto);
          if (alvo.classList.contains("meta") && /^[^:]{1,40}:\s*\S/.test(t)) { const k = t.indexOf(":"); alvo.innerHTML = ""; const r = doc.createElement("span"); r.className = "rot"; r.textContent = t.slice(0, k + 1); const b = doc.createElement("b"); b.textContent = t.slice(k + 1).trim(); alvo.append(r, " ", b); }
          else alvo.textContent = t;
          aplicadas++;
        }
        else ignoradas++;
      } else if (o.op === "insert_after") {
        const tipo = o.tipo || (alvo.tagName.toLowerCase() as "p" | "li" | "tr");
        let novo: Element;
        if (tipo === "tr") {
          novo = doc.createElement("tr"); const n = alvo.tagName === "TR" ? alvo.children.length : (o.celulas || []).length;
          for (let i = 0; i < n; i++) { const td = doc.createElement("td"); td.textContent = limpo(o.celulas?.[i] ?? ""); novo.appendChild(td); }
        } else { novo = doc.createElement(tipo === "li" ? "li" : "p"); novo.textContent = limpo(o.texto || ""); }
        const cl = (o.classe || "").split(/\s+/).filter((c) => CLASSES_OK.has(c)).join(" "); if (cl) novo.setAttribute("class", cl);
        alvo.after(novo); aplicadas++;
      } else ignoradas++;
    } catch { ignoradas++; }
  }
  return { html: sanitizarHtmlAta(raiz.innerHTML), aplicadas, ignoradas };
}
