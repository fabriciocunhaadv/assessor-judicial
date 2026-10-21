// Lupa do Magistrado e Mesa de Audiência podem abrir na JANELA PRINCIPAL (ocupando a área de trabalho, entre o cabeçalho e a barra lateral)
// em vez de uma janela flutuante com fundo escurecido. O contêiner continua sendo um "div.fixed" (a extensão localiza a Lupa por ele).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

export const PREF_JANELA = "assessor_modulos_na_janela_v1";
export const EVENTO_PREF_JANELA = "assessor:modulos-janela";
export const modulosNaJanela = (): boolean => { try { return localStorage.getItem(PREF_JANELA) !== "0"; } catch { return true; } };
export const definirModulosNaJanela = (v: boolean) => {
  try { localStorage.setItem(PREF_JANELA, v ? "1" : "0"); } catch { /* sem storage */ }
  try { window.dispatchEvent(new Event(EVENTO_PREF_JANELA)); } catch { /* sem window */ }
};

/** Posição da área principal (abaixo do cabeçalho, à direita da barra lateral). null = usar a janela flutuante de sempre (preferência desligada ou tela estreita). */
export function useAreaPrincipal(ativo: boolean): CSSProperties | null {
  const [estilo, setEstilo] = useState<CSSProperties | null>(null);
  useEffect(() => {
    if (!ativo) return;
    const calc = () => {
      try {
        if (!modulosNaJanela() || window.innerWidth < 900) { setEstilo((a) => (a === null ? a : null)); return; }
        const cab = document.querySelector("header")?.getBoundingClientRect();
        const lat = document.getElementById("sidebar-principal")?.getBoundingClientRect();
        const top = Math.max(0, Math.round(cab ? cab.bottom : 0)), left = Math.max(0, Math.round(lat ? lat.right : 0));
        setEstilo((a) => (a && a.top === top && a.left === left ? a : { top, left, right: 0, bottom: 0 }));
      } catch { setEstilo(null); }
    };
    calc();
    const iv = setInterval(calc, 400);
    window.addEventListener("resize", calc); window.addEventListener(EVENTO_PREF_JANELA, calc);
    return () => { clearInterval(iv); window.removeEventListener("resize", calc); window.removeEventListener(EVENTO_PREF_JANELA, calc); };
  }, [ativo]);
  return ativo ? estilo : null;
}
