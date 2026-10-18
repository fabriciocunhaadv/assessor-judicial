import { extractTextFromPdf } from "../pdfExtractor";
import { getApiHeaders } from "../apiKeyManager";
import { getCabinetTeses } from "../tesesDb";
import { saveToHistory } from "../historyDb";
import type { SavedAnalysis } from "../historyDb";
import { apagarJob, chavePagina, JobGig, lerJob, lerPaginas, listarJobs, PaginaGig, salvarJob, salvarPaginas } from "./db";
import { classificarTodas } from "./triagem";
import { agruparFichas, ALVO_LOTE_CHARS, fichaParaTexto, LIMIAR_FINAL_CHARS, montarLotes, tamanhoFicha, textoDoLote, CPT } from "./lotes";
import { dividirEmPartes, ParteDosAutos } from "./partes";
import { ocrPaginas, abrirPdf } from "../ocrPaginas";
import { conferirAusencias } from "./verificacaoAusencia";
import { pesquisarIndice } from "./indice";
import { classificarPagina } from "./triagem";
import { instalarObservadorPistaNormal, pistaNormalOcupada, ultimaAtividadePistaNormal } from "./pistaNormal";

export interface ConfigGigante {
  promptText: string; promptTitle: string; promptId?: string; promptCategory?: string; promptScope?: string;
  actType: string; unitId?: string; unitName?: string;
  paradigmText?: string; paradigmTitle?: string; instrucao?: string; processNumber?: string;
  userUid?: string; userName?: string; userEmail?: string;
  /** 'dossie': lê em lotes e para no dossiê (usado pela Lupa e pela Mesa); 'minuta' (padrão): redige a minuta e salva no Histórico */
  finalidade?: "minuta" | "dossie";
  /** de onde veio o pedido (principal, turbo, lupa, mesa) */
  origem?: string;
  /** OCR por IA das páginas sem texto (padrão: ligado) */
  ocr?: boolean;
  /** quando os autos foram divididos automaticamente: esta minuta cobre só uma parte */
  parte?: { indice: number; total: number; de: number; ate: number; totalPaginas: number };
}

const FOLGA_APOS_PISTA_NORMAL_MS = Number((globalThis as any).__GIGANTE_FOLGA_MS ?? 25000);
const INTERVALO_ENTRE_CHAMADAS_MS = Number((globalThis as any).__GIGANTE_INTERVALO_MS ?? 45000);
const INTERVALO_OCR_MS = Number((globalThis as any).__GIGANTE_INTERVALO_OCR_MS ?? 12000);
const ESPERA_MAXIMA_PISTA_MS = 20 * 60000;

type Fonte = { nome: string; totalOriginal?: number; paginaInicial?: number; arquivo?: () => Promise<File | null>; ler: (onProg: (c: number, t: number) => void) => Promise<{ text: string; pageCount: number; semTexto: number[]; naoLidas: number[] }> };
/** Limite desta fase: acima disso é preciso mais cota (várias chaves ou faturamento) e execução em servidor. */
export const LIMITE_PAGINAS_GIGANTE = 3000;
const LIMITE_PAGINAS = LIMITE_PAGINAS_GIGANTE;
const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Ouvinte = (jobs: JobGig[]) => void;
class Gerente {
  private ouvintes = new Set<Ouvinte>();
  private jobs = new Map<string, JobGig>();
  private rodando = new Set<string>();
  private sinais = new Map<string, "pausar" | "cancelar">();
  private fontesOcr = new Map<string, { arquivo?: () => Promise<File | null>; paginaInicial: number }[]>();
  private pularOcrDe = new Set<string>();
  private ultimaChamada = 0;
  private carregado = false;

  inscrever(fn: Ouvinte) { this.ouvintes.add(fn); fn(this.lista()); return () => { this.ouvintes.delete(fn); }; }
  lista(): JobGig[] { return Array.from(this.jobs.values()).sort((a, b) => b.criadoEm - a.criadoEm); }
  private avisar() { const l = this.lista(); this.ouvintes.forEach((f) => { try { f(l); } catch { /* ouvinte com erro */ } }); }
  private async gravar(job: JobGig) { this.jobs.set(job.id, job); this.avisar(); try { await salvarJob(job); } catch (e) { console.warn("[Gigantes] não consegui gravar o andamento:", e); } }

  async carregar() {
    instalarObservadorPistaNormal();
    if (this.carregado) return;
    this.carregado = true;
    try {
      for (const j of await listarJobs()) {
        // o que estava em andamento quando a página foi fechada fica pausado, para você retomar
        if (["ocr", "lendo", "fundindo", "redigindo", "preparando", "na_fila"].includes(j.status)) { j.status = j.status === "preparando" ? "erro" : "pausado"; j.etapa = j.status === "erro" ? "Interrompido durante a leitura dos PDFs: envie os arquivos de novo." : "Interrompido: clique em Retomar para continuar do ponto em que parou."; await salvarJob(j); }
        this.jobs.set(j.id, j);
      }
    } catch (e) { console.warn("[Gigantes] banco local indisponível:", e); }
    this.avisar();
  }

  /** Cria o trabalho e devolve na hora; a leitura dos PDFs e o processamento seguem em segundo plano. */
  async iniciar(arquivos: File[], config: ConfigGigante): Promise<string> {
    return this.criar(arquivos.map((f) => ({ nome: f.name, arquivo: async () => f, ler: async (onProg: (c: number, t: number) => void) => { const ex = await extractTextFromPdf(f, onProg, { fullSequential: true }); return { text: ex.text, pageCount: ex.pageCount, semTexto: ex.paginasSemTexto || [], naoLidas: ex.paginasNaoLidas || [] }; } })), config);
  }

  /** Aproveita o texto que o app já extraiu dos PDFs anexados (não lê os arquivos de novo). */
  async iniciarComTextos(pdfs: { nome: string; texto: string; pageCount: number; semTexto?: number[]; naoLidas?: number[]; arquivo?: () => Promise<File | null> }[], config: ConfigGigante): Promise<string> {
    return this.criar(pdfs.map((p) => ({ nome: p.nome, arquivo: p.arquivo, ler: async () => ({ text: p.texto, pageCount: p.pageCount, semTexto: p.semTexto || [], naoLidas: p.naoLidas || [] }) })), config);
  }

  /** Autos acima do limite: divide em partes de até LIMITE_PAGINAS_GIGANTE páginas e lê uma parte por vez, em sequência. Devolve os ids dos trabalhos. */
  async iniciarPartes(pdfs: { nome: string; texto: string; pageCount: number; semTexto?: number[]; naoLidas?: number[]; arquivo?: () => Promise<File | null> }[], config: ConfigGigante): Promise<string[]> {
    await this.carregar();
    const partes: ParteDosAutos[] = dividirEmPartes(pdfs, LIMITE_PAGINAS_GIGANTE);
    const ids: string[] = [];
    const base = Date.now();
    for (const parte of partes) {
      const id = await this.criar(
        parte.fontes.map((f) => ({ nome: f.nome, totalOriginal: f.totalOriginal, paginaInicial: f.paginaInicial, arquivo: pdfs[f.origem]?.arquivo, ler: async () => ({ text: f.texto, pageCount: f.pageCount, semTexto: f.semTexto, naoLidas: f.naoLidas }) })),
        { ...config, parte: { indice: parte.indice, total: parte.total, de: parte.de, ate: parte.ate, totalPaginas: parte.totalPaginas } },
        ids[ids.length - 1],
        `Parte ${parte.indice} de ${parte.total} — págs. ${parte.de.toLocaleString("pt-BR")} a ${parte.ate.toLocaleString("pt-BR")} de ${parte.totalPaginas.toLocaleString("pt-BR")}`,
        base + (partes.length - parte.indice),      // a Parte 1 aparece no alto da lista
      );
      ids.push(id);
    }
    return ids;
  }

  private async criar(fontes: Fonte[], config: ConfigGigante, antecessorId?: string, rotulo?: string, criadoEm?: number): Promise<string> {
    await this.carregar();
    const id = `gig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const job: JobGig = {
      id, nome: rotulo || fontes.map((f) => f.nome).join(" + ").slice(0, 160), antecessorId, numeroProcesso: config.processNumber && !/extrair/i.test(config.processNumber) ? config.processNumber : undefined, criadoEm: criadoEm ?? Date.now(), atualizadoEm: Date.now(),
      status: "preparando", etapa: "Lendo os PDFs e montando o índice das páginas…", progresso: { feitas: 0, total: fontes.length },
      arquivos: [], totalPaginas: 0, totalTokensEstimados: 0, lotes: [], fichas: {}, nivelAtual: 0,
      injecao: { verificado: false, caracteres: 0, total: 0, alto: 0, medio: 0, achados: [] },
      triagem: { essenciais: 0, relevantes: 0, dispensaveis: 0, repetidas: 0, omitidas: [], abreviadas: [] }, config,
    };
    this.fontesOcr.set(id, fontes.map((f) => ({ arquivo: f.arquivo, paginaInicial: f.paginaInicial || 1 })));
    await this.gravar(job);
    void this.preparar(job, fontes);
    return id;
  }

  private async preparar(job: JobGig, fontes: Fonte[]) {
    const id = job.id;
    try {
      const todas: PaginaGig[] = []; let ocrTotal = 0;
      for (let a = 0; a < fontes.length; a++) {
        job.etapa = `Lendo ${fontes[a].nome} (${a + 1}/${fontes.length})…`; this.avisar();
        const ex = await fontes[a].ler((c, t) => { job.progresso = { feitas: c, total: t }; this.avisar(); });
        const pags = dividirPaginas(ex.text, ex.pageCount);
        const baseN = job.arquivos.reduce((t, x) => t + (x.paginas || 0), 0), ini = fontes[a].paginaInicial || 1;       // numeração = posição física da página no processo
        if (job.config.ocr !== false && fontes[a].arquivo) ocrTotal += ex.semTexto.length;
        job.arquivos.push({ nome: fontes[a].nome, paginas: ex.pageCount || pags.length, semTexto: ex.semTexto, naoLidas: ex.naoLidas, totalOriginal: fontes[a].totalOriginal });
        const cls = classificarTodas(pags);
        pags.forEach((p, i) => { const n = baseN + (p.pagina - ini + 1); todas.push({ chave: chavePagina(id, n), jobId: id, n, arquivo: a, pagina: p.pagina, texto: p.texto, tipo: cls[i].tipo, rotuloTipo: cls[i].rotuloTipo }); });
        if (!job.numeroProcesso) { const m = ex.text.slice(0, 20000).match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/); if (m) job.numeroProcesso = m[0]; }
      }
      if (todas.length === 0 && ocrTotal === 0) throw new Error("Não foi possível extrair texto dos PDFs (são imagens sem texto). Faça o OCR das páginas (leitura por imagem) e envie de novo.");
      if (ocrTotal > 0) job.ocr = { total: ocrTotal, feitas: 0, falhas: 0 };
      job.totalPaginas = todas.length;
      const fisicas = job.arquivos.reduce((n, a) => n + (a.paginas || 0), 0);
      if (Math.max(fisicas, job.totalPaginas) > LIMITE_PAGINAS) throw new Error(`Este processo tem ${Math.max(fisicas, job.totalPaginas)} páginas. Esta versão processa até ${LIMITE_PAGINAS}; acima disso é preciso mais cota (várias chaves ou faturamento) e execução em servidor. Divida os autos em partes menores ou aguarde a próxima fase.`);
      for (let i = 0; i < todas.length; i += 400) await salvarPaginas(todas.slice(i, i + 400));
      const cont = (t: PaginaGig["tipo"]) => todas.filter((p) => p.tipo === t).length;
      job.triagem.essenciais = cont("essencial"); job.triagem.relevantes = cont("relevante"); job.triagem.dispensaveis = cont("dispensavel"); job.triagem.repetidas = cont("repetida");
      job.triagem.omitidas = faixasDe(todas, (p) => (p.tipo === "repetida" ? p.rotuloTipo || "página repetida" : ""));
      job.triagem.abreviadas = faixasDe(todas, (p) => (p.tipo === "dispensavel" ? p.rotuloTipo || "documento sem relevância" : ""));
      job.totalTokensEstimados = Math.round(todas.reduce((s, p) => s + p.texto.length, 0) / CPT);
      if (job.ocr) job.totalTokensEstimados += Math.round(job.ocr.total * 700 / CPT * 3.2);       // estimativa das páginas que o OCR vai ler
      const nomes = job.arquivos.map((x) => x.nome), totais = job.arquivos.map((x) => x.totalOriginal || x.paginas);
      job.lotes = montarLotes(todas, nomes, totais);
      job.status = "na_fila"; job.etapa = job.ocr ? `Pronto: ${job.totalPaginas} páginas com texto em ${job.lotes.length} lote(s); ${job.ocr.total} páginas sem texto serão lidas por OCR.` : `Pronto: ${job.totalPaginas} páginas em ${job.lotes.length} lote(s).`; job.progresso = { feitas: 0, total: job.lotes.length };
      await this.gravar(job);
      void this.depoisDe(job.antecessorId).then(() => this.executar(id));
    } catch (e: any) {
      job.status = "erro"; job.erro = e?.message || String(e); job.etapa = "Falha ao preparar os autos."; await this.gravar(job);
    }
  }

  // as partes de um mesmo processo são lidas uma de cada vez: esta espera a anterior terminar (ou parar)
  private async depoisDe(antecessorId?: string) {
    if (!antecessorId) return;
    for (;;) {
      const a = this.jobs.get(antecessorId);
      if (!a || ["concluido", "erro", "cancelado", "pausado"].includes(a.status)) return;
      const j = Array.from(this.jobs.values()).find((x) => x.antecessorId === antecessorId && x.status === "na_fila");
      if (j) { j.etapa = "Aguardando a parte anterior terminar…"; this.avisar(); }
      await dorme(3000);
    }
  }

  pausar(id: string) {
    if (this.rodando.has(id)) { this.sinais.set(id, "pausar"); return; }
    if (this.fila.includes(id)) { this.sairDaFila(id); const j = this.jobs.get(id); if (j) { j.status = "pausado"; j.etapa = "Pausado: clique em Retomar para voltar à fila."; void this.gravar(j); } }
  }
  async cancelar(id: string) {
    const j = this.jobs.get(id); if (!j) return;
    if (this.rodando.has(id)) this.sinais.set(id, "cancelar");
    else { this.sairDaFila(id); j.status = "cancelado"; j.etapa = "Cancelado."; await this.gravar(j); }
  }
  async remover(id: string) { if (this.rodando.has(id)) return; this.jobs.delete(id); this.avisar(); try { await apagarJob(id); } catch { /* ignora */ } }
  async retomar(id: string) { const j = this.jobs.get(id); if (!j || this.rodando.has(id)) return; j.erro = undefined; j.status = "na_fila"; j.etapa = "Retomando…"; await this.gravar(j); void this.executar(id); }

  // ---------- pista própria: espera a pista normal (esteira/usuário) ficar livre e respeita o intervalo entre chamadas ----------
  private async aguardarVez(id: string, intervalo = INTERVALO_ENTRE_CHAMADAS_MS) {
    const ini = Date.now();
    for (;;) {
      if (this.sinais.has(id)) return;
      const livre = !pistaNormalOcupada() && Date.now() - ultimaAtividadePistaNormal() >= FOLGA_APOS_PISTA_NORMAL_MS;
      const intervaloOk = Date.now() - this.ultimaChamada >= intervalo;
      if ((livre && intervaloOk) || Date.now() - ini > ESPERA_MAXIMA_PISTA_MS) { this.ultimaChamada = Date.now(); return; }
      const j = this.jobs.get(id);
      if (j && !livre && !/Aguardando/.test(j.etapa)) { j.etapa = "Aguardando as análises normais terminarem (elas têm prioridade)…"; this.avisar(); }
      await dorme(2000);
    }
  }

  private async chamar(id: string, rota: string, corpo: any): Promise<any> {
    let ultimoErro: any;
    for (let t = 0; t < 4; t++) {
      if (this.sinais.has(id)) throw new Error("__parar__");
      try {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 14 * 60000);
        let txt = "";
        try { const r = await fetch(rota, { method: "POST", headers: getApiHeaders(), body: JSON.stringify(corpo), signal: ctl.signal }); txt = await r.text(); } finally { clearTimeout(to); }
        let data: any; try { data = JSON.parse(txt.trim()); } catch { throw new Error("resposta do servidor incompleta"); }
        if (data?.error || data?.isError) throw new Error(typeof data.error === "string" ? data.error : "erro do servidor");
        return data;
      } catch (e: any) {
        ultimoErro = e;
        if (e?.message === "__parar__") throw e;
        if (!/incompleta|503|indispon|429|cota|quota|rate|Failed to fetch|Network|aborted|timeout/i.test(String(e?.message || e)) || t === 3) throw e;
        const j = this.jobs.get(id); if (j) { j.etapa = `Aguardando a cota da IA renovar (tentativa ${t + 2}/4)…`; this.avisar(); }
        await dorme(70000);
      }
    }
    throw ultimoErro;
  }

  // ---------- fila: um processo gigante por vez (os outros esperam a sua vez, na ordem em que chegaram) ----------
  private fila: string[] = [];
  private emExecucao: string | null = null;
  private posicoes() {
    this.fila.forEach((fid, i) => {
      const j = this.jobs.get(fid);
      if (j && j.status === "na_fila") { j.etapa = `Na fila: aguardando o processo gigante em andamento terminar (posição ${i + 1} na fila)…`; }
    });
    this.avisar();
  }
  private sairDaFila(id: string) { const i = this.fila.indexOf(id); if (i >= 0) { this.fila.splice(i, 1); this.posicoes(); } }

  private async executar(id: string) {
    if (this.rodando.has(id) || this.fila.includes(id) || this.emExecucao === id) return;
    this.fila.push(id);
    const j0 = this.jobs.get(id);
    if (j0 && (this.emExecucao || this.fila.length > 1)) { j0.status = "na_fila"; this.posicoes(); }
    while (this.emExecucao || this.fila[0] !== id) {
      if (!this.fila.includes(id)) return;                          // pausado ou cancelado enquanto esperava
      await dorme(1500);
    }
    this.fila.shift(); this.emExecucao = id; this.posicoes();
    try {
      const j = this.jobs.get(id);
      if (j && j.status !== "cancelado" && j.status !== "pausado") await this.executarAgora(id);
    } finally { this.emExecucao = null; }
  }

  private async executarAgora(id: string) {
    if (this.rodando.has(id)) return;
    this.rodando.add(id); this.sinais.delete(id);
    const job = this.jobs.get(id) || (await lerJob(id));
    if (!job) { this.rodando.delete(id); return; }
    this.jobs.set(id, job);
    try {
      const nomes = job.arquivos.map((x) => x.nome), totais = job.arquivos.map((x) => x.totalOriginal || x.paginas);
      const contexto = `${job.config.promptTitle || "minuta"} (${job.config.actType || "ato"})${job.numeroProcesso ? ` — processo ${job.numeroProcesso}` : ""}`;
      // 0) OCR por IA das páginas sem texto, em lotes de 5 páginas (a pista normal tem prioridade)
      await this.fazerOcr(job);
      if (this.sinais.has(id)) return this.encerrarPorSinal(job);
      // 1) lotes: uma ficha por trecho dos autos
      job.status = "lendo"; job.progresso = { feitas: job.lotes.filter((l) => job.fichas[`n0:${l.i}`]).length, total: job.lotes.length };
      for (const lote of job.lotes) {
        if (job.fichas[`n0:${lote.i}`]) continue;
        await this.aguardarVez(id); if (this.sinais.has(id)) break;
        job.etapa = `Lendo o lote ${lote.i + 1} de ${job.lotes.length} (${lote.rotulo})…`; await this.gravar(job);
        const paginas = await lerPaginas(id, lote.de, lote.ate);
        const r = await this.chamar(id, "/api/gigante-lote", { texto: textoDoLote(paginas, nomes, totais), rotulo: `${lote.rotulo} (lote ${lote.i + 1}/${job.lotes.length})`, contexto });
        job.fichas[`n0:${lote.i}`] = { ...r.ficha, __rotulo: lote.rotulo };
        somarInjecao(job, r.injecao);
        job.progresso = { feitas: job.progresso.feitas + 1, total: job.lotes.length }; await this.gravar(job);
      }
      if (this.sinais.has(id)) return this.encerrarPorSinal(job);
      // 2) fusão em níveis até caber na minuta final
      job.status = "fundindo";
      let nivel = 0; let atual = job.lotes.map((l) => job.fichas[`n${nivel}:${l.i}`]);
      for (nivel = 0; ; nivel++) {
        const prox = job.fichas[`n${nivel + 1}:0`] ? [] : null;
        void prox;
        const existentes = chavesDoNivel(job, nivel + 1);
        if (existentes.length) { atual = existentes.map((k) => job.fichas[k]); continue; }
        const total = atual.reduce((s, f) => s + tamanhoFicha(f), 0);
        if (atual.length === 1 && total <= LIMIAR_FINAL_CHARS) break;
        if (atual.length > 1 && total <= LIMIAR_FINAL_CHARS) break;
        const grupos = atual.length === 1 ? [[0]] : agruparFichas(atual.map(tamanhoFicha));
        job.progresso = { feitas: 0, total: grupos.length };
        const novas: any[] = [];
        for (let g = 0; g < grupos.length; g++) {
          const fichas = grupos[g].map((i) => atual[i]);
          if (fichas.length === 1 && atual.length > 1) { novas.push(fichas[0]); job.fichas[`n${nivel + 1}:${g}`] = fichas[0]; continue; }
          await this.aguardarVez(id); if (this.sinais.has(id)) return this.encerrarPorSinal(job);
          job.etapa = `Fundindo as fichas — nível ${nivel + 1}, grupo ${g + 1} de ${grupos.length}…`; await this.gravar(job);
          const r = await this.chamar(id, "/api/gigante-fusao", { fichas });
          const f = { ...r.ficha, __rotulo: fichas.map((x: any) => x.__rotulo).filter(Boolean).join(" + ").slice(0, 160) };
          novas.push(f); job.fichas[`n${nivel + 1}:${g}`] = f; job.progresso = { feitas: g + 1, total: grupos.length }; await this.gravar(job);
        }
        const novoTotal = novas.reduce((s, f) => s + tamanhoFicha(f), 0);
        atual = novas; job.nivelAtual = nivel + 1;
        if (novoTotal >= total || nivel >= 7) break;       // a fusão deixou de encolher: segue com o que há (o excedente é abreviado na minuta final, com aviso)
      }
      if (job.config.finalidade === "dossie") {       // Lupa e Mesa só precisam do dossiê: não redige minuta
        job.status = "concluido"; job.etapa = "Dossiê pronto: já pode ser usado na Lupa, na Mesa de Audiência ou no Turbo."; job.fim = Date.now(); job.progresso = { feitas: 1, total: 1 };
        await this.gravar(job);
        return;
      }
      // 3) minuta final com o dossiê + peças essenciais na íntegra
      await this.aguardarVez(id); if (this.sinais.has(id)) return this.encerrarPorSinal(job);
      job.status = "redigindo"; job.etapa = "Redigindo a minuta a partir do dossiê…"; job.progresso = { feitas: 0, total: 1 }; await this.gravar(job);
      await this.redigir(job, atual);
      job.status = "concluido"; job.etapa = "Minuta pronta e salva no Histórico."; job.fim = Date.now(); job.progresso = { feitas: 1, total: 1 };
      await this.gravar(job);
    } catch (e: any) {
      if (e?.message === "__parar__") return this.encerrarPorSinal(job);
      job.status = "erro"; job.erro = e?.message || String(e); job.etapa = "Parou por erro. Clique em Retomar para continuar do ponto em que parou."; await this.gravar(job);
    } finally {
      this.rodando.delete(id); this.sinais.delete(id);
    }
  }

  pularOcr(id: string) {
    this.pularOcrDe.add(id);
    const j = this.jobs.get(id); if (j) { j.etapa = "Pulando o OCR… (seguindo só com as páginas que têm texto)"; this.avisar(); }
  }

  /** Espera a operação, mas devolve PULOU assim que o usuário clicar em "Pular o OCR" (sem esperar etapas longas). */
  private async ouPular<T>(id: string, p: Promise<T>): Promise<T | typeof PULOU> {
    p.catch(() => {});
    return new Promise((ok, no) => {
      const iv = setInterval(() => { if (this.pularOcrDe.has(id)) { clearInterval(iv); ok(PULOU); } }, 400);
      p.then((v) => { clearInterval(iv); ok(v); }, (e) => { clearInterval(iv); no(e); });
    });
  }

  private async ocrDaPagina(job: JobGig, doc: any, grupo: number[]) {
    for (let t = 0; t < 2; t++) {
      const r = await ocrPaginas(doc, grupo);
      const feitas = Object.keys(r.textos).length + r.emBranco.length;
      if (feitas > 0 || t === 1) return r;
      job.etapa = `OCR: ${r.motivo || "sem resposta"} — nova tentativa em instantes (2/2)…`; this.avisar();
      await dorme(Number((globalThis as any).__GIGANTE_ESPERA_COTA_MS ?? 70000));
    }
    return { textos: {}, emBranco: [], falhas: grupo } as any;
  }

  private async fazerOcr(job: JobGig) {
    if (!job.ocr || job.ocrFeito) return;
    const id = job.id, fontes = this.fontesOcr.get(id) || [];
    job.status = "ocr"; job.progresso = { feitas: job.ocr.feitas, total: job.ocr.total }; await this.gravar(job);
    let base = 0; let interrompido = false;
    for (let a = 0; a < job.arquivos.length; a++) {
      const arq = job.arquivos[a], inicio = base; base += arq.paginas || 0;
      const alvo = [...arq.semTexto];
      if (alvo.length === 0 || job.config.ocr === false) continue;
      if (this.pularOcrDe.has(id)) { job.ocr.falhas += alvo.length; continue; }
      const getter = fontes[a]?.arquivo, ini = fontes[a]?.paginaInicial || 1;
      const fr = getter ? await this.ouPular(id, getter().catch(() => null)) : null;
      if (fr === PULOU) { job.ocr.falhas += alvo.length; continue; }
      const file = fr as File | null;
      if (!file) { job.ocr.falhas += alvo.length; job.etapa = "OCR: o arquivo original não está mais disponível nesta sessão (as páginas sem texto seguem sem leitura)."; continue; }
      job.etapa = `OCR: abrindo o arquivo ${arq.nome} (pode levar alguns minutos em arquivos grandes)…`; this.avisar();
      let doc: any;
      try {
        const dp = abrirPdf(file); const d = await this.ouPular(id, dp);
        if (d === PULOU) { dp.then((x) => x.destroy?.()).catch(() => {}); job.ocr.falhas += alvo.length; continue; }
        doc = d;
      }
      catch (e: any) { job.ocr.falhas += alvo.length; job.ocr.motivo = `não foi possível abrir ${arq.nome} (${e?.message || e})`; job.etapa = `OCR cancelado: ${job.ocr.motivo}. A leitura segue só com as páginas que têm texto.`; await this.gravar(job); continue; }
      const restantes: number[] = [];
      let seguidasSemResultado = 0;
      try {
      for (let i = 0; i < alvo.length; i += 5) {
        if (this.sinais.has(id)) { interrompido = true; restantes.push(...alvo.slice(i)); break; }
        if (this.pularOcrDe.has(id)) { restantes.push(...alvo.slice(i)); continue; }
        await this.aguardarVez(id, INTERVALO_OCR_MS);
        if (this.sinais.has(id)) { interrompido = true; restantes.push(...alvo.slice(i)); break; }
        const grupo = alvo.slice(i, i + 5);
        job.etapa = `OCR por IA das páginas sem texto: ${job.ocr.feitas} de ${job.ocr.total}…`; this.avisar();
        const rr = await this.ouPular(id, this.ocrDaPagina(job, doc, grupo));
        if (rr === PULOU) { restantes.push(...alvo.slice(i)); continue; }
        const r = rr as Awaited<ReturnType<typeof this.ocrDaPagina>>;
        if (Object.keys(r.textos).length + r.emBranco.length === 0) {
          seguidasSemResultado++; job.ocr.motivo = r.motivo || "sem resposta da IA";
          if (seguidasSemResultado >= 2) {   // falhou duas vezes seguidas: não adianta insistir em 200 lotes
            restantes.push(...alvo.slice(i)); job.ocr.falhas += alvo.length - i;
            job.etapa = `OCR interrompido: ${job.ocr.motivo}. A leitura segue só com as páginas que têm texto; refaça depois pelo botão de leitura visual.`;
            await this.gravar(job); break;
          }
        } else seguidasSemResultado = 0;
        const novas: PaginaGig[] = [];
        for (const pg of grupo) {
          const txt = r.textos[pg];
          if (txt) { const c = classificarPagina(txt); const n = inicio + (pg - ini + 1); novas.push({ chave: chavePagina(id, n), jobId: id, n, arquivo: a, pagina: pg, texto: `[página lida por OCR] ${txt}`, tipo: c.tipo, rotuloTipo: c.rotulo }); }
          else if (r.emBranco.includes(pg)) { /* página em branco: resolvida, sem texto */ }
          else { restantes.push(pg); job.ocr.falhas++; }
        }
        if (novas.length) await salvarPaginas(novas);
        job.ocr.feitas += grupo.length; job.progresso = { feitas: job.ocr.feitas, total: job.ocr.total }; await this.gravar(job);
      }
      } finally { try { await doc.destroy(); } catch { /* ignora */ } }
      arq.semTexto = restantes;
    }
    if (interrompido) return;
    // reconstrói os lotes com as páginas lidas por OCR
    const todas = await lerPaginas(id, 1, 99_999_999);
    const nomes = job.arquivos.map((x) => x.nome), totais = job.arquivos.map((x) => x.totalOriginal || x.paginas);
    job.totalPaginas = todas.length;
    const cont = (t: PaginaGig["tipo"]) => todas.filter((p) => p.tipo === t).length;
    job.triagem.essenciais = cont("essencial"); job.triagem.relevantes = cont("relevante"); job.triagem.dispensaveis = cont("dispensavel"); job.triagem.repetidas = cont("repetida");
    job.triagem.abreviadas = faixasDe(todas, (p) => (p.tipo === "dispensavel" ? p.rotuloTipo || "documento sem relevância" : ""));
    job.totalTokensEstimados = Math.round(todas.reduce((t, p) => t + p.texto.length, 0) / CPT);
    job.lotes = montarLotes(todas, nomes, totais);
    if (job.lotes.length === 0) throw new Error("Nenhuma página do processo pôde ser lida (nem por texto nem por OCR).");
    job.ocrFeito = true; job.progresso = { feitas: 0, total: job.lotes.length };
    await this.gravar(job);
  }

  private async encerrarPorSinal(job: JobGig) {
    const s = this.sinais.get(job.id);
    job.status = s === "cancelar" ? "cancelado" : "pausado"; job.etapa = s === "cancelar" ? "Cancelado." : "Pausado: clique em Retomar para continuar.";
    await this.gravar(job);
  }

  /** Texto do dossiê (fichas fundidas) + peças essenciais na íntegra: é o que a minuta, a Lupa e a Mesa recebem no lugar dos autos. */
  private async montarTextoDossie(job: JobGig, fichas: any[]) {
    const nomes = job.arquivos.map((x) => x.nome), totais = job.arquivos.map((x) => x.totalOriginal || x.paginas);
    const todas = await lerPaginas(job.id, 1, 99_999_999);
    const ess = todas.filter((p) => p.tipo === "essencial");
    const ORC = 190_000; let usado = 0; const escolhidas: PaginaGig[] = [];
    for (const p of ess) { const t = Math.min(p.texto.length, 6000); if (usado + t > ORC) continue; usado += t; escolhidas.push(p); }
    let dossie = fichas.map((f, i) => `### TRECHO ${f.__rotulo || i + 1}\n${fichaParaTexto(f)}`).join("\n\n");
    const MAX_DOSSIE = 260_000; let dossieAbreviado = false;
    if (dossie.length > MAX_DOSSIE) { dossieAbreviado = true; dossie = dossie.slice(0, Math.floor(MAX_DOSSIE * 0.6)) + "\n\n[… parte do dossiê omitida pelo limite de entrada da IA …]\n\n" + dossie.slice(-Math.floor(MAX_DOSSIE * 0.4)); }
    const faixaTxt = (ns: number[]) => { const v = [...ns].sort((a, b) => a - b); const o: string[] = []; let i = 0; while (i < v.length) { let j = i; while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++; o.push(j > i ? `${v[i]}-${v[j]}` : `${v[i]}`); i = j + 1; } return o.join(", "); };
    const semLeitura = job.arquivos.map((a) => ({ nome: a.nome, ns: [...a.semTexto, ...a.naoLidas] })).filter((x) => x.ns.length > 0);
    const avisoLeitura = semLeitura.length ? `\n[PÁGINAS SEM LEITURA (sem texto nem OCR): ${semLeitura.map((x) => `${x.nome}: págs. ${faixaTxt(x.ns)}`).join("; ")}. Não afirme ausência de prova que possa estar nelas.]\n` : "";
    const processText =
      avisoLeitura + `[DOSSIÊ DO PROCESSO — os autos têm ${job.totalPaginas} páginas e foram lidos em ${job.lotes.length} lote(s); abaixo estão as fichas estruturadas (cada item cita o arquivo/página) e, em seguida, as peças essenciais na íntegra. REGRA: este texto é um resumo estruturado dos autos; não afirme que um documento ou prova "não existe" só porque não aparece aqui, e cite a página quando útil]\n\n${dossie}` +
      (escolhidas.length ? `\n\n[PEÇAS ESSENCIAIS NA ÍNTEGRA — ${escolhidas.length} página(s)]\n\n` + escolhidas.map((p) => `[Arquivo ${p.arquivo + 1}: ${nomes[p.arquivo] || ""}]\n[Página ${p.pagina} de ${totais[p.arquivo] || p.pagina}]\n${p.texto.slice(0, 6000)}`).join("\n\n") : "");
    return { processText, escolhidas, dossieAbreviado, nomes };
  }

  private fichasFinais(job: JobGig): any[] {
    const niveis = Object.keys(job.fichas).map((k) => Number(k.slice(1).split(":")[0]));
    const topo = niveis.length ? Math.max(...niveis) : 0;
    return chavesDoNivel(job, topo).map((k) => job.fichas[k]);
  }

  /** Dossiê pronto de um trabalho concluído (para a Lupa, a Mesa e o Turbo). */
  async obterDossie(jobId: string) {
    const job = this.jobs.get(jobId) || (await lerJob(jobId));
    if (!job || Object.keys(job.fichas).length === 0) throw new Error("Dossiê não encontrado neste navegador.");
    const d = await this.montarTextoDossie(job, this.fichasFinais(job));
    return {
      texto: d.processText, jobId: job.id, numeroProcesso: job.numeroProcesso || "",
      info: { paginas: job.totalPaginas, lotes: job.lotes.length, niveis: job.nivelAtual, essenciaisIntegra: d.escolhidas.length, dossieAbreviado: d.dossieAbreviado },
      arquivos: job.arquivos.map((a) => ({ nome: a.nome, totalPaginas: a.paginas, semTexto: a.semTexto, naoLidas: a.naoLidas })),
      injecao: job.injecao,
    };
  }

  /** Último trabalho concluído deste processo (pelo número CNJ) cujo dossiê pode ser reaproveitado. */
  dossieDoProcesso(numero: string): string | null {
    const dig = String(numero || "").replace(/\D/g, "");
    if (dig.length < 10) return null;
    const achados = this.lista().filter((j) => j.status === "concluido" && (j.numeroProcesso || "").replace(/\D/g, "") === dig && Object.keys(j.fichas).length > 0 && !j.config.parte);
    achados.sort((a, b) => (b.fim || 0) - (a.fim || 0));
    return achados[0]?.id || null;
  }

  async pesquisar(jobId: string, termo: string) {
    const r = await pesquisarIndice(jobId, termo, 40);
    const job = this.jobs.get(jobId);
    return { total: r.total, achados: r.achados.map((x) => ({ ...x, nomeArquivo: job?.arquivos[x.arquivo]?.nome || "" })) };
  }

  private async redigir(job: JobGig, fichas: any[]) {
    const cfg = job.config as ConfigGigante;
    const { processText, escolhidas, dossieAbreviado } = await this.montarTextoDossie(job, fichas);
    let tesesTxt = ""; try { const t: any = await getCabinetTeses(); if (t && t.isEnabled !== false && typeof t.text === "string") tesesTxt = t.text.trim(); } catch { /* sem teses */ }
    const parteTxt = cfg.parte ? ` ATENÇÃO: estes autos foram divididos automaticamente e este é o trecho ${cfg.parte.indice} de ${cfg.parte.total} (páginas ${cfg.parte.de.toLocaleString("pt-BR")} a ${cfg.parte.ate.toLocaleString("pt-BR")} de ${cfg.parte.totalPaginas.toLocaleString("pt-BR")}). As demais partes NÃO foram consideradas nesta minuta: não conclua o mérito do processo como um todo, não afirme ausência de prova que possa estar nas outras partes e registre no Relatório que a minuta cobre apenas as páginas ${cfg.parte.de} a ${cfg.parte.ate}.` : "";
    const regra = `[PROCESSO GIGANTE LIDO EM LOTES]:${parteTxt} o texto fornecido é um DOSSIÊ estruturado (fichas por trecho, com a página de cada item) mais as peças essenciais na íntegra. Redija a minuta com base nele e cite páginas quando útil. NÃO afirme "não há prova", "não foi juntado" ou "a parte não comprovou" só por não constar do dossiê: só registre ausência quando a ficha disser expressamente; no mais, use "não localizei no dossiê dos autos" e indique conferência humana.`;
    const corpo = {
      processText, pdfFiles: [], knowledgePdfs: [], customPromptText: cfg.promptText || "", activePromptTitle: cfg.promptTitle || "",
      cabinetTesesText: tesesTxt, isTesesEnabled: Boolean(tesesTxt),
      paradigmModelText: cfg.paradigmText || "", paradigmModelTitle: cfg.paradigmTitle || "", isParadigmEnabled: Boolean(cfg.paradigmText),
      proceduralPhase: "conhecimento", actType: cfg.actType || "auto", specificInstructions: [cfg.instrucao, regra].filter(Boolean).join("\n\n"),
      processInfo: { processNumber: job.numeroProcesso || cfg.processNumber || "Extrair automaticamente dos autos", comarca: cfg.unitName ? `Comarca de ${cfg.unitName.split("/")[0].trim()} - TJGO` : "", vara: cfg.unitName ? (cfg.unitName.split("/")[1]?.trim() || cfg.unitName) : "", juiz: "Juiz(a) de Direito" },
      coberturaLeitura: { escolha: "gigante", paginasOcr: 0, arquivos: job.arquivos.map((a) => ({ nome: a.nome, totalPaginas: a.paginas, semTexto: a.semTexto, naoLidas: a.naoLidas })) },
    };
    const data = await this.chamar(job.id, "/api/generate-minute", corpo);
    if (!data?.minute) throw new Error("A IA não devolveu uma minuta válida a partir do dossiê.");
    let verificacaoAusencia: any[] = [];
    try {
      const conf = await conferirAusencias(job.id, data.minute);
      verificacaoAusencia = conf.map((c) => ({ ...c, paginas: c.paginas.map((p) => ({ arquivo: job.arquivos[p.arquivo]?.nome || `arquivo ${p.arquivo + 1}`, pagina: p.pagina, trecho: p.trecho })) }));
    } catch (e) { console.warn("[Gigantes] conferência de ausência de prova falhou (ignorada):", e); }
    const info = { paginas: job.totalPaginas, lotes: job.lotes.length, niveis: job.nivelAtual, essenciaisIntegra: escolhidas.length, omitidas: job.triagem.omitidas, abreviadas: job.triagem.abreviadas, dossieAbreviado, parte: cfg.parte, ocrPaginas: job.ocr ? job.ocr.feitas - job.ocr.falhas : 0, verificacaoAusencia };
    const alertaInjecao = job.injecao.verificado ? job.injecao : data.alertaInjecao;
    const analysisId = data.analysisId || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `gig-${Date.now()}`);
    const numero = (data.minute?.processNumber && !/extrair|n[ãa]o informado/i.test(data.minute.processNumber)) ? data.minute.processNumber : (job.numeroProcesso || cfg.processNumber || "Sem Número");
    const analise: SavedAnalysis = {
      id: analysisId, unitId: cfg.unitId || "montes_claros", promptTitle: cfg.promptTitle, promptId: cfg.promptId, promptCategory: cfg.promptCategory || "civel", promptScope: (cfg.promptScope as any) || "judicial",
      date: Date.now(), processNumber: numero,
      result: { ...data, gigante: info, alertaInjecao, minute: data.minute ? { ...data.minute, judicialUnit: cfg.unitName || data.minute.judicialUnit } : data.minute },
      originalMinute: data.originalMinute || JSON.parse(JSON.stringify(data.minute)),
      processTextContext: `[Processo gigante: ${job.arquivos.map((a) => a.nome).join(", ")} — ${job.totalPaginas} páginas lidas em lotes]`,
      createdBy: cfg.userUid || "anonymous", creatorName: cfg.userName || "Assessor", creatorEmail: cfg.userEmail || "", chatMessages: [],
    } as SavedAnalysis;
    await saveToHistory(analise);
    job.historicoId = analysisId; job.numeroProcesso = numero;
  }
}

function dividirPaginas(texto: string, total: number): { pagina: number; texto: string }[] {
  const rx = /\[Página (\d+) de (\d+)\]\n?/g; const marcas: { i: number; fim: number; p: number }[] = []; let m: RegExpExecArray | null;
  while ((m = rx.exec(texto))) marcas.push({ i: m.index, fim: m.index + m[0].length, p: Number(m[1]) });
  if (marcas.length === 0) {
    const out: { pagina: number; texto: string }[] = []; const t = texto.trim();
    for (let i = 0, p = 1; i < t.length; i += 3500, p++) out.push({ pagina: p, texto: t.slice(i, i + 3500) });
    return out;
  }
  const out = marcas.map((mk, k) => ({ pagina: mk.p, texto: texto.slice(mk.fim, k + 1 < marcas.length ? marcas[k + 1].i : texto.length).trim() }));
  void total;
  return out.filter((p) => p.texto.length > 0);
}

function faixasDe(paginas: PaginaGig[], motivo: (p: PaginaGig) => string): { de: number; ate: number; motivo: string }[] {
  const out: { de: number; ate: number; motivo: string }[] = [];
  for (const p of paginas) {
    const mt = motivo(p); if (!mt) continue;
    const u = out[out.length - 1];
    if (u && u.ate === p.n - 1 && u.motivo === mt) u.ate = p.n; else out.push({ de: p.n, ate: p.n, motivo: mt });
  }
  return out.slice(0, 200);
}

function chavesDoNivel(job: JobGig, nivel: number): string[] {
  return Object.keys(job.fichas).filter((k) => k.startsWith(`n${nivel}:`)).sort((a, b) => Number(a.split(":")[1]) - Number(b.split(":")[1]));
}

function somarInjecao(job: JobGig, r: any) {
  if (!r) return;
  const a = job.injecao;
  a.verificado = a.verificado || !!r.verificado; a.caracteres += Number(r.caracteres) || 0; a.total += Number(r.total) || 0; a.alto += Number(r.alto) || 0; a.medio += Number(r.medio) || 0;
  if (Array.isArray(r.achados)) a.achados = [...a.achados, ...r.achados].slice(0, 30);
}

const PULOU = Symbol("pulou");
export const gerenteGigantes = new Gerente();
export { ALVO_LOTE_CHARS };
