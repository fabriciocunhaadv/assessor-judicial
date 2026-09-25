import React, { useState, useEffect } from "react";
import {
  X,
  Scale,
  Search,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Filter,
  ShieldCheck,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileUp,
  RefreshCw,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import {
  BINDING_SOURCES,
  CORE_BINDING_PRECEDENTS,
  BindingPrecedent,
  searchBindingPrecedents,
  getIsGroundingEnabled,
  setIsGroundingEnabled,
  getCustomBindingPrecedents,
  addCustomBindingPrecedents,
  getLastPrecedentsSync,
  setLastPrecedentsSync,
  getAllBindingPrecedents,
} from "../utils/bindingPrecedents";
import { extractTextFromPdf } from "../utils/pdfExtractor";
import { getApiHeaders } from "../utils/apiKeyManager";

interface BindingPrecedentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin?: boolean;
}

export const BindingPrecedentsModal: React.FC<BindingPrecedentsModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTribunal, setSelectedTribunal] = useState<"ALL" | "STF" | "STJ" | "TNU" | "TJGO" | "CUSTOM">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isGroundingActive, setIsGroundingActive] = useState<boolean>(() => getIsGroundingEnabled());
  const [precedentsVersion, setPrecedentsVersion] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<number>(() => getLastPrecedentsSync());
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false);
  const [pdfUploadStatus, setPdfUploadStatus] = useState<string | null>(null);
  const itemsPerPage = 5;

  // Carregamento e checagem da rotina de sincronização automática semanal (1 vez por semana)
  useEffect(() => {
    if (!isOpen) return;

    // Buscar precedentes customizados do servidor
    fetch("/api/custom-precedents")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.precedents) && data.precedents.length > 0) {
          addCustomBindingPrecedents(data.precedents);
          setPrecedentsVersion((v) => v + 1);
        }
      })
      .catch((err) => console.warn("Não foi possível carregar custom precedents:", err));

    // Rotina semanal: se passou mais de 7 dias da última sincronização, executa automaticamente
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastSync = getLastPrecedentsSync();
    const now = Date.now();

    if (!lastSync || now - lastSync > ONE_WEEK_MS) {
      handleTriggerSync(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTribunal, precedentsVersion]);

  const toggleGrounding = () => {
    if (!isSuperAdmin) return;
    const nextVal = !isGroundingActive;
    setIsGroundingActive(nextVal);
    setIsGroundingEnabled(nextVal);
  };

  const handleTriggerSync = async (isManual = false) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync-precedents-weekly", {
        method: "POST",
        headers: getApiHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const now = Date.now();
        setLastPrecedentsSync(now);
        setLastSyncDate(now);
        if (Array.isArray(data.precedents) && data.precedents.length > 0) {
          addCustomBindingPrecedents(data.precedents);
          setPrecedentsVersion((v) => v + 1);
        }
        if (isManual) {
          setSyncMessage(`✅ Sincronização concluída: ${data.addedCount || 0} novos informativos/súmulas indexados com sucesso!`);
          setTimeout(() => setSyncMessage(null), 5000);
        }
      }
    } catch (err: any) {
      console.error("Erro na sincronização de precedentes:", err);
      if (isManual) {
        setSyncMessage(`❌ Erro ao sincronizar: ${err?.message || "Falha de rede"}`);
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUploadPrecedentPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
    setPdfUploadStatus("Lendo e extraindo conteúdo textual do PDF...");

    try {
      const extracted = await extractTextFromPdf(file);
      if (!extracted || !extracted.text || extracted.text.trim().length < 30) {
        throw new Error("Não foi possível extrair texto legível deste documento em PDF.");
      }

      setPdfUploadStatus("Indexando teses, súmulas e informativos com IA no repositório...");
      const res = await fetch("/api/parse-precedents-pdf", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          pdfText: extracted.text,
          fileName: file.name,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.precedents) && data.precedents.length > 0) {
        addCustomBindingPrecedents(data.precedents);
        setPrecedentsVersion((v) => v + 1);
        setSelectedTribunal("CUSTOM");
        setCurrentPage(1);
        setPdfUploadStatus(`🎉 Sucesso! ${data.count} precedente(s) extraído(s) e indexado(s) a partir de "${file.name}".`);
        setTimeout(() => setPdfUploadStatus(null), 6000);
      } else {
        setPdfUploadStatus(data.message || "Nenhuma tese estruturada identificada no documento.");
        setTimeout(() => setPdfUploadStatus(null), 5000);
      }
    } catch (err: any) {
      setPdfUploadStatus(`❌ Falha na importação: ${err?.message || "Erro desconhecido"}`);
      setTimeout(() => setPdfUploadStatus(null), 6000);
    } finally {
      setIsUploadingPdf(false);
      if (e.target) e.target.value = "";
    }
  };

  if (!isOpen) return null;

  const filteredPrecedents = searchBindingPrecedents(searchQuery, selectedTribunal);
  const totalPages = Math.ceil(filteredPrecedents.length / itemsPerPage) || 1;
  const paginatedPrecedents = filteredPrecedents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCopy = (item: BindingPrecedent) => {
    const textToCopy = `[${item.tribunal} • ${item.number}]: ${item.title}\n"${item.statement}"\n(Fonte Vinculante: ${item.sourceUrl})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[98vh] sm:h-auto max-h-[98vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-900/10 via-slate-900/5 to-amber-900/10 dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Súmulas, Teses e Informativos (STF • STJ • TNU • TJGO)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Alimentação Automática Semanal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Repositório oficial indexado com Tribunais Superiores e Informativos de Jurisprudência do TJGO (transparencia.tjgo.jus.br) com subsunção automática em todas as minutas judiciais.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner on 100% Automated Execution */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200/80 dark:border-emerald-900/50 flex items-center gap-2.5 sm:gap-3">
          <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-[11px] sm:text-xs text-emerald-900 dark:text-emerald-200 leading-snug">
            <strong>Execução 100% Automática:</strong> O backend cruza os fatos dos autos com STF, STJ, TNU e os Informativos de Jurisprudência do TJGO, aplicando as súmulas e teses cabíveis diretamente na minuta com custo zero de busca externa.
          </div>
        </div>

        {/* Grounding ao Vivo Toggle Banner - Somente Super Admin pode ativar */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-[11px] sm:text-xs text-blue-950 dark:text-blue-200 leading-snug">
              <strong>Pesquisa Web ao Vivo (Grounding):</strong> {isSuperAdmin ? (
                "Opção para pesquisar jurisprudência em tempo real na web dos tribunais. Mantenha desativado para máxima economia de créditos."
              ) : (
                "Desativada por padrão para economia de créditos. Apenas o Super Administrador possui permissão para habilitar a busca externa tarifada."
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {!isSuperAdmin && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                <Lock className="w-3 h-3 text-amber-600" />
                Exclusivo Super Admin
              </span>
            )}
            <button
              disabled={!isSuperAdmin}
              onClick={toggleGrounding}
              className={`self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border shrink-0 ${
                !isSuperAdmin
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
                  : isGroundingActive 
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-xs cursor-pointer" 
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              }`}
              title={
                !isSuperAdmin
                  ? "Apenas o Super Admin tem autorização para habilitar a busca na web (Grounding) tarifada pelo Google."
                  : "Ativar ou desativar pesquisa ao vivo de precedentes oficiais na web quando o caso não tiver correspondência prévia"
              }
            >
              <span className={`w-2 h-2 rounded-full ${isGroundingActive ? "bg-white" : "bg-slate-400"}`} />
              <span>{isGroundingActive ? "Grounding Ativo" : "Grounding Desativado"}</span>
            </button>
          </div>
        </div>

        {/* Barra de Ações: Sincronização Semanal Automatizada + Anexar PDF no Repositório */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-slate-50/95 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão de Anexar PDF de Informativo / Súmulas */}
            <label className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-2xs ${
              isUploadingPdf 
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 cursor-pointer active:scale-98"
            }`}>
              {isUploadingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              <span>{isUploadingPdf ? "Extraindo PDF..." : "Anexar PDF de Informativo / Súmula"}</span>
              <input
                type="file"
                accept=".pdf"
                disabled={isUploadingPdf}
                onChange={handleUploadPrecedentPdf}
                className="hidden"
              />
            </label>

            {/* Botão Super Admin: Sincronizar Agora */}
            {isSuperAdmin && (
              <button
                onClick={() => handleTriggerSync(true)}
                disabled={isSyncing}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                  isSyncing 
                    ? "bg-indigo-50 text-indigo-400 border-indigo-200 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600 active:scale-98"
                }`}
                title="Executar rotina de alimentação automática de Súmulas e Informativos do TJGO/STJ/STF a qualquer tempo"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Sincronizando..." : "⚡ Sincronizar Agora"}</span>
                <span className="text-[9px] font-mono uppercase bg-indigo-700/80 px-1 py-0.2 rounded text-indigo-100">Super Admin</span>
              </button>
            )}
          </div>

          {/* Indicador de Rotina Semanal */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <strong>Alimentação semanal:</strong> {lastSyncDate ? `Última em ${new Date(lastSyncDate).toLocaleDateString('pt-BR')} às ${new Date(lastSyncDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : "Automática semanal"}
            </span>
          </div>
        </div>

        {/* Notificação de Status de Importação / Sincronização */}
        {(pdfUploadStatus || syncMessage) && (
          <div className="shrink-0 px-4 sm:px-6 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pdfUploadStatus || syncMessage}</span>
          </div>
        )}

        {/* Portais Oficiais Rápidos */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 whitespace-nowrap min-w-max">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              Bases Oficiais:
            </span>
            {BINDING_SOURCES.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10px] sm:text-[11px] font-medium shadow-2xs transition group ${
                  source.tribunal === "TJGO"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:border-emerald-500"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                }`}
                title={`Acessar repositório oficial de ${source.title}`}
              >
                <span>{source.title}</span>
                <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 group-hover:text-emerald-500" />
              </a>
            ))}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="shrink-0 p-3 sm:p-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar índice (ex: Equatorial, Súmula 25, RMC, IPASGO)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-0.5 shrink-0" />
            {(["ALL", "TJGO", "STF", "STJ", "TNU", "CUSTOM"] as const).map((trib) => (
              <button
                key={trib}
                onClick={() => setSelectedTribunal(trib)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  selectedTribunal === trib
                    ? trib === "TJGO" 
                      ? "bg-emerald-600 text-white shadow-xs" 
                      : trib === "CUSTOM"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {trib === "ALL" ? "Todos os Tribunais" : trib === "TJGO" ? "TJGO (Goiás)" : trib === "CUSTOM" ? "📄 Anexados via PDF" : trib}
              </button>
            ))}
          </div>
        </div>

        {/* Precedents List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {filteredPrecedents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum precedente vinculado encontrado para a busca.</p>
            </div>
          ) : (
            paginatedPrecedents.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-emerald-500/50 transition shadow-2xs group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-800 text-xs font-mono font-bold">
                      {item.number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      item.tribunal === "TJGO"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                        : item.tribunal === "STF" 
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : item.tribunal === "STJ"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    }`}>
                      {item.tribunal}
                    </span>
                    {(item as any).sourceFile && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                        <FileUp className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-xs" title={`Importado do arquivo: ${(item as any).sourceFile}`}>
                          PDF: {(item as any).sourceFile}
                        </span>
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopy(item)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                      title="Copiar texto do enunciado"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar Ementa</span>
                        </>
                      )}
                    </button>

                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
                      title={item.tribunal === "TJGO" ? "Abrir no portal de Jurisprudência e Informativos do TJGO" : "Abrir no site tesesesumulas.com.br"}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-serif bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
                  "{item.statement}"
                </p>

                <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="text-slate-400 font-mono">Tags:</span>
                  {item.tags.map((tag) => (
                    <span key={tag} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                  <span className="ml-auto text-slate-400">
                    Área: <strong className="text-slate-600 dark:text-slate-300">{item.area}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        {filteredPrecedents.length > itemsPerPage && (
          <div className="px-4 sm:px-6 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
            <div className="text-slate-500 text-[11px] sm:text-xs">
              Mostrando <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredPrecedents.length)}</span> de <span className="font-bold text-slate-700 dark:text-slate-300">{filteredPrecedents.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-xs text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Fonte: <strong>tesesesumulas.com.br</strong> (STF, STJ e TNU)
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold hover:opacity-90 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
