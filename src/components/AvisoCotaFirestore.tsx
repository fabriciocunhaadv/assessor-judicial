import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { EVENTO_COTA, ultimoAvisoDeCota } from "../utils/avisoCota";

/** Faixa vermelha quando o Google bloqueou o banco por cota ou faturamento (as telas ficam vazias e isso não é falha do sistema). */
export function AvisoCotaFirestore({ superAdmin }: { superAdmin?: boolean }) {
  const [visivel, setVisivel] = useState(() => Date.now() - ultimoAvisoDeCota() < 10 * 60_000 && ultimoAvisoDeCota() > 0);
  useEffect(() => {
    const aoAvisar = () => setVisivel(true);
    window.addEventListener(EVENTO_COTA, aoAvisar);
    return () => window.removeEventListener(EVENTO_COTA, aoAvisar);
  }, []);
  if (!visivel) return null;
  return (
    <div data-testid="aviso-cota" role="alert" className="fixed top-0 inset-x-0 z-[100001] bg-rose-700 text-white text-xs sm:text-sm px-4 py-2.5 flex items-start gap-2 shadow-lg">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 leading-relaxed">
        <b>O banco de dados está bloqueado pelo Google (cota ou faturamento).</b> Listas e histórico podem aparecer vazios, mas seus dados estão guardados. {superAdmin
          ? <>Abra o <a className="underline font-bold" href="https://console.cloud.google.com/billing" target="_blank" rel="noreferrer">Faturamento do Google Cloud</a>, corrija o cartão e pague o saldo em aberto (o crédito pré-pago do AI Studio é outra coisa e não libera o banco). Depois recarregue com Ctrl+F5.</>
          : <>Avise o administrador do sistema. Quando o pagamento for regularizado, recarregue a página com Ctrl+F5.</>}
      </div>
      <button type="button" onClick={() => setVisivel(false)} className="p-1 rounded hover:bg-rose-800" title="Fechar este aviso"><X className="w-4 h-4" /></button>
    </div>
  );
}
