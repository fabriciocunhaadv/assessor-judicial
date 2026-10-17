const snap = (docs: any[] = []) => ({ exists: () => false, data: () => undefined, id: "x", docs, empty: docs.length === 0, size: docs.length, forEach: (f: any) => docs.forEach(f), docChanges: () => [] });
export const initializeFirestore = (..._a: any[]) => ({});
export const getFirestore = (..._a: any[]) => ({});
export const persistentLocalCache = (..._a: any[]) => ({});
export const persistentMultipleTabManager = (..._a: any[]) => ({});
export const collection = (..._a: any[]) => ({ _c: true, _path: String(_a[1] || "") });
export const collectionGroup = (..._a: any[]) => ({ _c: true });
export const doc = (..._a: any[]) => ({ _d: true, _id: String(_a[_a.length - 1] || "") });
export const getDoc = async (..._a: any[]) => snap();
export const getDocs = async (..._a: any[]) => { const ref: any = _a[0]; const path = String(ref?._path || ""); const seed = (globalThis as any).__seedHistory || []; return snap(path.endsWith("/history") ? seed.map((d: any) => ({ id: d.id, data: () => d })) : []); };
export const setDoc = async (...a: any[]) => {
  const w: any = globalThis;
  if (w.__falharSetDoc) { const e: any = new Error("Simulado: falha ao gravar"); e.code = "resource-exhausted"; throw e; }
  (w.__setDocs ||= []).push({ id: a[0]?._id, bytes: new TextEncoder().encode(JSON.stringify(a[1])).length, texto: (a[1]?.processText || "").length });
};
export const addDoc = async (..._a: any[]) => ({ id: "novo" });
export const updateDoc = async (..._a: any[]) => {};
export const deleteDoc = async (..._a: any[]) => {};
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
export const writeBatch = (..._a: any[]) => ({ set() {}, update() {}, delete() {}, commit: async () => {} });
export const runTransaction = async (_d: any, f: any) => f({ get: async () => snap(), set() {}, update() {}, delete() {} });
export class Timestamp { static now() { return new Timestamp(); } static fromDate(d: Date) { return new Timestamp(); } toMillis() { return Date.now(); } toDate() { return new Date(); } }
export const onSnapshot = (_ref: any, cb: any, _err?: any) => { setTimeout(() => { try { cb(snap([])); } catch {} }, 30); return () => {}; };
