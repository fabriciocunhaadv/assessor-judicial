// MEDIDOR de leitura (envio): soma na memória, grava no máximo a cada 5 minutos em gabinetes/{gabinete}/medidor_leitura/{dia}_{usuário}
// e lê as medições dos últimos dias para o painel do super admin. Melhor esforço: nunca derruba nem atrasa o sistema.
import { collection, doc, getDocs, increment, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { globalTenantId } from "../lib/firestoreUtils";
import { listaDeGabinetes } from "./monitorErros";
import { acumuladorMedidor as acc } from "./medidorColeta";
import type { RegistroMedidor } from "./medidorRegras";

let iniciado = false;
const hoje = () => new Date().toISOString().slice(0, 10);

export async function enviarMedicoes(): Promise<void> {
  try {
    const user = auth.currentUser; if (!user || !acc.temDados()) return;
    const dados = acc.pegar(); acc.limpar();
    const por: Record<string, any> = {};
    for (const [k, v] of Object.entries(dados)) por[k] = { chamadas: increment(v.chamadas), docs: increment(v.docs), bytes: increment(v.bytes) };
    try {
      await setDoc(doc(db, "gabinetes", globalTenantId || "gabinete_default", "medidor_leitura", `${hoje()}_${user.uid}`), {
        data: hoje(), uid: user.uid, email: (user.email || "").toLowerCase(), nome: user.displayName || (user.email || "").split("@")[0] || "Usuário", atualizadoEm: Date.now(), por,
      }, { merge: true });
    } catch { acc.devolver(dados); }
  } catch { /* o medidor nunca derruba o sistema */ }
}

/** Chamar uma vez ao abrir o sistema com o usuário logado. */
export function iniciarMedidor(): void {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  setInterval(() => { void enviarMedicoes(); }, 5 * 60 * 1000);
  try { document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void enviarMedicoes(); }); window.addEventListener("pagehide", () => { void enviarMedicoes(); }); } catch { /* sem eventos */ }
}

export async function listarMedicoes(dias = 7): Promise<RegistroMedidor[]> {
  const limite = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10), out: RegistroMedidor[] = [];
  for (const tid of await listaDeGabinetes()) {
    try { (await getDocs(collection(db, "gabinetes", tid, "medidor_leitura"))).docs.forEach((d) => { const v: any = d.data(); if (v?.data && v.data >= limite) out.push({ data: v.data, uid: v.uid || d.id, email: v.email || "", nome: v.nome || "", por: v.por || {} }); }); } catch { /* sem acesso */ }
  }
  return out;
}
