// Banco local (IndexedDB) dos processos gigantes: páginas, andamento e fichas ficam no navegador, não na memória.
// Assim o trabalho sobrevive a recarregar a página e pode ser retomado do lote em que parou.
const NOME = "assessor_gigantes_v1";

export interface PaginaGig {
  chave: string;        // `${jobId}|${n}` (n = ordem global no processo)
  jobId: string;
  n: number;            // ordem global
  arquivo: number;      // índice do arquivo
  pagina: number;       // página dentro do arquivo
  texto: string;
  tipo: "essencial" | "relevante" | "dispensavel" | "repetida";
  rotuloTipo?: string;
}

export interface LoteGig {
  i: number;
  de: number;           // n global inicial
  ate: number;          // n global final
  chars: number;
  rotulo: string;
}

export interface JobGig {
  id: string;
  nome: string;
  numeroProcesso?: string;
  criadoEm: number;
  atualizadoEm: number;
  status: "preparando" | "na_fila" | "ocr" | "lendo" | "fundindo" | "redigindo" | "concluido" | "erro" | "pausado" | "cancelado";
  etapa: string;
  progresso: { feitas: number; total: number };
  arquivos: { nome: string; paginas: number; semTexto: number[]; naoLidas: number[]; totalOriginal?: number }[];
  antecessorId?: string;
  totalPaginas: number;
  totalTokensEstimados: number;
  lotes: LoteGig[];
  fichas: Record<string, any>;           // nivel0:i, nivel1:i, ... -> ficha
  nivelAtual: number;
  injecao: { verificado: boolean; caracteres: number; total: number; alto: number; medio: number; achados: any[] };
  triagem: { essenciais: number; relevantes: number; dispensaveis: number; repetidas: number; omitidas: { de: number; ate: number; motivo: string }[]; abreviadas: { de: number; ate: number; motivo: string }[] };
  config: any;                           // prompt, ato, unidade, usuário
  /** OCR por IA das páginas sem texto, feito em lotes antes da leitura */
  ocr?: { total: number; feitas: number; falhas: number; motivo?: string };
  ocrFeito?: boolean;
  ocrIgnorado?: string;
  erro?: string;
  historicoId?: string;
  fim?: number;
}

let abrindo: Promise<IDBDatabase> | null = null;
function abrir(): Promise<IDBDatabase> {
  if (abrindo) return abrindo;
  abrindo = new Promise((ok, falha) => {
    const rq = indexedDB.open(NOME, 1);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains("jobs")) db.createObjectStore("jobs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("paginas")) {
        const st = db.createObjectStore("paginas", { keyPath: "chave" });
        st.createIndex("porJob", "jobId");
      }
    };
    rq.onsuccess = () => ok(rq.result);
    rq.onerror = () => { abrindo = null; falha(rq.error); };
  });
  return abrindo;
}

const pedido = <T,>(rq: IDBRequest<T>): Promise<T> => new Promise((ok, falha) => { rq.onsuccess = () => ok(rq.result); rq.onerror = () => falha(rq.error); });

export async function salvarJob(job: JobGig): Promise<void> {
  const db = await abrir();
  job.atualizadoEm = Date.now();
  await pedido(db.transaction("jobs", "readwrite").objectStore("jobs").put(JSON.parse(JSON.stringify(job))));
}
export async function lerJob(id: string): Promise<JobGig | undefined> {
  const db = await abrir();
  return pedido(db.transaction("jobs").objectStore("jobs").get(id));
}
export async function listarJobs(): Promise<JobGig[]> {
  const db = await abrir();
  const todos: JobGig[] = await pedido(db.transaction("jobs").objectStore("jobs").getAll());
  return todos.sort((a, b) => b.criadoEm - a.criadoEm);
}
export async function apagarJob(id: string): Promise<void> {
  const db = await abrir();
  const tx = db.transaction(["jobs", "paginas"], "readwrite");
  tx.objectStore("jobs").delete(id);
  const st = tx.objectStore("paginas");
  await new Promise<void>((ok, falha) => {
    const rq = st.index("porJob").openKeyCursor(IDBKeyRange.only(id));
    rq.onsuccess = () => { const c = rq.result; if (c) { st.delete(c.primaryKey); c.continue(); } else ok(); };
    rq.onerror = () => falha(rq.error);
  });
  await new Promise<void>((ok, falha) => { tx.oncomplete = () => ok(); tx.onerror = () => falha(tx.error); });
}
export async function salvarPaginas(paginas: PaginaGig[]): Promise<void> {
  const db = await abrir();
  const tx = db.transaction("paginas", "readwrite");
  const st = tx.objectStore("paginas");
  for (const p of paginas) st.put(p);
  await new Promise<void>((ok, falha) => { tx.oncomplete = () => ok(); tx.onerror = () => falha(tx.error); });
}
export async function lerPaginas(jobId: string, de: number, ate: number): Promise<PaginaGig[]> {
  const db = await abrir();
  return pedido(db.transaction("paginas").objectStore("paginas").getAll(IDBKeyRange.bound(`${jobId}|${String(de).padStart(7, "0")}`, `${jobId}|${String(ate).padStart(7, "0")}`)));
}
export const chavePagina = (jobId: string, n: number) => `${jobId}|${String(n).padStart(7, "0")}`;
