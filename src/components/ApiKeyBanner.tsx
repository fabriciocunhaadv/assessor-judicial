import React, { useState, useEffect } from "react";
import {
  Key,
  Sparkles,
  ShieldCheck,
  X,
  ExternalLink,
  ChevronRight,
  Zap,
  Lock,
  AlertTriangle,
} from "lucide-react";
import {
  hasCustomApiKey,
  getMaskedApiKey,
  isApiBannerDismissed,
  setApiBannerDismissed,
  checkUserAiAccess,
} from "../utils/apiKeyManager";
import { useAuth } from "../lib/AuthContext";

interface ApiKeyBannerProps {
  onOpenApiKeyModal?: () => void;
  onOpenConfig?: () => void;
}

export const ApiKeyBanner: React.FC<ApiKeyBannerProps> = ({
  onOpenApiKeyModal,
  onOpenConfig,
}) => {
  const handleOpen = onOpenConfig || onOpenApiKeyModal || (() => {});
  const { userProfile, isAdmin, canUseNativeKey } = useAuth();
  const currentUid = userProfile?.uid;
  const [hasKey, setHasKey] = useState<boolean>(() => hasCustomApiKey(currentUid));
  const [maskedKey, setMaskedKey] = useState<string>(() => getMaskedApiKey(undefined, currentUid));
  const [dismissed, setDismissed] = useState<boolean>(() => isApiBannerDismissed());

  useEffect(() => {
    setHasKey(hasCustomApiKey(currentUid));
    setMaskedKey(getMaskedApiKey(undefined, currentUid));

    const handleKeyUpdated = (e: any) => {
      const targetUid = e?.detail?.uid || currentUid;
      if (!currentUid || targetUid === currentUid) {
        setHasKey(hasCustomApiKey(currentUid));
        setMaskedKey(getMaskedApiKey(undefined, currentUid));
      }
    };
    window.addEventListener("api-key-updated", handleKeyUpdated);
    return () => window.removeEventListener("api-key-updated", handleKeyUpdated);
  }, [currentUid]);

  const accessStatus = checkUserAiAccess(userProfile);
  const isBlocked = !accessStatus.canExecute;

  if (dismissed && !hasKey && !isBlocked) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    setApiBannerDismissed(true);
  };

  return (
    <div
      id="top-api-key-banner"
      className={`w-full border-b text-xs px-3 sm:px-5 py-2 transition-all relative z-20 ${
        isBlocked
          ? "bg-amber-950/90 border-amber-800/80 text-amber-100"
          : "bg-slate-900 border-slate-800 text-slate-200"
      }`}
    >
      <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
              isBlocked
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : canUseNativeKey
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : hasKey
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-purple-500/15 border-purple-500/30 text-purple-400"
            }`}
          >
            {isBlocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : canUseNativeKey ? (
              <Zap className="w-3.5 h-3.5 text-amber-300" />
            ) : hasKey ? (
              <Key className="w-3.5 h-3.5" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="text-[11px] sm:text-xs flex items-center gap-2 flex-wrap min-w-0">
            {canUseNativeKey ? (
              <>
                <span className="font-bold text-indigo-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  Chave Nativa Ativa (Prioritária):
                </span>
                <span className="text-slate-200">
                  Liberada pelo Super Administrador (sobrepondo chaves pessoais). Minutas e análises utilizando a infraestrutura corporativa do gabinete.
                </span>
                {hasKey && (
                  <span className="text-slate-400 hidden md:inline text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Chave pessoal em reserva ({maskedKey})
                  </span>
                )}
              </>
            ) : hasKey ? (
              <>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Chave de API Pessoal Ativa:
                </span>
                <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 font-bold">
                  {maskedKey}
                </span>
                <span className="text-slate-400 hidden md:inline">
                  • Suas minutas e análises utilizam sua cota própria do Google AI Studio.
                </span>
              </>
            ) : isBlocked ? (
              <>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Chave de API Obrigatória:
                </span>
                <span className="text-amber-200">
                  {isAdmin
                    ? "A Chave Nativa está desativada para sua conta. Ative-a no painel de gestão ou insira sua Chave Pessoal do Google AI Studio."
                    : "Para utilizar a IA, insira sua chave gratuita do Google AI Studio ou solicite ao Administrador a liberação da Chave Nativa do Gabinete."}
                </span>
              </>
            ) : (
              <>
                <span className="font-bold text-purple-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Chave Nativa do Gabinete Ativa:
                </span>
                <span className="text-slate-300">
                  Acesso liberado pelo Gabinete. Você também pode conectar sua chave pessoal caso queira.
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={handleOpen}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-2xs flex items-center gap-1 ${
              isBlocked
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : canUseNativeKey
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : hasKey
                ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            <span>
              {isBlocked
                ? "Inserir Minha Chave Agora"
                : canUseNativeKey
                ? "Gerenciar Chaves"
                : hasKey
                ? "Gerenciar / Testar Chave"
                : "Configurar Chave Pessoal"}
            </span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {!isBlocked && !hasKey && (
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              title="Dispensar aviso temporariamente"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
