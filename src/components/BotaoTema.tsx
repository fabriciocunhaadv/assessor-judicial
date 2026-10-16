import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { lerTema, salvarTema, Tema } from "../lib/tema";

// Alterna entre o tema claro (padrão) e o escuro (visual anterior). A escolha fica salva neste navegador.
export function BotaoTema({ className = "" }: { className?: string }) {
  const [tema, setTema] = useState<Tema>(lerTema());
  useEffect(() => { const f = (e: Event) => setTema(((e as CustomEvent).detail as Tema) || lerTema()); window.addEventListener("assessor-tema", f); return () => window.removeEventListener("assessor-tema", f); }, []);
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      data-testid="botao-tema"
      onClick={() => salvarTema(escuro ? "claro" : "escuro")}
      title={escuro ? "Voltar ao modo claro" : "Ativar o modo escuro"}
      aria-label={escuro ? "Voltar ao modo claro" : "Ativar o modo escuro"}
      aria-pressed={escuro}
      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 ${className}`}
    >
      {escuro ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
