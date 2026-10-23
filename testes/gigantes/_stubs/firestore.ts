// Índice leve do Histórico (gabinetes/.../history_index) guardado em memória para os testes
const idx: Map<string, any> = ((globalThis as any).__idx ||= new Map());
const ouvintesIdx: Array<() => void> = ((globalThis as any).__idxOuvintes ||= []);
const ehIdx = (p: any) => /\/history_index(\/|$)/.test(String(p || ""));
const docsIdx = () => [...idx.entries()].map(([id, v]) => ({ id, data: () => v })).sort((a: any, b: any) => (b.data().date || 0) - (a.data().date || 0));
const avisarIdx = () => ouvintesIdx.forEach((f) => { try { f(); } catch { /* ouvinte já removido */ } });
const snap = (docs: any[] = []) => ({ exists: () => false, data: () => undefined, id: "x", docs, empty: docs.length === 0, size: docs.length, forEach: (f: any) => docs.forEach(f), docChanges: () => [] });
export const initializeFirestore = (..._a: any[]) => ({});
export const getFirestore = (..._a: any[]) => ({});
export const persistentLocalCache = (..._a: any[]) => ({});
export const persistentMultipleTabManager = (..._a: any[]) => ({});
export const collection = (..._a: any[]) => ({ _c: true, _path: String(_a[1] || "") });
export const collectionGroup = (..._a: any[]) => ({ _c: true });
export const doc = (..._a: any[]) => ({ _d: true, _id: String(_a[_a.length - 1] || ""), _path: _a.slice(1).map(String).join("/") });
export const getDoc = async (..._a: any[]) => { const id = String((_a[0] as any)?._id || ""); const todos = ((globalThis as any).__setDocs || []).filter((d: any) => d.id === id); const ex = id === "history_index_meta" && todos.length ? { dados: Object.assign({}, ...todos.map((d: any) => d.dados)) } : todos[0]; if (ex) return { ...snap(), exists: () => true, data: () => ex.dados, id }; const sd = ((globalThis as any).__seedHistory || []).find((d: any) => d.id === id); return sd ? { ...snap(), exists: () => true, data: () => sd, id } : snap(); };
export const getDocs = async (..._a: any[]) => { const ref: any = _a[0]; const path = String(ref?._path || ""); ((globalThis as any).__getDocsLog ||= []).push(path); if (ehIdx(path)) return snap(docsIdx()); { const w: any = globalThis; const lista = /\/audits$/.test(path) ? w.__seedAudits : /\/hearings$/.test(path) ? w.__seedHearings : null; if (lista) return snap(lista.map((d: any) => ({ id: d.id, data: () => d, ref: { _d: true, _id: d.id, _path: path + "/" + d.id } }))); } const seed = (globalThis as any).__seedHistory || []; return snap(path.endsWith("/history") ? seed.map((d: any) => ({ id: d.id, data: () => d })) : []); };
export const setDoc = async (...a: any[]) => {
  const w: any = globalThis;
  if (ehIdx(a[0]?._path)) { idx.set(a[0]._id, a[1]); (w.__idxWrites ||= []).push(a[0]._id); avisarIdx(); return; }
  if (w.__falharSetDoc) { const e: any = new Error("Simulado: falha ao gravar"); e.code = "resource-exhausted"; throw e; }
  if (w.__gravaSemSalvar) return;      // simula: a nuvem "aceita" mas o ato não fica lá
  (w.__setDocs ||= []).push({ id: a[0]?._id, bytes: new TextEncoder().encode(JSON.stringify(a[1])).length, texto: (a[1]?.processText || "").length, dados: a[1] });
};
export const getCountFromServer = async (..._a: any[]) => { const path = String((_a[0] as any)?._path || ""); ((globalThis as any).__getDocsLog ||= []).push("count:" + path); const n = ehIdx(path) ? idx.size : path.endsWith("/history") ? ((globalThis as any).__seedHistory || []).length : 0; return { data: () => ({ count: n }) }; };
export const addDoc = async (..._a: any[]) => ({ id: "novo" });
export const updateDoc = async (..._a: any[]) => { const r: any = _a[0]; if (ehIdx(r?._path)) { if (!idx.has(r._id)) { const e: any = new Error("not-found"); e.code = "not-found"; throw e; } idx.set(r._id, { ...idx.get(r._id), ..._a[1] }); avisarIdx(); } };
export const deleteDoc = async (..._a: any[]) => { const r: any = _a[0]; { const w: any = globalThis; (w.__deletados ||= []).push(String(r?._path || r?._id || "")); for (const nome of ["__seedAudits", "__seedHearings"]) if (Array.isArray(w[nome]) && /\/(audits|hearings)\//.test(String(r?._path || ""))) w[nome] = w[nome].filter((x: any) => x.id !== r._id); } if (ehIdx(r?._path)) { idx.delete(r._id); avisarIdx(); } };
export const query = (...a: any[]) => a[0];
export const where = (..._a: any[]) => ({});
export const orderBy = (..._a: any[]) => ({});
export const limit = (..._a: any[]) => ({});
export const startAfter = (..._a: any[]) => ({});
export const documentId = () => "id";
export const serverTimestamp = () => Date.now();
export const increment = (n: number) => n;
export const arrayUnion = (...a: any[]) => a;
export const arrayRemove = (...a: any[]) => a;
export const deleteField = () => undefined;
export const writeBatch = (..._a: any[]) => { const ops: any[] = []; return { set(r: any, v: any) { ops.push(["s", r, v]); }, update() {}, delete(r: any) { ops.push(["d", r]); }, commit: async () => { for (const [t, r, v] of ops) if (ehIdx(r?._path)) { if (t === "s") { idx.set(r._id, v); ((globalThis as any).__idxWrites ||= []).push(r._id); } else idx.delete(r._id); } avisarIdx(); } }; };
export const runTransaction = async (_d: any, f: any) => f({ get: async () => snap(), set() {}, update() {}, delete() {} });
export class Timestamp { static now() { return new Timestamp(); } static fromDate(d: Date) { return new Timestamp(); } toMillis() { return Date.now(); } toDate() { return new Date(); } }
export const onSnapshot = (_ref: any, cb: any, _err?: any) => {
  if (ehIdx((_ref as any)?._path)) { const f = () => cb({ ...snap(docsIdx()), docChanges: () => docsIdx().map((doc) => ({ doc })) }); ouvintesIdx.push(f); ((globalThis as any).__idxEscutas = ((globalThis as any).__idxEscutas || 0) + 1); setTimeout(f, 30); return () => { const i = ouvintesIdx.indexOf(f); if (i >= 0) ouvintesIdx.splice(i, 1); }; }
  setTimeout(() => { try { cb(snap([])); } catch {} }, 30); return () => {};
};
