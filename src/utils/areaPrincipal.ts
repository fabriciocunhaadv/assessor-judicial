// Lupa do Magistrado e Mesa de Audiência podem abrir DENTRO do corpo principal do sistema (o <main>), ocupando 100% da largura dele,
// no lugar do formulário de análise, em vez de uma janela flutuante com fundo escurecido. O contêiner continua sendo um "div.fixed" na classe
// (a extensão localiza a Lupa por ele), com position relative por estilo, para ficar no fluxo da página.
import { useEffect, useState } from "react";

export const PREF_JANELA = "assessor_modulos_na_janela_v1";
export const EVENTO_PREF_JANELA = "assessor:modulos-janela";
export const modulosNaJanela = (): boolean => { try { return localStorage.getItem(PREF_JANELA) !== "0"; } catch { return true; } };
export const definirModulosNaJanela = (v: boolean) => {
  try { localStorage.setItem(PREF_JANELA, v ? "1" : "0"); } catch { /* sem storage */ }
  try { window.dispatchEvent(new Event(EVENTO_PREF_JANELA)); } catch { /* sem window */ }
};
const calcula = () => { try { return modulosNaJanela() && window.innerWidth >= 900; } catch { return false; } };

/** true = abrir no corpo principal; false = janela flutuante de sempre (preferência desligada ou tela estreita). */
export function useModoJanela(ativo = true): boolean {
  const [v, setV] = useState<boolean>(calcula);
  useEffect(() => {
    if (!ativo) return;
    const f = () => setV(calcula());
    f(); window.addEventListener("resize", f); window.addEventListener(EVENTO_PREF_JANELA, f);
    return () => { window.removeEventListener("resize", f); window.removeEventListener(EVENTO_PREF_JANELA, f); };
  }, [ativo]);
  return v;
}
