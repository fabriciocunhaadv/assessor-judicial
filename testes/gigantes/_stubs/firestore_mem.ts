// Firestore simulado COM memória (só para o teste do Monitor de erros): mesma API do stub básico, mas guarda e lê o que foi gravado.
export * from "./firestore";
import * as base from "./firestore";
const mem: Record<string, any> = ((globalThis as any).__fsMem ||= {});
const caminho = (a: any[]) => a.slice(1).map(String).join("/");
export const collection = (...a: any[]) => ({ _c: true, _path: caminho(a) });
export const doc = (...a: any[]) => ({ _d: true, _id: String(a[a.length - 1] || ""), _path: caminho(a) });
export const increment = (n: number) => ({ __inc: n });
export const arrayUnion = (...v: any[]) => ({ __union: v });
const aplicar = (atual: any, novo: any) => {
  const o = { ...(atual || {}) };
  for (const [k, v] of Object.entries(novo || {})) {
    const x: any = v;
    if (x && typeof x === "object" && "__inc" in x) o[k] = (o[k] || 0) + x.__inc;
    else if (x && typeof x === "object" && "__union" in x) o[k] = [...new Set([...(o[k] || []), ...x.__union])];
    else o[k] = x;
  }
  return o;
};
export const setDoc = async (ref: any, dados: any) => { if (!/error_events|system_snapshots|ops_events/.test(ref._path || "")) return (base as any).setDoc(ref, dados); mem[ref._path] = aplicar(mem[ref._path], dados); };
export const updateDoc = async (ref: any, dados: any) => {
  if (!/error_events/.test(ref._path || "")) return;
  if (!mem[ref._path]) { const e: any = new Error("not-found"); e.code = "not-found"; throw e; }
  mem[ref._path] = aplicar(mem[ref._path], dados);
};
export const getDocs = async (ref: any) => {
  const p = String(ref?._path || "");
  if (!/(error_events|system_snapshots|ops_events)$/.test(p)) return (base as any).getDocs(ref);
  const docs = Object.entries(mem).filter(([k]) => k.startsWith(p + "/")).map(([k, v]) => ({ id: k.split("/").pop(), data: () => v, exists: () => true }));
  return { docs, empty: docs.length === 0, size: docs.length, forEach: (f: any) => docs.forEach(f) };
};
export const deleteDoc = async (ref: any) => {
  if (!/system_snapshots/.test(ref?._path || "")) return (base as any).deleteDoc(ref);
  if ((globalThis as any).__fsFalhaExcluir) { const e: any = new Error("Missing or insufficient permissions."); e.code = "permission-denied"; throw e; }
  delete mem[ref._path];
};
