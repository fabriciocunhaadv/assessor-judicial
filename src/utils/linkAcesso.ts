// Endereço de acesso que vai nos convites de novos usuários: o do servidor em que o super admin está (Studio ou servidor reserva).
// Em qualquer outro endereço (pré-visualização, localhost, moldura do AI Studio) usa o endereço principal.
const PRINCIPAL = "https://assessor-judicial.ai.studio";
const ENDERECOS_OFICIAIS = new Set(["assessor-judicial.ai.studio", "judicial.assessor.net.br"]);

export function linkDeAcesso(): string {
  try {
    if (typeof window !== "undefined" && ENDERECOS_OFICIAIS.has(window.location.hostname)) return window.location.origin;
  } catch { /* sem window: usa o principal */ }
  return PRINCIPAL;
}
