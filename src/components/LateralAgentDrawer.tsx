import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  Trash2,
  Copy,
  Check,
  Scale,
  FileText,
  HelpCircle,
  ChevronRight,
  Maximize2,
  Minimize2,
  Key,
  ShieldCheck,
  AlertCircle,
  Zap,
  CornerDownLeft,
  ExternalLink,
  BookOpen
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "react-hot-toast";
import { getApiHeaders, hasCustomApiKey, getMaskedApiKey } from "../utils/apiKeyManager";
import { SavedAnalysis } from "../types";
import { getHistory } from "../utils/historyDb";
import { recordApiExecution } from "../utils/apiUsageTracker";

export interface LateralAgentMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  tokensUsed?: number;
  matchedAnalysis?: SavedAnalysis;
}

interface LateralAgentDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  currentProcessNumber?: string;
  caseSummary?: string;
  activeMinuteSnippet?: string;
  isAuditedProcess?: boolean;
  auditScore?: number;
  auditVerdict?: string;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onOpenApiKeyConfig?: () => void;
  onLoadAnalysis?: (analysis: SavedAnalysis) => void;
  onUnlinkProcess?: () => void;
}

const DEFAULT_PROMPT_SUGGESTIONS = [
  {
    mode: "geral",
    title: "Consultar Processo do Gabinete",
    prompt: "Localize o processo 5040160-35.2026.8.09.0166 no histórico e me informe as partes, a vara e o último ato registrado.",
  },
  {
    mode: "geral",
    title: "Requisitos da Tutela de Urgência",
    prompt: "Quais os requisitos do art. 300 do CPC para a concessão da tutela de urgência e qual o posicionamento dominante do STJ quanto ao periculum in mora em pedidos de natureza patrimonial?",
  },
  {
    mode: "geral",
    title: "Aplicação da Taxa Selic",
    prompt: "Como deve ser aplicada a Taxa Selic para juros moratórios e correção monetária nas condenações cíveis após a decisão da Corte Especial do STJ (Tema 1.089 / art. 406 do CC)?",
  },
  {
    mode: "autos",
    title: "Analisar Preliminares dos Autos",
    prompt: "Com base no resumo do caso em tela, quais preliminares ou teses de defesa foram deduzidas e qual o enquadramento processual mais adequado?",
  },
  {
    mode: "autos",
    title: "Sugerir Dispositivo Específico",
    prompt: "Considerando o processo atual, elabore um dispositivo líquido e detalhado resolvendo os pedidos principais com cominação de astreintes e prazo razoável.",
  },
  {
    mode: "redacao",
    title: "Quesitos para Perícia Médica",
    prompt: "Redija um rol padrão de quesitos judiciais para perícia médica ortopédica/neurológica em ação previdenciária de auxílio por incapacidade temporária.",
  },
  {
    mode: "redacao",
    title: "Despacho de Emenda à Inicial",
    prompt: "Elabore um despacho fundamentado determinando a emenda da petição inicial (art. 321 do CPC) para juntada de comprovante idôneo de endereço atualizado e especificação do valor da causa.",
  },
];

export const LateralAgentDrawer: React.FC<LateralAgentDrawerProps> = ({
  isOpen,
  onToggle,
  onClose,
  currentProcessNumber,
  caseSummary,
  activeMinuteSnippet,
  isAuditedProcess,
  auditScore,
  auditVerdict,
  initialQuery,
  onClearInitialQuery,
  onOpenApiKeyConfig,
  onLoadAnalysis,
  onUnlinkProcess,
}) => {
  const [messages, setMessages] = useState<LateralAgentMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("assessor_lateral_agent_messages");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao recuperar mensagens salvas do agente:", e);
      }
    }
    return [
      {
        id: "msg-welcome",
        sender: "assistant",
        text: "Olá, Assessor(a)! Sou seu **Agente Copiloto de Gabinete**. \n\nPosso ajudar com consultas jurídicas rápidas, análise de dispositivos do CPC, sugestão de quesitos para perícias, fundamentação de tutelas e redação de despachos. \n\n*Modo ultra-econômico ativado: consumo mínimo de tokens para preservar suas cotas gratuitas.*",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<"geral" | "autos" | "redacao">("geral");
  const [attachCaseContext, setAttachCaseContext] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastLoadedProcessRef = useRef<string | null>(null);

  // Injeta query inicial caso passada (ex: vinda de clique na Lupa do Magistrado)
  useEffect(() => {
    if (isOpen && initialQuery) {
      setInputText(initialQuery);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      onClearInitialQuery?.();
    }
  }, [isOpen, initialQuery, onClearInitialQuery]);

  // Sincroniza e puxa automaticamente os dados do processo em tela quando abrir o Copiloto
  // Caso o processo tenha sido excluído, limpo ou o usuário esteja em outra página, desacopla cirurgicamente
  useEffect(() => {
    if (isOpen) {
      if (currentProcessNumber) {
        setActiveMode("autos");
        setAttachCaseContext(true);

        if (currentProcessNumber !== lastLoadedProcessRef.current) {
          lastLoadedProcessRef.current = currentProcessNumber;

          const caseInfo = caseSummary ? `\n\n**Resumo dos Autos / Marcha:**\n> ${caseSummary.substring(0, 320).replace(/\n/g, ' ')}...` : "";
          const minuteNotice = activeMinuteSnippet ? `\n\n*Minuta do ato (relatório, fundamentação e dispositivo) vinculada com sucesso ao Copiloto.*` : "";

          const contextMsg: LateralAgentMessage = isAuditedProcess ? {
            id: `msg-case-loaded-${Date.now()}`,
            sender: "assistant",
            text: `🔍⚖️ **Processo Auditado Conectado à Lupa do Magistrado:**\n\n**Processo nº:** \`${currentProcessNumber}\`\n📊 **Veredito da Auditoria:** **${auditScore !== undefined ? `${auditScore}/100` : "Concluída"}** ${auditVerdict ? `(${auditVerdict})` : ""}${caseInfo}${minuteNotice}\n\nO Copiloto já carregou o espelho da auditoria e os autos para dialogar diretamente com o magistrado. Como deseja proceder?\n\n• *Debater as falhas ou incongruências apontadas*\n• *Sanar contradições no relatório ou fundamentação*\n• *Ajustar comandos do dispositivo para adequação ao CPC*\n• *Sugerir fundamentação substitutiva para a minuta*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          } : {
            id: `msg-case-loaded-${Date.now()}`,
            sender: "assistant",
            text: `⚖️ **Processo Conectado aos Autos em Tela:**\n\n**Processo nº:** \`${currentProcessNumber}\`${caseInfo}${minuteNotice}\n\nO Copiloto já puxou os autos no modo **Autos em Tela** e está pronto para consultas do gabinete. Como posso auxiliar com este processo agora?\n\n• *Revisar fundamentação jurídica ou teses*\n• *Sugerir ou ajustar comandos do dispositivo*\n• *Consultar súmulas, legislação e prazos aplicáveis*`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages((prev) => {
            const filtered = prev.filter(m => !m.id.startsWith("msg-case-loaded-"));
            return [...filtered, contextMsg];
          });
        }
      } else {
        // Se NÃO há processo em tela (excluído, limpo ou outra página sem processo aberto)
        lastLoadedProcessRef.current = null;
        setActiveMode((prevMode) => (prevMode === "autos" ? "geral" : prevMode));
        setAttachCaseContext(false);

        // Remove do chat qualquer mensagem automática anterior que anunciava processo conectado
        setMessages((prev) => {
          const hasStaleCaseMsg = prev.some(m => m.id.startsWith("msg-case-loaded-") || m.text.includes("Processo Conectado aos Autos") || m.text.includes("Processo Auditado Conectado"));
          if (hasStaleCaseMsg) {
            return prev.filter(m => !m.id.startsWith("msg-case-loaded-") && !m.text.includes("Processo Conectado aos Autos") && !m.text.includes("Processo Auditado Conectado"));
          }
          return prev;
        });
      }
    }
  }, [isOpen, currentProcessNumber, caseSummary, activeMinuteSnippet, isAuditedProcess, auditScore, auditVerdict]);

  const handleUnlinkProcess = () => {
    lastLoadedProcessRef.current = null;
    setActiveMode("geral");
    setAttachCaseContext(false);
    setMessages((prev) => [
      ...prev.filter(m => !m.id.startsWith("msg-case-loaded-") && !m.text.includes("Processo Conectado aos Autos")),
      {
        id: `msg-unlink-${Date.now()}`,
        sender: "assistant",
        text: "🔓 **Processo Desvinculado do Copiloto:**\nO agente agora está no modo **Geral** (consultas gerais de teses, modelos, súmulas e CPC) sem vínculo com o processo anterior.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ]);
    if (onUnlinkProcess) {
      onUnlinkProcess();
    }
    toast.success("Processo desvinculado do Copiloto!");
  };

  // Salva histórico local
  useEffect(() => {
    try {
      localStorage.setItem("assessor_lateral_agent_messages", JSON.stringify(messages.slice(-20)));
    } catch (e) {
      console.error("Erro ao salvar histórico do agente:", e);
    }
  }, [messages]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Foco no textarea quando abrir
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 250);
    }
  }, [isOpen]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Texto copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    lastLoadedProcessRef.current = null;
    const initialText = currentProcessNumber
      ? `Conversa reiniciada. O processo **${currentProcessNumber}** continua conectado no modo **Autos em Tela**. Como posso auxiliar o gabinete agora?`
      : "Conversa reiniciada. Como posso auxiliar o gabinete agora?";

    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        sender: "assistant",
        text: initialText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    try {
      localStorage.removeItem("assessor_lateral_agent_messages");
    } catch (e) {
      console.warn("Erro ao limpar histórico do storage:", e);
    }
    setIsConfirmingClear(false);
    toast.success("Conversa reiniciada com sucesso!");
  };

  const findMatchingProcessInHistory = async (queryText: string): Promise<SavedAnalysis | null> => {
    try {
      const history = await getHistory();
      if (!history || history.length === 0) return null;

      const cleanedText = queryText.toLowerCase();
      const rawDigits = queryText.replace(/\D/g, "");

      // 1. Busca por sequência numérica / CNJ (se houver 5 ou mais dígitos na busca)
      if (rawDigits.length >= 5) {
        const foundByDigits = history.find((item) => {
          const itemDigits = (item.processNumber || item.result?.minute?.processNumber || "").replace(/\D/g, "");
          if (!itemDigits) return false;
          return itemDigits.includes(rawDigits) || rawDigits.includes(itemDigits);
        });
        if (foundByDigits) return foundByDigits;
      }

      // 2. Busca por padrão CNJ explícito no texto (ex: 5040160-35.2026.8.09.0166)
      const cnjMatch = queryText.match(/\b\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/);
      if (cnjMatch) {
        const cnjDigits = cnjMatch[0].replace(/\D/g, "");
        const found = history.find((item) => {
          const itemDigits = (item.processNumber || item.result?.minute?.processNumber || "").replace(/\D/g, "");
          return itemDigits === cnjDigits;
        });
        if (found) return found;
      }

      // 3. Busca por nomes de partes relevantes (ex: "Marcos Vinicius", "Changai")
      const ignoreWords = new Set(["processo", "autos", "consegue", "consultar", "sobre", "qual", "como", "esta", "gabinete", "sistema", "favor", "verificar"]);
      const queryWords = cleanedText
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !ignoreWords.has(w));

      if (queryWords.length >= 2) {
        const foundByParties = history.find((item) => {
          const author = (item.result?.minute?.parties?.author || "").toLowerCase();
          const def = (item.result?.minute?.parties?.defendant || "").toLowerCase();
          const combined = `${author} ${def}`;
          const matchCount = queryWords.filter((w) => combined.includes(w)).length;
          return matchCount >= 2;
        });
        if (foundByParties) return foundByParties;
      }

      return null;
    } catch (e) {
      console.warn("Erro ao buscar histórico no agente:", e);
      return null;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const userMessage: LateralAgentMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Consulta se a mensagem faz menção a algum processo arquivado no histórico do gabinete
      const matchedItem = await findMatchingProcessInHistory(query);
      let matchedProcessPayload: any = undefined;

      if (matchedItem) {
        const minute = matchedItem.result?.minute;
        matchedProcessPayload = {
          id: matchedItem.id,
          processNumber: matchedItem.processNumber || minute?.processNumber || "Processo sem número",
          author: minute?.parties?.author || "Autor não qualificado",
          defendant: minute?.parties?.defendant || "Réu não qualificado",
          vara: minute?.judicialUnit || (minute as any)?.comarcaVara || minute?.vara || matchedItem.unitId || "Vara Única",
          promptTitle: matchedItem.promptTitle || "Juizado Especial Cível",
          actType: minute?.title || "Ato Judicial",
          date: matchedItem.date ? new Date(matchedItem.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Data recente",
          synopsis: matchedItem.result?.holisticSynopsis || minute?.relatorio || matchedItem.processTextContext?.substring(0, 1500) || "",
          minuteSnippet: (minute?.fundamentacao || minute?.dispositivo || "").substring(0, 1200),
        };
      }

      const response = await fetch("/api/lateral-agent-chat", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          message: query,
          conversationHistory: messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          mode: activeMode,
          processNumber: (attachCaseContext && activeMode === "autos" && currentProcessNumber) ? currentProcessNumber : undefined,
          caseSummary: (attachCaseContext && activeMode === "autos" && currentProcessNumber) ? caseSummary : undefined,
          activeMinuteSnippet: (attachCaseContext && activeMode === "autos" && currentProcessNumber) ? activeMinuteSnippet : undefined,
          matchedProcess: matchedProcessPayload,
          auditDetails: (attachCaseContext && isAuditedProcess) ? {
            processNumber: currentProcessNumber,
            score: auditScore,
            verdict: auditVerdict,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: LateralAgentMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: data.reply || "Resposta processada.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tokensUsed: data.usage?.totalTokenCount,
        matchedAnalysis: matchedItem || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Registra telemetria de consumo do Copiloto no Painel Super Admin
      const totalToks = data.usage?.totalTokenCount || (data.usage?.promptTokenCount ? (data.usage.promptTokenCount + (data.usage.candidatesTokenCount || 0)) : 450);
      const promptToks = data.usage?.promptTokenCount || Math.round(totalToks * 0.7);
      const candToks = data.usage?.candidatesTokenCount || Math.round(totalToks * 0.3);
      recordApiExecution({
        label: `Copiloto IA (${activeMode === "autos" ? "Autos em Tela" : activeMode === "redacao" ? "Redator" : "Geral"})`,
        processNumber: (activeMode === "autos" && currentProcessNumber) ? currentProcessNumber : (matchedItem?.processNumber || "Consulta de Gabinete"),
        model: data.modelUsed || "Gemini Flash (Copiloto)",
        promptTokens: promptToks,
        outputTokens: candToks,
        totalTokens: totalToks,
        module: 'copiloto',
      }).catch((telemetryErr) => console.warn("[Copiloto] Aviso telemetria:", telemetryErr));
    } catch (err: any) {
      console.error("Erro na comunicação com Agente Lateral:", err);
      const errorMessage: LateralAgentMessage = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        text: `⚠️ **Não foi possível obter resposta no momento:**\n${err.message || "Verifique se sua chave da API Gemini está devidamente configurada."}\n\n*Clique no ícone de Chave no topo ou na barra de configurações para validar sua chave gratuita.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error(err.message || "Erro ao consultar Agente Copiloto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredSuggestions = DEFAULT_PROMPT_SUGGESTIONS.filter(
    (s) => s.mode === activeMode || activeMode === "geral"
  );

  return (
    <>
      {/* GAVETA / DRAWER LATERAL DESLIZANTE (ACIONADA PELO BOTÃO NO TOPO AO LADO DE CONFIGURAÇÕES) */}
      {isOpen && (
        <aside
          aria-label="Painel do Agente Copiloto de Gabinete"
          className={`fixed top-0 right-0 h-full ${
            isExpanded ? "w-full md:w-[620px]" : "w-full sm:w-[420px] md:w-[460px]"
          } bg-[#0b111a]/98 border-l border-indigo-500/30 shadow-2xl z-[120] flex flex-col text-slate-100 backdrop-blur-xl animate-in slide-in-from-right duration-300 transition-all`}
        >
          {/* TOPO / HEADER DO AGENTE LATERAL */}
          <div className="p-3.5 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border-b border-indigo-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shrink-0">
                <Bot className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white truncate">Agente Copiloto</h3>
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold font-mono">
                    GABINETE IA
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <span>Consultoria jurídica & redação ágil</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-emerald-400 font-semibold">Gemini 3.1 Flash-Lite</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                title={isExpanded ? "Restaurar largura normal" : "Expandir largura do painel"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {isConfirmingClear ? (
                <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 rounded-lg p-0.5 animate-in fade-in duration-150">
                  <button
                    onClick={handleClearChat}
                    className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition cursor-pointer"
                    title="Confirmar limpeza da conversa"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-clear-lateral-agent"
                  onClick={() => setIsConfirmingClear(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                  title="Limpar histórico da conversa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                id="btn-close-lateral-agent"
                onClick={onClose}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700/80 transition cursor-pointer text-xs font-bold ml-1"
                title="Fechar painel do agente"
              >
                <span>Fechar</span>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BARRA DE COTA & STATUS DE TOKENS (TRANSPARÊNCIA TOTAL) */}
          <div className="px-3.5 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-[11px] gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline">Modo Econômico:</span> ~200 a 600 tokens
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenApiKeyConfig && (
                <button
                  onClick={onOpenApiKeyConfig}
                  className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition font-mono"
                  title="Configurações de Chave Gemini"
                >
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>{hasCustomApiKey() ? "Chave Ativa" : "Chave Gratuita"}</span>
                </button>
              )}
            </div>
          </div>

          {/* SELETOR DE MODALIDADE DE ATUAÇÃO DO AGENTE */}
          <div className="px-3.5 py-2.5 bg-slate-900/60 border-b border-slate-800/80 shrink-0 space-y-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveMode("geral")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMode === "geral"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Geral</span>
              </button>

              <button
                onClick={() => setActiveMode("autos")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMode === "autos"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Autos em Tela</span>
              </button>

              <button
                onClick={() => setActiveMode("redacao")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeMode === "redacao"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Redator</span>
              </button>
            </div>

            {/* VÍNCULO COM O PROCESSO ATUAL (QUANDO DISPONÍVEL) */}
            {currentProcessNumber && (
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] ${
                isAuditedProcess
                  ? "bg-amber-950/40 border border-amber-500/40 text-amber-200"
                  : "bg-indigo-950/30 border border-indigo-500/20 text-slate-300"
              }`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAuditedProcess ? "bg-amber-400" : "bg-indigo-400"} shrink-0 animate-pulse`} />
                  <span className="truncate font-mono text-[10px]">
                    {isAuditedProcess ? `🔍 Lupa: ${currentProcessNumber}` : `Autos: ${currentProcessNumber}`}
                  </span>
                  {isAuditedProcess && auditScore !== undefined && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black font-mono shrink-0">
                      {auditScore}/100
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <label className="flex items-center gap-1 text-[10px] text-indigo-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachCaseContext}
                      onChange={(e) => setAttachCaseContext(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-500 focus:ring-0 w-3 h-3"
                    />
                    <span>Vincular</span>
                  </label>
                  <button
                    onClick={handleUnlinkProcess}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer ml-1 transition"
                    title="Desvincular este processo do Copiloto e voltar ao modo Geral"
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ÁREA DE ROLAGEM DE MENSAGENS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                } group`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs relative ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-xs"
                      : "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-xs"
                  }`}
                >
                  {msg.sender === "assistant" && (
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700/60 text-[10px] text-indigo-300 font-semibold">
                      <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3 text-indigo-400" />
                        Copiloto de Gabinete
                      </span>
                      <div className="flex items-center gap-1">
                        {msg.tokensUsed ? (
                          <span className="text-[9px] text-slate-400 font-mono">
                            {msg.tokensUsed} tokens
                          </span>
                        ) : null}
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="p-1 hover:text-white rounded transition cursor-pointer"
                          title="Copiar texto"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400 hover:text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="prose prose-invert prose-xs max-w-none text-slate-100 font-normal leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>blockquote]:border-l-2 [&>blockquote]:border-indigo-500 [&>blockquote]:pl-2 [&>blockquote]:italic">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {msg.matchedAnalysis && onLoadAnalysis && (
                    <div className="mt-2.5 pt-2 border-t border-indigo-500/30">
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-xs flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-200 truncate">
                            <Scale className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {msg.matchedAnalysis.processNumber || "Processo Localizado"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold text-[9px] font-mono shrink-0">
                            {msg.matchedAnalysis.result?.minute?.title || "Ato Registrado"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 truncate">
                          {msg.matchedAnalysis.result?.minute?.parties?.author || "Autor"} vs {msg.matchedAnalysis.result?.minute?.parties?.defendant || "Réu"}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                          <span className="text-[9px] text-slate-400 font-mono">
                            {msg.matchedAnalysis.date ? new Date(msg.matchedAnalysis.date).toLocaleDateString("pt-BR") : "Data arquivada"}
                          </span>
                          <button
                            onClick={() => {
                              onLoadAnalysis(msg.matchedAnalysis!);
                              toast.success("Processo e minuta carregados no editor!");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Carregar este processo no editor do gabinete"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Carregar nos Autos</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-indigo-300 flex items-center gap-2 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span className="text-slate-300 text-[11px]">Fundamentando resposta com Gemini...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SUGESTÕES RÁPIDAS DE CONSULTA FORENSE */}
          {messages.length <= 4 && (
            <div className="px-3.5 pb-2 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Consultas Frequentes do Gabinete:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {filteredSuggestions.slice(0, 3).map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug.prompt)}
                    disabled={isLoading}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white transition cursor-pointer text-left truncate max-w-full"
                    title={sug.prompt}
                  >
                    {sug.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CAIXA DE ENTRADA / INPUT BAR */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
            <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700/80 rounded-2xl p-2 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 transition shadow-inner">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeMode === "autos"
                    ? "Pergunte sobre os autos, prazos ou preliminares..."
                    : activeMode === "redacao"
                    ? "Peça quesitos, despachos ou parágrafos..."
                    : "Consulte teses, leis, CPC ou estratégias de gabinete..."
                }
                rows={2}
                disabled={isLoading}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 resize-none outline-hidden px-1.5 py-1 max-h-32 leading-relaxed"
              />

              <button
                id="btn-send-lateral-agent-message"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                  inputText.trim() && !isLoading
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                }`}
                title="Enviar (Enter)"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
              <span>Pressione <strong>Enter</strong> para enviar, <strong>Shift+Enter</strong> para linha</span>
              <span className="text-slate-400 font-mono">Direito & CPC</span>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
