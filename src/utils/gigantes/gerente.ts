import { extractTextFromPdf } from "../pdfExtractor";
import { getApiHeaders } from "../apiKeyManager";
import { getCabinetTeses } from "../tesesDb";
import { saveToHistory } from "../historyDb";
import type { SavedAnalysis } from "../historyDb";
import { apagarJob, chavePagina, JobGig, lerJob, lerPaginas, listarJobs, PaginaGig, salvarJob, salvarPaginas } from "./db";
import { classificarTodas } from "./triagem";
import { agruparFichas, ALVO_LOTE_CHARS, fichaParaTexto, LIMIAR_FINAL_CHARS, montarLotes, tamanhoFicha, textoDoLote, CPT } from "./lotes";
import { instalarObservadorPistaNormal, pistaNormalOcupada, ultimaAtividadePistaNormal } from "./pistaNormal";

export interface ConfigGigante {
  promptText: string; promptTitle: string; promptId?: string; promptCategory?: string; promptScope?: string;
  actType: string; unitId?: string; unitName?: string;
  paradigmText?: string; paradigmTitle?: string; instrucao?: string; processNumber?: string;
  userUid?: string; userName?: string; userEmail?: string;
}

const FOLGA_APOS_PISTA_NORMAL_MS = Number((globalThis as any).__GIGANTE_FOLGA_MS ?? 25000);
const INTERVALO_ENTRE_CHAMADAS_MS = Number((globalThis as any).__GIGANTE_INTERVALO_MS ?? 45000);
const ESPERA_MAXIMA_PISTA_MS = 20 * 60000;
/** Limite desta fase: acima disso é preciso mais cota (várias chaves ou faturamento) e execução em servidor. */
export const LIMITE_PAGINAS_GIGANTE = 2500;
const LIMITE_PAGINAS = LIMITE_PAGINAS_GIGANTE;
const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Ouvinte = (jobs: JobGig[]) => void;
class Gerente {
  private ouvintes = new Set<Ouvinte>();
  private jobs = new Map<string, JobGig>();
  private rodando = new Set<string>();
  private sinais = new Map<string, "pausar" | "cancelar">();
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
        if (["lendo", "fundindo", "redigindo", "preparando", "na_fila"].includes(j.status)) { j.status = j.status === "preparando" ? "erro" : "pausado"; j.etapa = j.status === "erro" ? "Interrompido durante a leitura dos PDFs: envie os arquivos de novo." : "Interrompido: clique em Retomar para continuar do ponto em que parou."; await salvarJob(j); }
        this.jobs.set(j.id, j);
      }
    } catch (e) { console.warn("[Gigantes] banco local indisponível:", e); }
    this.avisar();
  }

  /** Cria o trabalho e devolve na hora; a leitura dos PDFs e o processamento seguem em segundo plano. */
  async iniciar(arquivos: File[], config: ConfigGigante): Promise<string> {
    return this.criar(arquivos.map((f) => ({ nome: f.name, ler: async (onProg: (c: number, t: number) => void) => { const ex = await extractTextFromPdf(f, onProg, { fullSequential: true }); return { text: ex.text, pageCount: ex.pageCount, semTexto: ex.paginasSemTexto || [], naoLidas: ex.paginasNaoLidas || [] }; } })), config);
  }

  /** Aproveita o texto que o app já extraiu dos PDFs anexados (não lê os arquivos de novo). */
  async iniciarComTextos(pdfs: { nome: string; texto: string; pageCount: number; semTexto?: number[]; naoLidas?: number[] }[], config: ConfigGigante): Promise<string> {
    return this.criar(pdfs.map((p) => ({ nome: p.nome, ler: async () => ({ text: p.texto, pageCount: p.pageCount, semTexto: p.semTexto || [], naoLidas: p.naoLidas || [] }) })), config);
  }

  private async criar(fontes: { nome: string; ler: (onProg: (c: number, t: number) => void) => Promise<{ text: string; pageCount: number; semTexto: number[]; naoLidas: number[] }> }[], config: ConfigGigante): Promise<string> {
    await this.carregar();
    const id = `gig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const job: JobGig = {
      id, nome: fontes.map((f) => f.nome).join(" + ").slice(0, 160), numeroProcesso: config.processNumber && !/extrair/i.test(config.processNumber) ? config.processNumber : undefined, criadoEm: Date.now(), atualizadoEm: Date.now(),
      status: "preparando", etapa: "Lendo os PDFs e montando o índice das páginas…", progresso: { feitas: 0, total: fontes.length },
      arquivos: [], totalPaginas: 0, totalTokensEstimados: 0, lotes: [], fichas: {}, nivelAtual: 0,
      injecao: { verificado: false, caracteres: 0, total: 0, alto: 0, medio: 0, achados: [] },
      triagem: { essenciais: 0, relevantes: 0, dispensaveis: 0, repetidas: 0, omitidas: [], abreviadas: [] }, config,
    };
    await this.gravar(job);
    void this.preparar(job, fontes);
    return id;
  }

  private async preparar(job: JobGig, fontes: { nome: string; ler: (onProg: (c: number, t: number) => void) => Promise<{ text: string; pageCount: number; semTexto: number[]; naoLidas: number[] }> }[]) {
    const id = job.id;
    try {
      let n = 0; const todas: PaginaGig[] = [];
      for (let a = 0; a < fontes.length; a++) {
        job.etapa = `Lendo ${fontes[a].nome} (${a + 1}/${fontes.length})…`; this.avisar();
        const ex = await fontes[a].ler((c, t) => { job.progresso = { feitas: c, total: t }; this.avisar(); });
        const pags = dividirPaginas(ex.text, ex.pageCount);
        job.arquivos.push({ nome: fontes[a].nome, paginas: ex.pageCount || pags.length, semTexto: ex.semTexto, naoLidas: ex.naoLidas });
        const cls = classificarTodas(pags);
        pags.forEach((p, i) => { n++; todas.push({ chave: chavePagina(id, n), jobId: id, n, arquivo: a, pagina: p.pagina, texto: p.texto, tipo: cls[i].tipo, rotuloTipo: cls[i].rotuloTipo }); });
        if (!job.numeroProcesso) { const m = ex.text.slice(0, 20000).match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/); if (m) job.numeroProcesso = m[0]; }
      }
      if (todas.length === 0) throw new Error("Não foi possível extrair texto dos PDFs. Faça o OCR das páginas (leitura por imagem) e envie de novo.");
      job.totalPaginas = todas.length;
      const fisicas = job.arquivos.reduce((n, a) => n + (a.paginas || 0), 0);
      if (Math.max(fisicas, job.totalPaginas) > LIMITE_PAGINAS) throw new Error(`Este processo tem ${Math.max(fisicas, job.totalPaginas)} páginas. Esta versão processa até ${LIMITE_PAGINAS}; acima disso é preciso mais cota (várias chaves ou faturamento) e execução em servidor. Divida os autos em partes menores ou aguarde a próxima fase.`);
      for (let i = 0; i < todas.length; i += 400) await salvarPaginas(todas.slice(i, i + 400));
      const cont = (t: PaginaGig["tipo"]) => todas.filter((p) => p.tipo === t).length;
      job.triagem.essenciais = cont("essencial"); job.triagem.relevantes = cont("relevante"); job.triagem.dispensaveis = cont("dispensavel"); job.triagem.repetidas = cont("repetida");
      job.triagem.omitidas = faixasDe(todas, (p) => (p.tipo === "repetida" ? p.rotuloTipo || "página repetida" : ""));
      job.triagem.abreviadas = faixasDe(todas, (p) => (p.tipo === "dispensavel" ? p.rotuloTipo || "documento sem relevância" : ""));
      job.totalTokensEstimados = Math.round(todas.reduce((s, p) => s + p.texto.length, 0) / CPT);
      const nomes = job.arquivos.map((x) => x.nome), totais = job.arquivos.map((x) => x.paginas);
      job.lotes = montarLotes(todas, nomes, totais);
      job.status = "na_fila"; job.etapa = `Pronto: ${job.totalPaginas} páginas em ${job.lotes.length} lote(s).`; job.progresso = { feitas: 0, total: job.lotes.length };
      await this.gravar(job);
      void this.executar(id);
    } catch (e: any) {
      job.status = "erro"; job.erro = e?.message || String(e); job.etapa = "Falha ao preparar os autos."; await this.gravar(job);
    }
  }

  pausar(id: string) { if (this.rodando.has(id)) this.sinais.set(id, "pausar"); }
  async cancelar(id: string) {
    const j = this.jobs.get(id); if (!j) return;
    if (this.rodando.has(id)) this.sinais.set(id, "cancelar");
    else { j.status = "cancelado"; j.etapa = "Cancelado."; await this.gravar(j); }
  }
  async remover(id: string) { if (this.rodando.has(id)) return; this.jobs.delete(id); this.avisar(); try { await apagarJob(id); } catch { /* ignora */ } }
  async retomar(id: string) { const j = this.jobs.get(id); if (!j || this.rodando.has(id)) return; j.erro = undefined; j.status = "na_fila"; j.etapa = "Retomando…"; await this.gravar(j); void this.executar(id); }

  // ---------- pista própria: espera a pista normal (esteira/usuário) ficar livre e respeita o intervalo entre chamadas ----------
  private async aguardarVez(id: string) {
    const ini = Date.now();
    for (;;) {
      if (this.sinais.has(id)) return;
      const livre = !pistaNormalOcupada() && Date.now() - ultimaAtividadePistaNormal() >= FOLGA_APOS_PISTA_NORMAL_MS;
      const intervaloOk = Date.now() - this.ultimaChamada >= INTERVALO_ENTRE_CHAMADAS_MS;
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

  private async executar(id: string) {
    if (this.rodando.has(id)) return;
    this.rodando.add(id); this.sinais.delete(id);
    const job = this.jobs.get(id) || (await lerJob(id));
    if (!job) { this.rodando.delete(id); return; }
    this.jobs.set(id, job);
    try {
      const nomes = job.arquivos.map((x) => x.nome), totais = job.arquivos.map((x) => x.paginas);
      const contexto = `${job.config.promptTitle || "minuta"} (${job.config.actType || "ato"})${job.numeroProcesso ? ` — processo ${job.numeroProcesso}` : ""}`;
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

  private async encerrarPorSinal(job: JobGig) {
    const s = this.sinais.get(job.id);
    job.status = s === "cancelar" ? "cancelado" : "pausado"; job.etapa = s === "cancelar" ? "Cancelado." : "Pausado: clique em Retomar para continuar.";
    await this.gravar(job);
  }

  private async redigir(job: JobGig, fichas: any[]) {
    const cfg = job.config as ConfigGigante;
    const nomes = job.arquivos.map((x) => x.nome), totais = job.arquivos.map((x) => x.paginas);
    // peças essenciais na íntegra (até um orçamento de caracteres), na ordem do processo
    const todas = await lerPaginas(job.id, 1, job.totalPaginas);
    const ess = todas.filter((p) => p.tipo === "essencial");
    const ORC = 190_000; let usado = 0; const escolhidas: PaginaGig[] = [];
    for (const p of ess) { const t = Math.min(p.texto.length, 6000); if (usado + t > ORC) continue; usado += t; escolhidas.push(p); }
    let dossie = fichas.map((f, i) => `### TRECHO ${f.__rotulo || i + 1}\n${fichaParaTexto(f)}`).join("\n\n");
    const MAX_DOSSIE = 260_000; let dossieAbreviado = false;
    if (dossie.length > MAX_DOSSIE) { dossieAbreviado = true; dossie = dossie.slice(0, Math.floor(MAX_DOSSIE * 0.6)) + "\n\n[… parte do dossiê omitida pelo limite de entrada da IA …]\n\n" + dossie.slice(-Math.floor(MAX_DOSSIE * 0.4)); }
    const processText =
      `[DOSSIÊ DO PROCESSO — os autos têm ${job.totalPaginas} páginas e foram lidos em ${job.lotes.length} lote(s); abaixo estão as fichas estruturadas (cada item cita o arquivo/página) e, em seguida, as peças essenciais na íntegra]\n\n${dossie}` +
      (escolhidas.length ? `\n\n[PEÇAS ESSENCIAIS NA ÍNTEGRA — ${escolhidas.length} página(s)]\n\n` + escolhidas.map((p) => `[Arquivo ${p.arquivo + 1}: ${nomes[p.arquivo] || ""}]\n[Página ${p.pagina} de ${totais[p.arquivo] || p.pagina}]\n${p.texto.slice(0, 6000)}`).join("\n\n") : "");
    let tesesTxt = ""; try { const t: any = await getCabinetTeses(); if (t && t.isEnabled !== false && typeof t.text === "string") tesesTxt = t.text.trim(); } catch { /* sem teses */ }
    const regra = `[PROCESSO GIGANTE LIDO EM LOTES]: o texto fornecido é um DOSSIÊ estruturado (fichas por trecho, com a página de cada item) mais as peças essenciais na íntegra. Redija a minuta com base nele e cite páginas quando útil. NÃO afirme "não há prova", "não foi juntado" ou "a parte não comprovou" só por não constar do dossiê: só registre ausência quando a ficha disser expressamente; no mais, use "não localizei no dossiê dos autos" e indique conferência humana.`;
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
    const info = { paginas: job.totalPaginas, lotes: job.lotes.length, niveis: job.nivelAtual, essenciaisIntegra: escolhidas.length, omitidas: job.triagem.omitidas, abreviadas: job.triagem.abreviadas, dossieAbreviado };
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

export const gerenteGigantes = new Gerente();
export { ALVO_LOTE_CHARS };
