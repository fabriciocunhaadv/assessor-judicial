import React, { useEffect, useState } from "react";
import { URL_EXTENSAO_CHROME_STORE } from "../config/extensao";

const CHAVE = "assessor_aviso_extensao_fechado_v1";          // "agora não" / "já instalei": só volta a avisar depois de 7 dias
const CHAVE_MARCADA = "assessor_extensao_instalada_v1";       // o usuário marcou "já instalei"
const SETE_DIAS = 7 * 24 * 3600 * 1000;

const fechadoRecentemente = (): boolean => { try { const t = Number(localStorage.getItem(CHAVE) || 0); return t > 0 && Date.now() - t < SETE_DIAS; } catch { return false; } };
const marcadaComoInstalada = (): boolean => { try { return localStorage.getItem(CHAVE_MARCADA) === "1"; } catch { return false; } };
// a extensão só existe no Chrome/Edge do computador; no celular ou em outro navegador a tarja não faz sentido
const navegadorCompativel = (): boolean => {
  try { const ua = navigator.userAgent || ""; return /Chrome\//.test(ua) && !/Android|iPhone|iPad|Mobile/i.test(ua); } catch { return false; }
};
// a extensão se anuncia de duas formas: o atributo data-assessor-extensao (versões novas) e a marca window.__projudiStudioMain (todas as versões)
export const extensaoInstalada = (): string => { try { return document.documentElement.dataset.assessorExtensao || ((window as any).__projudiStudioMain ? "antiga" : ""); } catch { return ""; } };

/** Situação da extensão neste navegador, para o aviso e para o link das Configurações. A extensão se anuncia logo que a página carrega; espera até ~10 s antes de dizer que não a encontrou. */
export function useExtensaoStatus(): "verificando" | "instalada" | "nao_encontrada" {
  const [st, setSt] = useState<"verificando" | "instalada" | "nao_encontrada">(extensaoInstalada() ? "instalada" : "verificando");
  useEffect(() => {
    let n = 0;
    const iv = setInterval(() => {
      if (extensaoInstalada()) { clearInterval(iv); setSt("instalada"); return; }
      if (++n >= 10) { clearInterval(iv); setSt("nao_encontrada"); }
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return st;
}
export { URL_EXTENSAO_CHROME_STORE };

// Tarja no alto da tela quando a extensão NÃO foi encontrada neste navegador. Reaparece a cada 7 dias enquanto a extensão não for encontrada,
// mesmo que o usuário tenha marcado "Já instalei" (marcar só silencia por 7 dias: o sistema confere de verdade).
export function AvisoExtensao() {
  const st = useExtensaoStatus();
  const [escondido, setEscondido] = useState(false);
  const [marcada, setMarcada] = useState(marcadaComoInstalada());
  if (st !== "nao_encontrada" || escondido || !navegadorCompativel() || fechadoRecentemente()) return null;
  const silenciar = () => { try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* sem storage */ } setEscondido(true); };
  const jaInstalei = () => { try { localStorage.setItem(CHAVE_MARCADA, "1"); } catch { /* sem storage */ } setMarcada(true); silenciar(); };
  return (
    <div data-testid="aviso-extensao" className="fixed top-2 left-1/2 -translate-x-1/2 z-[99998] w-[min(96vw,56rem)] bg-amber-50 border-2 border-amber-400 rounded-lg shadow-xl text-amber-950 text-xs font-sans px-3 py-2 flex flex-wrap items-center gap-2 justify-between">
      <span>🧩 {marcada
        ? <><strong>Não encontrei a extensão “Conclusões Projudi” neste navegador</strong>, embora você tenha marcado que já instalou. Ela pode estar desativada em chrome://extensions ou instalada em outro perfil do Chrome.</>
        : <><strong>Instale a extensão “Conclusões Projudi”</strong> neste navegador para baixar processos com OCR e usar a esteira automática de minutas.</>}</span>
      <span className="flex flex-wrap items-center gap-2">
        {URL_EXTENSAO_CHROME_STORE
          ? <a href={URL_EXTENSAO_CHROME_STORE} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-bold hover:bg-amber-700" data-testid="aviso-extensao-instalar">Instalar a extensão</a>
          : <span className="font-semibold">Peça o link de instalação ao administrador do gabinete.</span>}
        <button onClick={jaInstalei} className="px-2 py-1 rounded-md border border-amber-500 bg-white text-amber-900 font-semibold hover:bg-amber-100 cursor-pointer" data-testid="aviso-extensao-ja-instalei">Já instalei</button>
        <button onClick={silenciar} className="px-2 py-1 rounded-md border border-amber-400 text-amber-900 hover:bg-amber-100 cursor-pointer" data-testid="aviso-extensao-depois">Lembrar em 7 dias</button>
      </span>
    </div>
  );
}
