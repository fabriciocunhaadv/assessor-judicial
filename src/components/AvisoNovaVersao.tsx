import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { haVersaoNova, acompanharPedidos, acompanharAtividade, pedidosEmAndamento, minutosParado } from "../utils/novaVersao";
import { gerenteGigantes } from "../utils/gigantes/gerente";

const MIN_PARADO_PARA_ATUALIZAR = 30;      // minutos sem mexer na tela
const EM_ANDAMENTO = ["ocr", "lendo", "fundindo", "redigindo", "preparando", "na_fila"];

// Faixa "nova versão disponível": o usuário atualiza quando quiser; se a tela ficar parada por 30 minutos e nada estiver sendo processado, atualiza sozinha.
export function AvisoNovaVersao() {
  const [nova, setNova] = useState(false);
  const [dispensadaAte, setDispensadaAte] = useState(0);

  useEffect(() => {
    acompanharPedidos();
    const parar = acompanharAtividadeSegura();
    let ultimaChecagem = 0, vivo = true;
    const checar = async () => { if (!vivo || Date.now() - ultimaChecagem < 4 * 60_000) return; ultimaChecagem = Date.now(); const n = await haVersaoNova(); if (vivo && n) setNova(true); };
    const t1 = setTimeout(checar, 2 * 60_000);
    const t2 = setInterval(checar, 10 * 60_000);
    const aoVoltar = () => { if (!document.hidden) void checar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { vivo = false; clearTimeout(t1); clearInterval(t2); document.removeEventListener("visibilitychange", aoVoltar); parar(); };
  }, []);

  // atualização automática: só com a tela parada, sem pedido em andamento e sem processo gigante rodando
  useEffect(() => {
    if (!nova) return;
    const t = setInterval(() => {
      let gigante = false; try { gigante = gerenteGigantes.lista().some((j: any) => EM_ANDAMENTO.includes(j.status)); } catch { /* sem gerente */ }
      if (minutosParado() >= MIN_PARADO_PARA_ATUALIZAR && pedidosEmAndamento() === 0 && !gigante) window.location.reload();
    }, 60_000);
    return () => clearInterval(t);
  }, [nova]);

  if (!nova || Date.now() < dispensadaAte) return null;
  return (
    <div role="status" data-testid="aviso-nova-versao" className="fixed top-0 inset-x-0 z-[100] px-3 py-2 bg-amber-100 border-b-2 border-amber-400 text-amber-950 text-xs sm:text-sm font-sans shadow-md flex flex-wrap items-center justify-center gap-2">
      <RefreshCw className="w-4 h-4 text-amber-700 shrink-0" />
      <span><strong>Há uma nova versão do sistema.</strong> Atualize para usar as melhorias e correções (seu trabalho em andamento é guardado).</span>
      <button type="button" data-testid="aviso-nova-versao-atualizar" onClick={() => window.location.reload()} className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">Atualizar agora</button>
      <button type="button" data-testid="aviso-nova-versao-depois" onClick={() => setDispensadaAte(Date.now() + 30 * 60_000)} className="px-3 py-1 rounded-lg bg-white border border-amber-400 text-amber-900 font-bold cursor-pointer">Depois</button>
    </div>
  );
}
const acompanharAtividadeSegura = () => { try { return acompanharAtividade(); } catch { return () => {}; } };
