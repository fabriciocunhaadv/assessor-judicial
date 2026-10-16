// Tema da interface: "claro" (padrão) ou "escuro" (o visual anterior). A escolha fica neste navegador.
const CHAVE = "assessor_tema";
export type Tema = "claro" | "escuro";

export function lerTema(): Tema {
  try { return localStorage.getItem(CHAVE) === "escuro" ? "escuro" : "claro"; } catch { return "claro"; }
}
export function aplicarTema(t: Tema) {
  const r = document.documentElement;
  r.classList.toggle("tema-claro", t === "claro");
  r.classList.toggle("tema-escuro", t === "escuro");
  r.style.colorScheme = t === "claro" ? "light" : "dark";
}
export function salvarTema(t: Tema) {
  try { localStorage.setItem(CHAVE, t); } catch { /* sem armazenamento: vale só nesta sessão */ }
  aplicarTema(t);
  try { window.dispatchEvent(new CustomEvent("assessor-tema", { detail: t })); } catch { /* ok */ }
}
