import React, { useEffect, useState } from "react";
import { URL_EXTENSAO_CHROME_STORE } from "../config/extensao";

const CHAVE = "assessor_aviso_extensao_fechado_v1";
const SETE_DIAS = 7 * 24 * 3600 * 1000;

const fechadoRecentemente = (): boolean => { try { const t = Number(localStorage.getItem(CHAVE) || 0); return t > 0 && Date.now() - t < SETE_DIAS; } catch { return false; } };
// a extensão só existe no Chrome/Edge do computador; no celular ou em outro navegador a tarja não faz sentido
const navegadorCompativel = (): boolean => {
  try { const ua = navigator.userAgent || ""; return /Chrome\//.test(ua) && !/Android|iPhone|iPad|Mobile/i.test(ua); } catch { return false; }
};
// a extensão se anuncia de duas formas: o atributo data-assessor-extensao (versões novas) e a marca window.__projudiStudioMain (todas as versões)
export const extensaoInstalada = (): string => { try { return document.documentElement.dataset.assessorExtensao || ((window as any).__projudiStudioMain ? "antiga" : ""); } catch { return ""; } };

// Tarja flutuante no alto da tela, só quando a extensão NÃO está instalada neste navegador (a extensão se anuncia no atributo data-assessor-extensao).
export function AvisoExtensao() {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    if (!navegadorCompativel() || fechadoRecentemente()) return;
    let n = 0;
    const iv = setInterval(() => {      // a extensão se anuncia logo que a página termina de carregar; espera até ~10 s antes de concluir que não está instalada
      if (extensaoInstalada()) { clearInterval(iv); setMostrar(false); return; }
      if (++n >= 10) { clearInterval(iv); setMostrar(true); }
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  if (!mostrar) return null;
  const fechar = () => { try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* sem storage */ } setMostrar(false); };
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[99998] w-[min(96vw,56rem)] bg-amber-50 border-2 border-amber-400 rounded-lg shadow-xl text-amber-950 text-xs font-sans px-3 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1" data-testid="aviso-extensao" role="status">
      <span>🧩 <strong>Instale a extensão “Conclusões Projudi”</strong> neste navegador para baixar processos com OCR e usar a esteira automática de minutas.</span>
      {URL_EXTENSAO_CHROME_STORE
        ? <a href={URL_EXTENSAO_CHROME_STORE} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-bold hover:bg-amber-700" data-testid="aviso-extensao-instalar">Instalar pela Chrome Web Store</a>
        : <span className="font-semibold">Peça o link de instalação ao administrador do gabinete.</span>}
      <button onClick={fechar} className="px-2 py-1 rounded-md border border-amber-400 text-amber-900 hover:bg-amber-100 cursor-pointer" data-testid="aviso-extensao-depois">Agora não</button>
    </div>
  );
}
