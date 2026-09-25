import React, { useEffect, useState } from "react";
import { SystemBroadcast } from "../types";
import { subscribeToSystemBroadcast, saveGlobalSaaSBroadcast } from "../lib/firestoreUtils";
import { AlertTriangle, Info, Bell, ShieldCheck, RefreshCw, X, CheckCircle2, Clock, Check } from "lucide-react";
import { saveSessionDraft } from "../utils/sessionDraft";

interface SystemBroadcastBannerProps {
  onManualSaveDraft?: () => void;
  isDraftSaved?: boolean;
}

const DISMISSED_BROADCASTS_KEY = "agaia_dismissed_broadcasts";

function getStoredDismissedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_BROADCASTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function storeDismissedKey(key: string) {
  try {
    const set = getStoredDismissedKeys();
    set.add(key);
    // Keep last 50 entries
    const list = Array.from(set).slice(-50);
    localStorage.setItem(DISMISSED_BROADCASTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not save dismissed broadcast key to localStorage:", e);
  }
}

export const SystemBroadcastBanner: React.FC<SystemBroadcastBannerProps> = ({
  onManualSaveDraft,
  isDraftSaved = true,
}) => {
  const [broadcast, setBroadcast] = useState<SystemBroadcast | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => getStoredDismissedKeys());
  const [savedLocally, setSavedLocally] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  const [isConcluding, setIsConcluding] = useState(false);

  // Subscribe to real-time broadcasts
  useEffect(() => {
    const unsubscribe = subscribeToSystemBroadcast((bc) => {
      setBroadcast(bc);
    });
    return () => unsubscribe();
  }, []);

  // Update ticker every 1 second to calculate 2-minute auto-expiry countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!broadcast || !broadcast.active) {
    return null;
  }

  // Calculate expiration time (from expiresAt if present, otherwise no expiration)
  const expirationTime = broadcast.expiresAt || 0;

  // Check if expired
  if (expirationTime > 0 && now >= expirationTime) {
    return null;
  }

  // Unique identifier for this broadcast
  const broadcastKey = broadcast.id || `${broadcast.type}-${broadcast.createdAt}-${broadcast.message.slice(0, 30)}`;

  // If user closed/dismissed it previously, do not show again across refreshes/republications
  if (dismissedKeys.has(broadcastKey)) {
    return null;
  }

  const remainingSeconds = expirationTime ? Math.max(0, Math.ceil((expirationTime - now) / 1000)) : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedCountdown = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  const handleDismiss = () => {
    storeDismissedKey(broadcastKey);
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(broadcastKey);
      return next;
    });
  };

  const handleConcluirAtualizacao = async () => {
    setIsConcluding(true);
    try {
      const updated: SystemBroadcast = {
        message: "",
        type: "info",
        active: false,
        createdAt: Date.now()
      };
      await saveGlobalSaaSBroadcast(updated);
      setBroadcast(null);
    } catch (err) {
      console.warn("Could not conclude broadcast update via banner:", err);
      // Ensure UI local dismissal at least
      setBroadcast(null);
    } finally {
      setIsConcluding(false);
    }
  };

  const handleSaveNow = () => {
    if (onManualSaveDraft) {
      onManualSaveDraft();
    }
    setSavedLocally(true);
    setTimeout(() => setSavedLocally(false), 3000);
  };

  const getColors = () => {
    switch (broadcast.type) {
      case "update":
        return "bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white border-amber-800";
      case "maintenance":
        return "bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white border-red-900";
      case "warning":
        return "bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 text-white border-amber-800";
      case "info":
      default:
        return "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-800";
    }
  };

  const getIcon = () => {
    switch (broadcast.type) {
      case "update":
      case "maintenance":
      case "warning":
        return <AlertTriangle className="w-5 h-5 animate-pulse text-amber-200 shrink-0" />;
      case "info":
      default:
        return <Bell className="w-5 h-5 text-blue-200 shrink-0" />;
    }
  };

  return (
    <div className={`w-full py-2.5 px-4 ${getColors()} shadow-lg border-b text-xs transition-all sticky top-0 z-[140] animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {getIcon()}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold uppercase tracking-wider text-[11px] bg-black/25 px-2 py-0.5 rounded">
                {broadcast.type === "update"
                  ? "Aviso de Atualização em Tempo Real"
                  : broadcast.type === "maintenance"
                  ? (broadcast.message.includes("Modo de Atualização") ? "⚠️ Modo de Atualização • Instabilidade Temporária" : "Manutenção Programada")
                  : broadcast.type === "warning"
                  ? "Alerta do Sistema"
                  : "Comunicado aos Usuários"}
              </span>
              {broadcast.createdByName && (
                <span className="text-[10px] opacity-85">Por: {broadcast.createdByName}</span>
              )}
              {remainingSeconds > 0 && remainingSeconds <= 120 && (
                <span className="text-[10px] bg-black/30 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1" title="Tempo restante até este alerta expirar automaticamente">
                  <Clock className="w-3 h-3" />
                  <span>Expira em {formattedCountdown}</span>
                </span>
              )}
            </div>
            <p className="font-semibold text-xs mt-0.5 leading-snug break-words">{broadcast.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] bg-white/15 px-2 py-1 rounded backdrop-blur-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
            <span>Salvamento automático ativo (nenhum dado é perdido)</span>
          </div>

          <button
            onClick={handleSaveNow}
            className="px-2.5 py-1 bg-white text-slate-900 font-bold rounded hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-[11px] cursor-pointer"
          >
            {savedLocally ? <CheckCircle2 className="w-3 h-3 text-slate-900" /> : <RefreshCw className="w-3 h-3 text-slate-700" />}
            <span>{savedLocally ? "Rascunho Protegido!" : "Garantir Salvamento"}</span>
          </button>

          {(broadcast.type === "maintenance" || broadcast.type === "update" || broadcast.message.includes("Atualização")) && (
            <button
              onClick={handleConcluirAtualizacao}
              disabled={isConcluding}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded transition shadow-sm flex items-center gap-1 text-[11px] cursor-pointer border border-emerald-300"
              title="Finalizar modo de atualização e liberar o sistema para todos os gabinetes"
            >
              <Check className="w-3 h-3" />
              <span>{isConcluding ? "Concluindo..." : "Concluir Atualização"}</span>
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/20 rounded-lg transition text-white/90 hover:text-white cursor-pointer flex items-center gap-1 font-bold text-[11px]"
            title="Fechar e não exibir novamente"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
