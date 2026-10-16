// MODELO DA ATA PRELIMINAR. Para trocar o modelo do documento, edite SOMENTE este arquivo:
//  - MODELO_ATA: títulos, ordem das seções e rodapé;
//  - montarBlocos(): como cada seção é escrita (títulos, colunas das tabelas, frases).
// O visualizador, a impressão/PDF, o Word e o "copiar" usam os mesmos blocos, então mudam juntos.
import type { AtaPreliminarDados } from "../types";

export type SecaoAta = "cabecalho" | "partes" | "resumo" | "testemunhas" | "citacoes" | "pedidos" | "atencao" | "controversia";
export interface ModeloAta { id: string; nome: string; brasao: string[]; titulo: string; aviso: string; secoes: { id: SecaoAta; titulo: string }[] }

export const MODELO_ATA: ModeloAta = {
  id: "padrao-v1",
  nome: "Ata preliminar — modelo padrão",
  brasao: ["PODER JUDICIÁRIO DO ESTADO DE GOIÁS"],
  titulo: "ATA PRELIMINAR DE AUDIÊNCIA",
  aviso: "Documento de apoio ao magistrado, elaborado a partir dos autos. Não substitui a ata da audiência. Itens marcados como “conferir” devem ser verificados nos autos.",
  secoes: [
    { id: "cabecalho", titulo: "1. Identificação do processo" },
    { id: "partes", titulo: "2. Partes e advogados" },
    { id: "resumo", titulo: "3. Resumo do processo" },
    { id: "testemunhas", titulo: "4. Testemunhas indicadas" },
    { id: "citacoes", titulo: "5. Citações e intimações" },
    { id: "pedidos", titulo: "6. Pedidos relacionados à audiência" },
    { id: "atencao", titulo: "7. Pontos de atenção para o juiz" },
    { id: "controversia", titulo: "8. Pontos controvertidos e o que falta provar" },
  ],
};

export type Bloco =
  | { tipo: "brasao"; texto: string }
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "paragrafo"; texto: string; destaque?: "aviso" | "conferir" | "vazio" }
  | { tipo: "lista"; itens: { texto: string; conferir?: boolean; nivel?: string }[] }
  | { tipo: "tabela"; colunas: string[]; linhas: { celulas: string[]; conferir?: boolean }[] };

const NC = "não consta nos autos";
const v = (x?: string) => (x && String(x).trim() ? String(x).trim() : NC);
const loc = (x?: string) => (x && String(x).trim() ? String(x).trim() : "localização não identificada");
const POLO: Record<string, string> = { ativo: "Polo ativo", passivo: "Polo passivo", terceiro: "Terceiro", ministerio_publico: "Ministério Público" };
const RESULT: Record<string, string> = { positiva: "Positiva", negativa: "Negativa", edital: "Por edital", hora_certa: "Hora certa", aguardando: "Aguardando cumprimento", nao_localizada: "Não localizada nos autos" };
const SIT: Record<string, string> = { intimada: "Intimada", nao_intimada: "Não intimada", negativa: "Intimação negativa", aguardando: "Aguardando", nao_localizada: "Não localizada nos autos" };
const INDICADA: Record<string, string> = { autor: "Autor", reu: "Réu", outro: "Outro" };

export function montarBlocos(d: AtaPreliminarDados, m: ModeloAta = MODELO_ATA): Bloco[] {
  const b: Bloco[] = [];
  m.brasao.forEach((t) => b.push({ tipo: "brasao", texto: t }));
  b.push({ tipo: "titulo", texto: m.titulo });
  b.push({ tipo: "paragrafo", texto: m.aviso, destaque: "aviso" });
  if (d.alertaInjecao && d.alertaInjecao.total > 0) {
    b.push({ tipo: "paragrafo", destaque: "conferir", texto: `ALERTA: possível tentativa de manipular a IA nos autos (${d.alertaInjecao.total} trecho(s)). ` + d.alertaInjecao.achados.slice(0, 5).map((a) => `${[a.movimentacao != null ? `Mov. ${a.movimentacao}` : "", a.arquivo != null ? `Arq. ${a.arquivo}` : "", a.pagina != null ? `Pág. ${a.pagina}` : ""].filter(Boolean).join(", ") || "local não identificado"}: “${a.trecho.slice(0, 160)}”`).join(" | ") });
  }
  for (const s of m.secoes) {
    b.push({ tipo: "subtitulo", texto: s.titulo });
    if (s.id === "cabecalho") {
      const c = d.cabecalho || {};
      b.push({ tipo: "tabela", colunas: ["Campo", "Informação"], linhas: ([["Processo nº", c.numeroProcesso], ["Classe", c.classe], ["Assunto", c.assunto], ["Vara / Juízo", c.vara], ["Comarca", c.comarca], ["Valor da causa", c.valorCausa], ["Distribuição", c.dataDistribuicao], ["Tipo de audiência", c.tipoAudiencia], ["Data e hora da audiência", c.dataHoraAudiencia]] as [string, string | undefined][]).map(([k, x]) => ({ celulas: [k, v(x)] })) });
    } else if (s.id === "partes") {
      const l = d.partes || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: NC, destaque: "vazio" });
      else b.push({ tipo: "tabela", colunas: ["Polo", "Nome / qualificação", "Documento", "Advogado(s)", "Onde consta"], linhas: l.map((p) => ({ conferir: p.conferir, celulas: [POLO[p.polo || ""] || v(p.polo), [v(p.nome), p.qualificacao].filter(Boolean).join(" — "), v(p.documento), (p.advogados || []).map((a) => `${a.nome || ""}${a.oab ? ` (OAB ${a.oab})` : ""}`).join("; ") || NC, loc(p.localizacao) + (p.conferir ? " [conferir]" : "")] })) });
    } else if (s.id === "resumo") {
      b.push({ tipo: "paragrafo", texto: v(d.resumo) });
    } else if (s.id === "testemunhas") {
      const l = d.testemunhas || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: "Nenhuma testemunha arrolada nos autos.", destaque: "vazio" });
      else b.push({ tipo: "tabela", colunas: ["Testemunha", "Indicada por", "Onde foi indicada", "Intimação", "Onde consta a intimação"], linhas: l.map((t) => ({ conferir: t.conferir, celulas: [v(t.nome) + (t.qualificacao ? ` — ${t.qualificacao}` : ""), INDICADA[t.indicadaPor || ""] || v(t.indicadaPor), loc(t.localizacao), (SIT[t.situacaoIntimacao || ""] || NC) + (t.dataIntimacao ? ` (${t.dataIntimacao})` : ""), loc(t.localizacaoIntimacao) + (t.conferir ? " [conferir]" : "")] })) });
    } else if (s.id === "citacoes") {
      const l = d.citacoesIntimacoes || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: NC, destaque: "vazio" });
      else b.push({ tipo: "tabela", colunas: ["Destinatário", "Ato", "Resultado", "Data", "Onde consta"], linhas: l.map((c) => ({ conferir: c.conferir, celulas: [v(c.destinatario) + (c.papel ? ` (${c.papel})` : ""), c.ato === "citacao" ? "Citação" : c.ato === "intimacao" ? "Intimação" : v(c.ato), (RESULT[c.resultado || ""] || NC) + (c.observacao ? ` — ${c.observacao}` : ""), v(c.data), loc(c.localizacao) + (c.conferir ? " [conferir]" : "")] })) });
    } else if (s.id === "pedidos") {
      const l = d.pedidosAudiencia || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: "Nenhum pedido relacionado à audiência localizado nos autos.", destaque: "vazio" });
      else b.push({ tipo: "tabela", colunas: ["Pedido", "Requerente", "Resumo", "Decisão", "Onde consta"], linhas: l.map((p) => ({ conferir: p.conferir, celulas: [v(p.tipo), v(p.requerente) + (p.data ? ` (${p.data})` : ""), v(p.resumo), p.decisao && p.decisao.trim() ? p.decisao : "sem decisão localizada", loc(p.localizacao) + (p.conferir ? " [conferir]" : "")] })) });
    } else if (s.id === "atencao") {
      const l = d.pontosAtencao || [];
      if (!l.length) b.push({ tipo: "paragrafo", texto: "Nenhum ponto de atenção identificado.", destaque: "vazio" });
      else b.push({ tipo: "lista", itens: l.map((p) => ({ nivel: p.nivel, conferir: p.conferir, texto: `${p.nivel === "alto" ? "[ALTO] " : p.nivel === "medio" ? "[MÉDIO] " : ""}${v(p.texto)} (${loc(p.localizacao)})${p.conferir ? " [conferir: " + (p.motivoConferir || "") + "]" : ""}` })) });
    } else if (s.id === "controversia") {
      const l = d.pontosControvertidos || [];
      if (l.length) b.push({ tipo: "lista", itens: l.map((x) => ({ texto: x })) }); else b.push({ tipo: "paragrafo", texto: NC, destaque: "vazio" });
      b.push({ tipo: "paragrafo", texto: "O que falta provar: " + v(d.faltaProvar) });
    }
  }
  return b;
}

const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export const CSS_ATA = `
.ata{background:#fff;font-family:"Times New Roman",serif;color:#111;font-size:12pt;line-height:1.45}
.ata .brasao{text-align:center;font-weight:bold;letter-spacing:.5px;margin:0}
.ata .titulo{text-align:center;font-weight:bold;font-size:14pt;margin:10px 0 8px}
.ata .sub{font-weight:bold;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:2px;break-after:avoid}
.ata p{margin:4px 0;text-align:justify}
.ata .aviso{font-size:9.5pt;color:#444;border:1px solid #bbb;padding:5px 8px;background:#f6f6f6}
.ata .conferir{color:#8a1c1c;border:1px solid #c33;background:#fdecea;padding:5px 8px;font-weight:bold}
.ata .vazio{color:#555;font-style:italic}
.ata table{width:100%;border-collapse:collapse;margin:4px 0;font-size:10.5pt}
.ata th,.ata td{border:1px solid #888;padding:3px 5px;vertical-align:top;text-align:left}
.ata th{background:#e9e9e9}
.ata tr.conf td{background:#fff6d6}
.ata ul{margin:4px 0 4px 18px;padding:0}
.ata li.conf{background:#fff6d6}
.ata li.alto{color:#8a1c1c;font-weight:bold}
.ata tr{break-inside:avoid}
`;

export function blocosParaHtml(bl: Bloco[]): string {
  return `<div class="ata">` + bl.map((x) => {
    if (x.tipo === "brasao") return `<p class="brasao">${esc(x.texto)}</p>`;
    if (x.tipo === "titulo") return `<p class="titulo">${esc(x.texto)}</p>`;
    if (x.tipo === "subtitulo") return `<p class="sub">${esc(x.texto)}</p>`;
    if (x.tipo === "paragrafo") return `<p class="${x.destaque || ""}">${esc(x.texto)}</p>`;
    if (x.tipo === "lista") return `<ul>` + x.itens.map((i) => `<li class="${i.conferir ? "conf " : ""}${i.nivel === "alto" ? "alto" : ""}">${esc(i.texto)}</li>`).join("") + `</ul>`;
    return `<table><thead><tr>${x.colunas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>` + x.linhas.map((l) => `<tr class="${l.conferir ? "conf" : ""}">${l.celulas.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") + `</tbody></table>`;
  }).join("") + `</div>`;
}

export function blocosParaTexto(bl: Bloco[]): string {
  return bl.map((x) => {
    if (x.tipo === "brasao" || x.tipo === "titulo") return x.texto.toUpperCase() + "\n";
    if (x.tipo === "subtitulo") return "\n" + x.texto.toUpperCase();
    if (x.tipo === "paragrafo") return x.texto;
    if (x.tipo === "lista") return x.itens.map((i) => "• " + i.texto).join("\n");
    return x.linhas.map((l) => "• " + l.celulas.map((c, i) => (x.colunas[i] ? x.colunas[i] + ": " : "") + c).join(" | ")).join("\n");
  }).join("\n");
}


// ===== Edição: o documento editado é guardado como HTML; estas funções limpam o HTML e o convertem de volta em blocos (Word) =====
const TAGS_OK = new Set(["DIV", "P", "SPAN", "B", "STRONG", "I", "EM", "U", "BR", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"]);
const CLASSES_OK = new Set(["ata", "brasao", "titulo", "sub", "aviso", "conferir", "vazio", "conf", "alto"]);

export function sanitizarHtmlAta(html: string): string {
  const doc = new DOMParser().parseFromString(`<div id="raiz">${html || ""}</div>`, "text/html");
  const raiz = doc.getElementById("raiz")!;
  const limpar = (no: Element) => {
    for (const f of Array.from(no.children)) {
      if (!TAGS_OK.has(f.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "FORM", "INPUT", "BUTTON", "SVG"].includes(f.tagName.toUpperCase())) { f.remove(); continue; }
        // tag desconhecida (ex.: font, h1): troca pelo conteúdo
        const frag = doc.createDocumentFragment(); while (f.firstChild) frag.appendChild(f.firstChild); f.replaceWith(frag); continue;
      }
      for (const a of Array.from(f.attributes)) {
        if (a.name === "class") { const ok = a.value.split(/\s+/).filter((c) => CLASSES_OK.has(c)); if (ok.length) f.setAttribute("class", ok.join(" ")); else f.removeAttribute("class"); }
        else if (!(["colspan", "rowspan"].includes(a.name))) f.removeAttribute(a.name);
      }
      limpar(f);
    }
  };
  // repete: ao trocar tags desconhecidas pelo conteúdo, filhos novos precisam ser revistos
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
    } else if (txt(f) || f.tagName === "P") {
      if (/brasao/.test(cl)) bl.push({ tipo: "brasao", texto: txt(f) });
      else if (/titulo/.test(cl)) bl.push({ tipo: "titulo", texto: txt(f) });
      else if (/\bsub\b/.test(cl)) bl.push({ tipo: "subtitulo", texto: txt(f) });
      else if (txt(f)) bl.push({ tipo: "paragrafo", texto: txt(f), destaque: /conferir/.test(cl) ? "conferir" : /aviso/.test(cl) ? "aviso" : /vazio/.test(cl) ? "vazio" : undefined });
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
        else if (o.texto != null && alvo.tagName !== "TR") { alvo.textContent = limpo(o.texto); aplicadas++; }
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
