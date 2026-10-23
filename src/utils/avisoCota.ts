// Aviso de COTA/FATURAMENTO do Firestore: quando o Google bloqueia o banco (cota grátis estourada, cartão recusado), as listas ficam vazias sem explicação.
// Qualquer ponto do sistema que veja esse erro chama `avisarSeCota(erro)`; o banner do App mostra o que fazer. Sem Firebase: função pura.
export const EVENTO_COTA = "assessor-firestore-cota";
export const ehErroDeCota = (e: any): boolean => {
  const t = `${e?.code || ""} ${e?.message || e || ""}`.toLowerCase();
  return /resource-exhausted|quota (limit )?exceeded|quota exceeded|enable billing/.test(t);
};
let _ultimo = 0;
export function avisarSeCota(e: any): boolean {
  try {
    if (!ehErroDeCota(e)) return false;
    _ultimo = Date.now();
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO_COTA, { detail: { quando: _ultimo } }));
    return true;
  } catch { return false; }
}
export const ultimoAvisoDeCota = () => _ultimo;
