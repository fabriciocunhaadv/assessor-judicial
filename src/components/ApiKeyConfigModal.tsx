import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Info,
  RefreshCw,
  Trash2,
  Save,
  HelpCircle,
  Award,
  Cloud,
  Smartphone,
  Laptop,
  Lock,
  AlertTriangle,
  Plus,
  ToggleLeft,
  ToggleRight,
  Radio,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import {
  getCustomApiKey,
  getActiveRawCustomKey,
  getAllCustomApiKeys,
  saveAllCustomApiKeys,
  addCustomApiKey,
  deleteCustomApiKeyById,
  setCustomApiKeyActive,
  isCustomApiKeyActive,
  removeCustomApiKey,
  hasAnySavedCustomKey,
  getMaskedApiKey,
  testGeminiApiKey,
  checkUserAiAccess,
} from "../utils/apiKeyManager";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { updateUserNativeKeyAccess, recordKeyRotationEventToDb } from "../lib/firestoreUtils";
import { UserApiKeyItem } from "../types";

interface ApiKeyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  onOpenUserManager?: () => void;
}

export const ApiKeyConfigModal: React.FC<ApiKeyConfigModalProps> = ({
  isOpen,
  onClose,
  initialMessage,
  onOpenUserManager,
}) => {
  const { userProfile, isSuperAdmin, canUseNativeKey } = useAuth();
  const [apiKeyList, setApiKeyList] = useState<UserApiKeyItem[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [isKeyActive, setIsKeyActive] = useState<boolean>(true);
  
  // New Key input form
  const [newKeyInput, setNewKeyInput] = useState<string>("");
  const [newKeyLabel, setNewKeyLabel] = useState<string>("");
  const [showNewKey, setShowNewKey] = useState<boolean>(false);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
    keyId?: string;
  }>({ status: "idle" });
  
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("");
  const [hiddenMessage, setHiddenMessage] = useState<boolean>(false);
  const [isTogglingNative, setIsTogglingNative] = useState<boolean>(false);
  const [nativeKeyInfo, setNativeKeyInfo] = useState<{ configured: boolean; maskedKey: string } | null>(null);

  const fetchNativeKeyInfo = async () => {
    try {
      const res = await fetch("/api/native-key-info");
      if (res.ok) {
        let data: any = {};
        try {
          const resText = await res.text();
          data = JSON.parse(resText);
        } catch (e) {
          console.warn("Parse error");
        }
        setNativeKeyInfo(data);
      }
    } catch (e) {
      console.warn("Erro ao obter info da chave nativa:", e);
    }
  };

  const currentUid = userProfile?.uid || auth.currentUser?.uid;

  const loadCurrentState = () => {
    if (!currentUid) {
      setApiKeyList([]);
      setSelectedKeyId("");
      setIsKeyActive(false);
      return;
    }

    let keys = userProfile?.customApiKeys || [];
    if (!Array.isArray(keys) || keys.length === 0) {
      if (userProfile?.customApiKey && userProfile.customApiKey.length > 10) {
         keys = [{ id: "key_primary", key: userProfile.customApiKey, label: "Chave Principal", createdAt: Date.now() }];
      } else {
         keys = getAllCustomApiKeys(currentUid);
      }
    }
    setApiKeyList(keys);

    let active = userProfile?.isCustomKeyActive;
    if (active === undefined) active = isCustomApiKeyActive(currentUid);
    setIsKeyActive(active);

    if (userProfile?.activeKeyId) {
      setSelectedKeyId(userProfile.activeKeyId);
    } else {
      const activeRaw = userProfile?.customApiKey || getActiveRawCustomKey(currentUid);
      if (activeRaw && keys.length > 0) {
        const match = keys.find((k) => k.key === activeRaw);
        setSelectedKeyId(match ? match.id : keys[0].id);
      } else if (keys.length > 0) {
        setSelectedKeyId(keys[0].id);
      } else {
        setSelectedKeyId("");
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrentState();
      fetchNativeKeyInfo();
      setTestResult({ status: "idle" });
      setSaveSuccess(false);
      setIsAddingNew(false);
      setNewKeyInput("");
      setNewKeyLabel("");
      setHiddenMessage(false);
    }
  }, [isOpen, currentUid]);

  useEffect(() => {
    const handleKeyChange = () => {
      loadCurrentState();
    };
    window.addEventListener("api-key-updated", handleKeyChange);
    window.addEventListener("api-key-rotated", handleKeyChange);
    return () => {
      window.removeEventListener("api-key-updated", handleKeyChange);
      window.removeEventListener("api-key-rotated", handleKeyChange);
    };
  }, [currentUid]);

  if (!isOpen) return null;

  const accessStatus = checkUserAiAccess(userProfile);
  const isBlocked = !accessStatus.canExecute;

  const showNotification = (msg: string) => {
    setSaveSuccessMessage(msg);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleToggleActiveState = () => {
    if (!currentUid) return;
    const next = !isKeyActive;
    setIsKeyActive(next);
    setCustomApiKeyActive(next, currentUid);
    setHiddenMessage(true);
    showNotification(next ? "Chaves pessoais ativadas!" : "Chaves pessoais desativadas temporariamente.");
  };

  const handleSelectActiveKey = (keyItem: UserApiKeyItem) => {
    if (!currentUid) return;
    const oldKey = getCustomApiKey(currentUid);
    setSelectedKeyId(keyItem.id);
    saveAllCustomApiKeys(apiKeyList, keyItem.id, currentUid);
    setHiddenMessage(true);
    showNotification(`Chave ativa alterada para "${keyItem.label}".`);
    
    // Explicitly dispatch event so the UI updates globally across other components
    window.dispatchEvent(new CustomEvent("api-key-updated", { 
      detail: { apiKey: keyItem.key, isActive: isKeyActive, uid: currentUid } 
    }));

    if (oldKey !== keyItem.key) {
      recordKeyRotationEventToDb({
        userId: currentUid,
        userEmail: auth.currentUser?.email || '',
        newKeyLabel: keyItem.label,
        newKeySnippet: `...${keyItem.key.slice(-4)}`,
        reason: 'Alternância manual da chave ativa no painel do usuário'
      }).catch((err) => console.warn("[Key Modal] Falha ao registrar rotação manual:", err));
    }
  };

  const handleAddNewKey = () => {
    if (!currentUid) {
      setTestResult({
        status: "error",
        message: "Faça login com sua conta para salvar suas chaves de API pessoais de forma isolada.",
      });
      return;
    }

    const trimmedKey = newKeyInput.trim();
    if (!trimmedKey) return;

    if (trimmedKey.length < 15) {
      setTestResult({
        status: "error",
        message: "A chave informada parece curta demais. Chaves do Google AI Studio costumam começar com 'AIzaSy' e conter cerca de 39 caracteres.",
      });
      return;
    }

    try {
      const added = addCustomApiKey(trimmedKey, newKeyLabel.trim() || undefined, undefined, currentUid);
      // Se o localStorage estiver cheio, getAllCustomApiKeys lerá a lista antiga. 
      // Por segurança, mesclamos a chave recém-adicionada diretamente no estado atual.
      const updatedList = [added, ...apiKeyList.filter(k => k.id !== added.id)];
      setApiKeyList(updatedList);
      setSelectedKeyId(added.id);
      setIsKeyActive(true);
      setNewKeyInput("");
      setNewKeyLabel("");
      setIsAddingNew(false);
      setHiddenMessage(true);
      showNotification(`Nova chave "${added.label}" adicionada e ativada com sucesso!`);

      recordKeyRotationEventToDb({
        userId: currentUid,
        userEmail: auth.currentUser?.email || '',
        newKeyLabel: added.label,
        newKeySnippet: `...${added.key.slice(-4)}`,
        reason: 'Inclusão de nova chave de API no pool'
      }).catch((err) => console.warn("[Key Modal] Falha ao registrar nova chave:", err));
    } catch (err: any) {
      setTestResult({
        status: "error",
        message: err.message || "Falha ao salvar a nova chave. O armazenamento local (cache) pode estar cheio.",
      });
    }
  };

  const handleDeleteKey = (keyId: string, label: string) => {
    if (!currentUid) return;
    deleteCustomApiKeyById(keyId, currentUid);
    const updatedList = apiKeyList.filter(k => k.id !== keyId);
    setApiKeyList(updatedList);
    if (selectedKeyId === keyId) {
      setSelectedKeyId(updatedList[0]?.id || "");
    }
    showNotification(`Chave "${label}" removida.`);
  };

  const handleClearAllKeys = () => {
    if (!currentUid) return;
    removeCustomApiKey(currentUid);
    setApiKeyList([]);
    setSelectedKeyId("");
    setIsKeyActive(false);
    showNotification("Todas as chaves pessoais foram removidas.");
  };

  const handleTestKey = async (keyString: string, keyId: string) => {
    setTestingId(keyId);
    setTestResult({ status: "idle", keyId });

    const res = await testGeminiApiKey(keyString);
    setTestingId(null);

    if (res.success) {
      setTestResult({
        status: "success",
        keyId,
        message: res.message || "Conexão com a Google Gemini API validada com sucesso!",
      });
    } else {
      setTestResult({
        status: "error",
        keyId,
        message: res.message || "Não foi possível validar a chave. Verifique se a chave está correta no Google AI Studio.",
      });
    }
  };

  const handleToggleMyNativeKey = async () => {
    if (!userProfile?.uid || !isSuperAdmin) return;
    setIsTogglingNative(true);
    try {
      const nextState = !canUseNativeKey;
      await updateUserNativeKeyAccess(userProfile.uid, nextState);
    } catch (err) {
      console.error("Erro ao alternar chave nativa do admin:", err);
    } finally {
      setIsTogglingNative(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const activeKeyItem = apiKeyList.find((k) => k.id === selectedKeyId) || apiKeyList[0];
  const hasKeys = apiKeyList.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[200] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-2xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Gerenciador de Chaves de API Pessoais
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Google Gemini Gratuito
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre múltiplas chaves gratuitas do Google AI Studio, alterne ou desative quando quiser.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Initial alert message if prompted by an action */}
          {initialMessage && !hiddenMessage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold block">Ação Requer Chave de API:</span>
                <span>{initialMessage}</span>
              </div>
            </div>
          )}

          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 transition ${
            canUseNativeKey
              ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200"
              : hasKeys && isKeyActive
              ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
              : isBlocked
              ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200"
              : "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          }`}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {canUseNativeKey ? (
                <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              ) : hasKeys && isKeyActive ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : isBlocked ? (
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    {canUseNativeKey
                      ? "Chave Nativa do Gabinete Ativada (Prioritária)"
                      : hasKeys && isKeyActive
                      ? "Chave Pessoal Ativa e em Uso"
                      : hasKeys && !isKeyActive
                      ? "Chaves Pessoais Cadastradas (Desativadas Temporariamente)"
                      : isBlocked
                      ? "Chave Própria Obrigatória (Chave Nativa Desativada)"
                      : "Chave Nativa do Gabinete Ativa"}
                  </span>
                  {canUseNativeKey ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 font-semibold">
                      <Sparkles className="w-3 h-3" />
                      Sobrepondo chaves pessoais
                    </span>
                  ) : hasKeys ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-semibold">
                      <Cloud className="w-3 h-3" />
                      {apiKeyList.length} {apiKeyList.length === 1 ? "chave salva" : "chaves salvas"}
                    </span>
                  ) : null}
                  {canUseNativeKey && hasKeys && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-semibold">
                      <Key className="w-3 h-3" />
                      {apiKeyList.length} {apiKeyList.length === 1 ? "chave em reserva" : "chaves em reserva"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                  {canUseNativeKey
                    ? "O Super Administrador autorizou o uso da Chave Nativa para sua conta. Todas as minutas e análises de PDFs estão sendo processadas automaticamente pela infraestrutura do servidor (chave corporativa com alta capacidade), sobrepondo o uso das chaves pessoais. Suas chaves cadastradas abaixo permanecem seguras e salvas como contingência/reserva."
                    : hasKeys && isKeyActive
                    ? `O sistema está utilizando a chave "${activeKeyItem?.label || "Principal"}" (${getMaskedApiKey(activeKeyItem?.key)}), sincronizada no seu perfil de usuário.`
                    : hasKeys && !isKeyActive
                    ? "Suas chaves pessoais estão desativadas. O sistema utilizará a chave nativa do servidor (caso liberada para sua conta)."
                    : isBlocked
                    ? "Cadastre sua chave gratuita abaixo para liberar o uso completo das minutas e pesquisas jurídicas."
                    : "Você pode cadastrar e alternar chaves próprias gratuitas quando quiser distribuir requisições ou usar contas separadas."}
                </p>
              </div>
            </div>

            {/* Right side indicator or toggle */}
            {canUseNativeKey ? (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-indigo-600 text-white border border-indigo-700 shadow-2xs">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Nativa Ativa</span>
                </div>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">
                  Em uso prioritário
                </span>
              </div>
            ) : hasKeys && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleActiveState}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer shadow-2xs ${
                    isKeyActive
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                      : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                  }`}
                  title={isKeyActive ? "Clique para desativar sem apagar" : "Clique para ativar"}
                >
                  {isKeyActive ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-white" />
                      <span>Chave Ativada</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-slate-500" />
                      <span>Chave Desativada</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-slate-400">
                  {isKeyActive ? "Ativa nas minutas" : "Em repouso"}
                </span>
              </div>
            )}
          </div>

          {/* Admin Dedicated Toggle Card */}
          {isSuperAdmin && (
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2 flex-wrap">
                    <span>Chave Nativa para Sua Conta (Admin)</span>
                    {nativeKeyInfo?.configured && nativeKeyInfo.maskedKey && (
                      <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 font-semibold" title="Chave configurada no servidor (process.env.GEMINI_API_KEY)">
                        {nativeKeyInfo.maskedKey}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      canUseNativeKey
                        ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                    }`}>
                      {canUseNativeKey ? "Ativada para você" : "Desativada para você"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Como Administrador, você pode alternar a chave nativa do servidor para si e gerenciar a liberação para os demais assessores.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={isTogglingNative}
                  onClick={handleToggleMyNativeKey}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-2xs flex items-center gap-1.5 ${
                    canUseNativeKey
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                  }`}
                >
                  {canUseNativeKey ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isTogglingNative ? "Salvando..." : "Desativar p/ Mim"}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isTogglingNative ? "Salvando..." : "Ativar p/ Mim"}</span>
                    </>
                  )}
                </button>

                {onOpenUserManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUserManager();
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/70 border border-purple-300 dark:border-purple-700 transition cursor-pointer"
                  >
                    Gerenciar Equipe
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of Saved Keys */}
          {hasKeys && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Chaves Cadastradas ({apiKeyList.length})</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(true)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Outra Chave</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllKeys}
                    className="text-[11px] text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar Todas</span>
                  </button>
                </div>
              </div>

              {/* Pool & Auto-Rotation Smart Banner */}
              {apiKeyList.length > 1 && (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                        <span>Pool Inteligente de Rotação Automática Ativo</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-100 font-semibold">
                          {apiKeyList.length} chaves
                        </span>
                      </p>
                      <p className="text-[11px] text-sky-700 dark:text-sky-300">
                        Se a chave ativa atingir a cota gratuita do Google (Erro 429), o sistema transiciona de imediato para a próxima chave sem interromper sua minuta.
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 shrink-0">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Failover 429 Ativo
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {apiKeyList.map((k, idx) => {
                  const isSelected = selectedKeyId === k.id;
                  const isTesting = testingId === k.id;
                  const isSuccess = testResult.keyId === k.id && testResult.status === "success";
                  const isError = testResult.keyId === k.id && testResult.status === "error";

                  // Calculate rotation sequence index
                  const selectedIdx = apiKeyList.findIndex(item => item.id === selectedKeyId);
                  const queuePos = isSelected 
                    ? 0 
                    : (idx > selectedIdx ? idx - selectedIdx : apiKeyList.length - selectedIdx + idx);

                  return (
                    <div
                      key={k.id}
                      className={`p-3 rounded-xl border transition flex flex-col gap-2 ${
                        isSelected
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-400/30"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleSelectActiveKey(k)}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-400 bg-white dark:bg-slate-900"
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {k.label || `Chave ${idx + 1}`}
                              </span>
                              {isSelected ? (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  canUseNativeKey
                                    ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                                    : "bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200"
                                }`}>
                                  {canUseNativeKey ? "Em Reserva (Sobreposta pela Nativa)" : "Ativa (Principal)"}
                                </span>
                              ) : apiKeyList.length > 1 ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700" title={`Reserva ${queuePos} na rotação automática de failover`}>
                                  {queuePos}ª na Fila de Reserva
                                </span>
                              ) : null}
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {getMaskedApiKey(k.key)}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons per key */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isTesting}
                            onClick={() => handleTestKey(k.key, k.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1"
                            title="Testar conexão desta chave"
                          >
                            <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin text-indigo-600" : ""}`} />
                            <span>{isTesting ? "Testando..." : "Testar"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteKey(k.id, k.label)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Remover esta chave"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Individual Test Status */}
                      {isSuccess && (
                        <div className="p-2 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-800 dark:text-emerald-200 text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{testResult.message}</span>
                        </div>
                      )}
                      {isError && (
                        <div className="p-2 bg-rose-100/70 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 rounded-lg text-rose-800 dark:text-rose-200 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{testResult.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Key Form / Input Section */}
          {(!hasKeys || isAddingNew) && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{hasKeys ? "Cadastrar Nova Chave de API:" : "Inserir Chave de API do Google Gemini:"}</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleCopyLink("https://aistudio.google.com/app/apikey")}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <ExternalLink className="w-3 h-3" />}
                  <span>{copiedLink ? "Link copiado!" : "Gerar chave no Google AI Studio"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="Nome da chave (ex: Principal, Reserva...)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2 relative flex items-center">
                  <input
                    type={showNewKey ? "text" : "password"}
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    placeholder="Cole a chave aqui (ex: AIzaSy...)"
                    className="w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewKey(!showNewKey)}
                    className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                    title={showNewKey ? "Ocultar" : "Mostrar"}
                  >
                    {showNewKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {hasKeys && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewKeyInput("");
                      setNewKeyLabel("");
                    }}
                    className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddNewKey}
                  disabled={!newKeyInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5 text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Chave</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold text-xs">{saveSuccessMessage || "Alterações salvas e sincronizadas com sucesso!"}</span>
            </div>
          )}

          {/* Cloud Sync Feature Highlight */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center justify-between gap-3 text-indigo-950 dark:text-indigo-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="text-[11px]">
                <strong className="block font-bold">Sincronização Automática com sua Conta:</strong>
                <span className="text-indigo-800 dark:text-indigo-300">
                  Suas chaves e preferências ficam vinculadas ao seu usuário ({auth.currentUser?.email || "Google"}) e carregam automaticamente em qualquer computador, celular ou tablet.
                </span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-indigo-400 shrink-0">
              <Laptop className="w-4 h-4" />
              <span className="text-[10px]">⇄</span>
              <Smartphone className="w-4 h-4" />
            </div>
          </div>

          {/* Tutorial Step-by-Step */}
          <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Como gerar uma Chave Gratuita em 1 minuto (Sem Cartão de Crédito):
            </h4>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                  1
                </span>
                <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Acesse o <strong>Google AI Studio</strong> no link:{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-mono font-bold underline inline-flex items-center gap-0.5"
                  >
                    aistudio.google.com/app/apikey <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                  2
                </span>
                <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Clique no botão azul <strong>"Create API key"</strong>. Na janela exibida, escolha a opção <strong>"Create API key in new project"</strong> (Criar chave em um novo projeto padrão sem faturamento).
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                  3
                </span>
                <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Copie a chave gerada (iniciada por <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-indigo-600">AIzaSy...</code>), cole no campo acima e salve.
                </div>
              </div>
            </div>
          </div>

          {/* Information regarding Free Tier limits and Unlimited Keys */}
          <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 to-amber-50/80 dark:from-indigo-950/30 dark:to-amber-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl text-slate-800 dark:text-slate-200 text-[11px] space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-300">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Deseja Uso 100% Ilimitado (Sem Limites de Requisições)?</span>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              O <strong>Assessor Judicial não impõe nenhuma limitação de tempo ou de uso</strong> na sua chave. A limitação de <strong>15 requisições por minuto</strong> é uma política da cota gratuita (Free Tier) da Google.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-slate-200/60 dark:border-slate-800">
                <strong className="text-indigo-700 dark:text-indigo-400 block mb-0.5 font-semibold">Opção 1: Chave Ilimitada (Pay-as-you-go)</strong>
                <span>No Google AI Studio, ative o faturamento (Billing/Pay-as-you-go). A sua chave passará a ser <strong>completamente ilimitada</strong>, com milhares de requisições por minuto e sem limite diário de uso.</span>
              </div>
              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-slate-200/60 dark:border-slate-800">
                <strong className="text-amber-700 dark:text-amber-400 block mb-0.5 font-semibold">Opção 2: Múltiplas Chaves Gratuitas</strong>
                <span>Você pode cadastrar 2 ou mais chaves gratuitas de contas Google diferentes aqui no gerenciador. Quando a cota momentânea de uma conta for atingida, basta selecionar a outra com um clique.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chaves sincronizadas com segurança</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

