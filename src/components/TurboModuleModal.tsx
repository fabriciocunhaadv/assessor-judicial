import React, { useState, useRef, useEffect } from "react";
import { useModoJanela } from "../utils/areaPrincipal";
import {
  Zap,
  X,
  Upload,
  FileText,
  Scale,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Trash2,
  Clock,
  AlertCircle,
  FileCheck,
  ArrowRight,
  BookmarkCheck,
  Bot
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getApiHeaders } from "../utils/apiKeyManager";
import { extractTextFromPdf } from "../utils/pdfExtractor";
import { useCoberturaLeitura } from "./useCoberturaLeitura";
import { GiganteDialog, EscolhaGigante } from "./GiganteDialog";
import { fetchRecuperavel } from "../utils/fetchRecuperavel";
import { salvarPendenteModulo, limparPendenteModulo } from "../utils/analisePendente";
import { gerenteGigantes, ConfigGigante } from "../utils/gigantes/gerente";
import { descreverCorte, juntarComoServidor, CorteInfo } from "../utils/corteAutos";

// acima disso o Turbo cortaria o final dos autos: oferece a leitura em lotes (a minuta vai para o Histórico)
const LIMITE_CHARS_TURBO = 1_400_000;
const LIMITE_CHARS_TURBO_LENTO = 400_000;      // acima disto (cerca de 150 a 190 páginas) o Turbo não cabe numa chamada só e pode levar vários minutos: sugere a leitura em lotes
const LIMITE_PAGINAS_TURBO_LENTO = 200;
import { AvisoCoberturaLeitura } from "./AvisoCoberturaLeitura";
import type { GenerationResult, UploadedPdf } from "../types";
import { CustomPrompt, SavedAnalysis } from "../types";
import { saveToHistory } from "../utils/historyDb";
import { auth } from "../lib/firebase";
import { getActiveUnitId, globalTenantId } from "../lib/firestoreUtils";
import { registrarOperacao } from "../utils/monitorOperacao";
import { recordApiExecution } from "../utils/apiUsageTracker";
import ReactMarkdown from "react-markdown";

interface TurboMinute {
  title?: string;
  processNumber?: string;
  author?: string;
  defendant?: string;
  judicialUnit?: string;
  proceduralPhase?: string;
  priorDecisionsSummary?: string;
  pendingMatter?: string;
  relatorio?: string;
  fundamentacao?: string;
  dispositivo?: string;
  fullFormattedText?: string;
  parties?: {
    author: string;
    defendant: string;
  };
}

interface TurboHistoryItem {
  id: string;
  date: string;
  processNumber: string;
  title: string;
  parties: string;
  elapsedSeconds: string;
  userName?: string;
  tenant?: string;
  minute: TurboMinute;
}

interface TurboModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadMinuteToEditor?: (minute: TurboMinute, processNumber?: string, processText?: string, prompt?: CustomPrompt) => void;
  onOpenCopilot?: (minute?: TurboMinute, processNumber?: string, processText?: string) => void;
  onResetTurboProcess?: () => void;
  activeUnitName?: string;
  activeUnitId?: string;
  prompts?: CustomPrompt[];
  activePrompt?: CustomPrompt;
  user?: any;
}

export const TurboModuleModal: React.FC<TurboModuleModalProps> = ({
  isOpen,
  onClose,
  onLoadMinuteToEditor,
  onOpenCopilot,
  onResetTurboProcess,
  activeUnitName,
  activeUnitId,
  prompts = [],
  activePrompt,
  user,
}) => {
  const [inputMode, setInputMode] = useState<"pdf" | "text">("pdf");
  const [pdfFile, setPdfFile] = useState<{ file: File; name: string; size: number; text?: string; pageCount?: number; paginasSemTexto?: number[]; paginasNaoLidas?: number[]; paginasOcr?: number[] } | null>(null);
  const { resolver: resolverCoberturaLeitura, dialog: dialogCobertura } = useCoberturaLeitura();
  const [dlgGigante, setDlgGigante] = useState<{ paginas: number; tokens: number; lento?: boolean; corte: CorteInfo | null; resolver: (e: EscolhaGigante) => void } | null>(null);
  const [resultCobertura, setResultCobertura] = useState<GenerationResult["coberturaLeitura"] | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [actType, setActType] = useState<"auto" | "sentenca" | "decisao" | "despacho">("auto");
  const [directive, setDirective] = useState("");
  
  const [selectedPromptId, setSelectedPromptId] = useState<string>(() => activePrompt?.id || (prompts[0]?.id || ""));

  useEffect(() => {
    if (activePrompt?.id) {
      setSelectedPromptId(activePrompt.id);
    }
  }, [activePrompt?.id]);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) || activePrompt;

  const [isLoading, setIsLoading] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [resultMinute, setResultMinute] = useState<TurboMinute | null>(null);
  const [resultStats, setResultStats] = useState<{ elapsedSeconds: string; modelUsed: string; tokensUsed: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"full" | "relatorio" | "fundamentacao" | "dispositivo">("full");
  const [isCopied, setIsCopied] = useState(false);

  // O histórico do Turbo é separado por GABINETE: cada gabinete só vê as minutas do próprio gabinete (mesmo no mesmo navegador).
  const chaveHistorico = () => `assessor_turbo_history::${globalTenantId || "sem_gabinete"}`;
  const lerHistorico = (): TurboHistoryItem[] => {
    try {
      const chave = chaveHistorico();
      const saved = localStorage.getItem(chave);
      if (saved) return (JSON.parse(saved) as TurboHistoryItem[]).filter((x) => !x.tenant || x.tenant === (globalTenantId || "sem_gabinete"));
      // versão antiga: uma lista única para todos. Sem como saber de qual gabinete era cada minuta, ela é adotada UMA vez pelo primeiro gabinete que abrir o Turbo e some da lista geral.
      const antigo = localStorage.getItem("assessor_turbo_history");
      if (antigo) {
        const lista = (JSON.parse(antigo) as TurboHistoryItem[]).map((x) => ({ ...x, tenant: globalTenantId || "sem_gabinete" }));
        localStorage.setItem(chave, JSON.stringify(lista)); localStorage.removeItem("assessor_turbo_history");
        return lista;
      }
      return [];
    } catch {
      return [];
    }
  };
  const [turboHistory, setTurboHistory] = useState<TurboHistoryItem[]>(lerHistorico);
  // trocou de gabinete (ou de usuário) no mesmo navegador: recarrega a lista do gabinete atual
  useEffect(() => { setTurboHistory(lerHistorico()); setMostrarTodosHistorico(false); }, [globalTenantId, user?.uid, isOpen]);
  const [viewHistoryItem, setViewHistoryItem] = useState<TurboHistoryItem | null>(null);
  const [mostrarTodosHistorico, setMostrarTodosHistorico] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // guarda até 100 (o mais recente primeiro); se o navegador ficar sem espaço, guarda menos
    for (const n of [100, 50, 25, 15]) {
      try { localStorage.setItem(chaveHistorico(), JSON.stringify(turboHistory.slice(0, n))); break; } catch { /* tenta com menos */ }
    }
  }, [turboHistory]);

  // Cronômetro em tempo real
  useEffect(() => {
    if (isLoading) {
      setTimerSeconds(0);
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading]);

  const areaPrincipal = useModoJanela(isOpen);
  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Por favor, selecione um arquivo no formato PDF.");
      return;
    }

    setIsExtractingPdf(true);
    try {
      const extraction = await extractTextFromPdf(file);
      setPdfFile({
        file,
        name: file.name,
        size: file.size,
        text: extraction.text,
        pageCount: extraction.pageCount,
        paginasSemTexto: extraction.paginasSemTexto,
        paginasNaoLidas: extraction.paginasNaoLidas,
      });
      if (extraction.pageCount > 100) {
        toast(`PDF com ${extraction.pageCount} páginas lido. A faixa ideal do Turbo é até 80 a 100 págs. Autos volumosos podem demorar mais. Para processos extensos, recomendamos a Esteira Principal.`, {
          icon: "⚠️",
          duration: 6500,
        });
      } else {
        toast.success(`PDF lido: ${extraction.pageCount} páginas extraídas!`);
      }
    } catch (err: any) {
      console.error("Erro ao extrair PDF no modo turbo:", err);
      toast.error("Não foi possível ler o texto deste PDF. Você pode colar o texto na aba 'Digitar / Colar'.");
    } finally {
      setIsExtractingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Por favor, solte um arquivo PDF.");
      return;
    }

    setIsExtractingPdf(true);
    try {
      const extraction = await extractTextFromPdf(file);
      setPdfFile({
        file,
        name: file.name,
        size: file.size,
        text: extraction.text,
        pageCount: extraction.pageCount,
        paginasSemTexto: extraction.paginasSemTexto,
        paginasNaoLidas: extraction.paginasNaoLidas,
      });
      if (extraction.pageCount > 100) {
        toast(`PDF com ${extraction.pageCount} páginas lido. A faixa ideal do Turbo é até 80 a 100 págs. Para autos muito volumosos, você também pode utilizar a Esteira Principal.`, {
          icon: "⚠️",
          duration: 6500,
        });
      } else {
        toast.success(`PDF lido: ${extraction.pageCount} páginas extraídas!`);
      }
    } catch (err: any) {
      console.error("Erro ao extrair PDF solto:", err);
      toast.error("Falha ao extrair texto do PDF.");
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleExecuteTurbo = async () => {
    const effectiveText = inputMode === "text" ? pastedText.trim() : (pdfFile?.text || "").trim();

    if (!effectiveText || effectiveText.length < 20) {
      toast.error("Forneça o arquivo PDF com texto selecionável ou cole o texto dos autos.");
      return;
    }

    // Processo gigante: acima do limite do Turbo o final dos autos seria cortado; oferece a leitura em lotes (a minuta vai para o Histórico)
    const paginasAutos = inputMode === "pdf" && pdfFile ? (pdfFile.pageCount || 0) : (effectiveText.match(/\[P[áa]gina \d+ de (\d+)\]/)?.[1] ? Number(effectiveText.match(/\[P[áa]gina \d+ de (\d+)\]/)![1]) : 0);
    const muitoGrandeParaTurbo = effectiveText.length > LIMITE_CHARS_TURBO;
    const lentoParaTurbo = !muitoGrandeParaTurbo && (effectiveText.length > LIMITE_CHARS_TURBO_LENTO || paginasAutos > LIMITE_PAGINAS_TURBO_LENTO);
    if (muitoGrandeParaTurbo || (lentoParaTurbo && document.documentElement.dataset.assessorAuto !== "1")) {
      const paginas = paginasAutos;
      const automatico = document.documentElement.dataset.assessorAuto === "1";
      const escolhaG = automatico ? "lotes" : await new Promise<EscolhaGigante>((resolver) => setDlgGigante({ paginas, tokens: Math.round(effectiveText.length / 3.2), lento: lentoParaTurbo, corte: (() => { try { return descreverCorte(juntarComoServidor([{ nome: pdfFile?.name || "texto dos autos", texto: effectiveText, paginas }]), 1_500_000); } catch { return null; } })(), resolver }));
      setDlgGigante(null);
      if (escolhaG === "cancelar") return;
      if (escolhaG === "limpar") { setPdfFile(null); setPastedText(""); toast("Autos removidos. Envie uma versão reduzida (até 3.000 páginas).", { icon: "🗑️", duration: 7000 }); return; }
      if (escolhaG === "lotes" || escolhaG === "partes") {
        const config: ConfigGigante = {
          promptText: selectedPrompt?.promptText || "", promptTitle: selectedPrompt?.title || "Minuta Turbo", promptId: selectedPrompt?.id, promptCategory: selectedPrompt?.category, promptScope: selectedPrompt?.scope,
          actType: actType, unitId: activeUnitId, unitName: activeUnitName, instrucao: directive.trim(), origem: "turbo",
          userUid: user?.uid, userName: user?.displayName || user?.email?.split("@")[0] || "Assessor", userEmail: user?.email || "",
        };
        const dados = [{ nome: pdfFile?.name || "Texto dos autos (colado)", texto: effectiveText, pageCount: paginas, semTexto: pdfFile?.paginasSemTexto, naoLidas: pdfFile?.paginasNaoLidas, arquivo: async () => pdfFile?.file || null }];
        if (escolhaG === "partes") await gerenteGigantes.iniciarPartes(dados, config); else await gerenteGigantes.iniciarComTextos(dados, config);
        window.dispatchEvent(new CustomEvent("gigantes:abrir"));
        toast(escolhaG === "partes" ? "Processo dividido em partes, lidas uma de cada vez em segundo plano. Cada parte gera uma minuta no Histórico." : "Processo gigante enviado para a leitura em lotes, em segundo plano. A minuta irá para o Histórico.", { duration: 9000, icon: "📚" });
        return;
      }
    }

    const inicioOp = Date.now();
    // dados da operação para o Monitor de operação
    const dadosOp = () => ({ modulo: "turbo" as const, unitId: activeUnitId, unitName: activeUnitName, promptTitle: selectedPrompt?.title || "", promptCategory: selectedPrompt?.category || "", promptEhPadraoDaLista: !!prompts?.length && prompts[0]?.id === selectedPrompt?.id, duracaoMs: Date.now() - inicioOp });
    setIsLoading(true);
    setResultMinute(null);
    setResultStats(null);
    setResultCobertura(null);

    // Cobertura da leitura: páginas sem texto (escaneadas/fotos) podem esconder provas; pergunta OCR/leitura visual antes de analisar
    let textoDosAutos = effectiveText;
    let coberturaEnvio: any = null;
    let imagensEnvio: any[] = [];
    if (inputMode === "pdf" && pdfFile) {
      const up: UploadedPdf = { id: "turbo-pdf", name: pdfFile.name, size: pdfFile.size, mimeType: "application/pdf", file: pdfFile.file, extractedText: pdfFile.text || "", pageCount: pdfFile.pageCount, paginasSemTexto: pdfFile.paginasSemTexto, paginasNaoLidas: pdfFile.paginasNaoLidas, paginasOcr: pdfFile.paginasOcr };
      const cob = await resolverCoberturaLeitura([up]);
      if (cob.cancelado) {
        setIsLoading(false);
        return;
      }
      textoDosAutos = (up.extractedText || "").trim() || effectiveText;
      coberturaEnvio = cob.cobertura;
      imagensEnvio = cob.imagens;
      setPdfFile({ ...pdfFile, text: up.extractedText, paginasSemTexto: up.paginasSemTexto, paginasNaoLidas: up.paginasNaoLidas, paginasOcr: up.paginasOcr });
    }

    const progTurbo = (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `t-${Date.now()}`);      // mesmo código em todas as tentativas: o resultado que ficou no servidor é encontrado
    let controller = new AbortController();
    let abortTimeout: any = null;
    const limiteMs = () => (globalThis as any).__turboTimeoutMs ?? 180000; // 3 minutos: passou disso, o processo vai para o segundo plano (leitura em lotes) em vez de deixar a tela presa
    const corpoDaRequisicao = JSON.stringify({
          // Não duplica o texto no body: envia apenas em processText ou no array de pdfFiles
          processText: inputMode === "text" ? effectiveText : "",
          pdfFiles: inputMode === "pdf" && pdfFile ? [{ name: pdfFile.name, extractedText: textoDosAutos, pageCount: pdfFile.pageCount }] : [],
          coberturaLeitura: coberturaEnvio,
          paginasImagens: imagensEnvio,
          actType,
          comarcaVara: activeUnitName || "Comarca de Montes Claros / Vara Única - TJGO",
          specificInstructions: directive.trim(),
          promptTitle: selectedPrompt?.title || "",
          promptText: selectedPrompt?.promptText || "",
          promptCategory: selectedPrompt?.category || "",
        });

    try {
      // Falha de conexão/servidor (rede caiu, servidor reiniciou, resposta cortada): tenta de novo sozinho até 3 vezes, em vez de pedir ao usuário que clique outra vez
      let data: any = {};
      for (let tentativa = 1; ; tentativa++) {
        controller = new AbortController();
        abortTimeout = setTimeout(() => controller.abort(), limiteMs());
        try {
          const response = await fetchRecuperavel("/api/generate-minute-turbo", { method: "POST", headers: getApiHeaders({ "x-progresso-id": progTurbo }), signal: controller.signal, body: corpoDaRequisicao }, { aoSalvarMarcador: (id) => salvarPendenteModulo("turbo", { progId: id, iniciadoEm: Date.now(), uid: user?.uid, tenant: globalTenantId || "sem_gabinete", unitName: activeUnitName, promptTitle: selectedPrompt?.title || "" }) });
          // o servidor responde o cabeçalho logo e mantém a conexão viva enquanto a IA trabalha: o limite de tempo só pode cair DEPOIS de ler o corpo inteiro
          const rawText = await response.text();
          clearTimeout(abortTimeout);
          const corpo = rawText.trim();
          try {
            data = JSON.parse(corpo);
          } catch {
            const e: any = new Error(!corpo
              ? `O servidor interrompeu a conexão antes de entregar a minuta${response.status && response.status !== 200 ? ` (HTTP ${response.status})` : ""}. Pode ter reiniciado ou a rede caiu.`
              : /^</.test(corpo)
                ? `O servidor respondeu com uma página de erro (HTTP ${response.status}) em vez da minuta. Ele pode estar reiniciando.`
                : "A resposta do servidor chegou incompleta (a conexão foi cortada no meio). Tente novamente.");
            e.transitorio = true;
            throw e;
          }
          if (!response.ok || data.error) {
            const e: any = new Error(data.error || `Erro HTTP ${response.status}`);
            e.transitorio = [502, 503, 504].includes(response.status);
            throw e;
          }
          break;
        } catch (err: any) {
          clearTimeout(abortTimeout);
          const transitorio = !!err?.transitorio || (err?.name !== "AbortError" && /Failed to fetch|NetworkError|Load failed|network/i.test(String(err?.message || "")));
          if (!transitorio || tentativa >= 3) throw err;
          toast(`Conexão com o servidor interrompida. Tentando de novo (${tentativa + 1}/3)…`, { icon: "🔄" });
          await new Promise((r) => setTimeout(r, 3000 * tentativa));
        }
      }

      const generated = data.minute as TurboMinute;
      const stats = data.stats;

      setResultMinute(generated);
      setResultStats(stats);
      setResultCobertura(data.coberturaLeitura || null);
      toast.success(`Minuta Turbo gerada em ${stats?.elapsedSeconds || "15"}s! ⚡`);

      // Registra telemetria de consumo de tokens no Painel Super Admin e faturamento
      const totalToks = stats?.tokensUsed || (stats?.promptTokens ? (stats.promptTokens + (stats.candidatesTokens || 0)) : 3500);
      const promptToks = stats?.promptTokens || Math.round(totalToks * 0.75);
      const candToks = stats?.candidatesTokens || Math.round(totalToks * 0.25);
      recordApiExecution({
        label: `Minuta Turbo: ${generated.title || selectedPrompt?.title || "Ato Judicial"}`,
        processNumber: generated.processNumber || "Processo Turbo",
        model: stats?.modelUsed || "Gemini 3.8 Flash (Turbo)",
        promptTokens: promptToks,
        outputTokens: candToks,
        totalTokens: totalToks,
        module: 'turbo',
      }).catch((telemetryErr) => console.warn("[Turbo] Aviso telemetria:", telemetryErr));

      // 1. Salva no Histórico & Dossiês central do sistema (Firestore e cache local)
      try {
        const fullAuditItem: SavedAnalysis = {
          id: `turbo-${Date.now()}`,
          promptTitle: selectedPrompt?.title || "Módulo Turbo",
          promptId: selectedPrompt?.id,
          promptCategory: selectedPrompt?.category || "civel",
          promptScope: selectedPrompt?.scope || "judicial",
          date: Date.now(),
          processNumber: generated.processNumber || "Processo s/ número",
          result: {
            minute: {
              title: generated.title || "SENTENÇA",
              header: `${generated.judicialUnit || activeUnitName || "VARA ÚNICA"}\nPROCESSO Nº ${generated.processNumber || ""}`,
              processNumber: generated.processNumber || "",
              judicialUnit: generated.judicialUnit || activeUnitName || "Vara Única",
              parties: {
                author: generated.parties?.author || generated.author || "Parte Autora",
                defendant: generated.parties?.defendant || generated.defendant || "Parte Ré",
              },
              relatorio: generated.relatorio || "",
              fundamentacao: generated.fundamentacao || "",
              dispositivo: generated.dispositivo || "",
              fullFormattedText: generated.fullFormattedText || "",
              closing: "Publique-se. Registre-se. Intimem-se.",
            },
            auditAnalysis: {
              fatoVsProva: [],
              regularidadeDocumental: {} as any,
              competenciaCheck: {} as any,
              normasAplicadas: [],
              alertasProcessuais: [],
            },
            modelUsed: stats?.modelUsed || "Gemini Flash Turbo",
          },
          processTextContext: effectiveText.substring(0, 3000),
          createdBy: user?.uid || auth.currentUser?.uid || "assessor",
          creatorName: user?.displayName || auth.currentUser?.displayName || (user?.email || auth.currentUser?.email || "").split("@")[0] || "Assessor",
          creatorEmail: user?.email || auth.currentUser?.email || "",
          chatMessages: [],
          unitId: activeUnitId || getActiveUnitId(),
        };
        await saveToHistory(fullAuditItem);
        toast.success("Processo gravado no Histórico & Dossiês! 📁");
      } catch (saveErr) {
        console.warn("Aviso ao salvar no Histórico central:", saveErr);
      }

      // 2. Salva no histórico próprio do turbo
      const historyEntry: TurboHistoryItem = {
        id: `turbo-${Date.now()}`,
        date: new Date().toLocaleString("pt-BR"),
        processNumber: generated.processNumber || "Processo s/ número",
        title: generated.title || "Minuta Turbo",
        parties: `${generated.parties?.author || generated.author || "Parte Autora"} vs ${generated.parties?.defendant || generated.defendant || "Parte Ré"}`,
        elapsedSeconds: stats?.elapsedSeconds || "15",
        tenant: globalTenantId || "sem_gabinete",
        userName: user?.displayName || auth.currentUser?.displayName || (user?.email || auth.currentUser?.email || "").split("@")[0] || "Assessor",
        minute: generated,
      };
      setTurboHistory((prev) => [historyEntry, ...prev.slice(0, 99)]);
      void registrarOperacao({ ...dadosOp(), processo: generated.processNumber, resultado: "ok" });
    } catch (error: any) {
      clearTimeout(abortTimeout);
      console.error("Erro no Módulo Turbo:", error);
      // O Turbo não conseguiu: o processo vai para o segundo plano e é refeito pela análise normal padrão (a minuta vai para o Histórico). Só não vale para erro de chave/acesso/texto vazio.
      const semSaida = /chave|api key|acesso|permiss|n[aã]o autorizad|nenhum texto|forne[cç]a/i.test(String(error?.message || ""));
      if (!semSaida) {
        try {
          const paginasBg = inputMode === "pdf" && pdfFile ? (pdfFile.pageCount || 0) : Math.max(1, Math.ceil(textoDosAutos.length / 3500));
          const config: ConfigGigante = {
            promptText: selectedPrompt?.promptText || "", promptTitle: selectedPrompt?.title || "Minuta Turbo", promptId: selectedPrompt?.id, promptCategory: selectedPrompt?.category, promptScope: selectedPrompt?.scope,
            actType: actType, unitId: activeUnitId, unitName: activeUnitName, instrucao: directive.trim(), origem: "turbo",
            userUid: user?.uid, userName: user?.displayName || user?.email?.split("@")[0] || "Assessor", userEmail: user?.email || "",
          };
          await gerenteGigantes.iniciarComTextos([{ nome: pdfFile?.name || "Texto dos autos (colado)", texto: textoDosAutos, pageCount: paginasBg, semTexto: pdfFile?.paginasSemTexto, naoLidas: pdfFile?.paginasNaoLidas, arquivo: async () => pdfFile?.file || null }], config);
          window.dispatchEvent(new CustomEvent("gigantes:abrir"));
          void registrarOperacao({ ...dadosOp(), processo: (textoDosAutos.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/) || [""])[0], resultado: "segundo_plano", erro: String(error?.message || error) });
          toast(error?.name === "AbortError" ? "O Turbo passou de 3 minutos: este processo foi para o segundo plano e será lido em lotes pela análise normal. A minuta irá para o Histórico (acompanhe pelo selo “Gigantes”)." : "Turbo indisponível agora: este processo foi para o segundo plano e será refeito pela análise normal. A minuta irá para o Histórico.", { icon: "🔁", duration: 12000 });
          setIsLoading(false);
          return;
        } catch (bgErr) { console.warn("Segundo plano do Turbo:", bgErr); }
      }
      void registrarOperacao({ ...dadosOp(), processo: (textoDosAutos.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/) || [""])[0], resultado: "erro", erro: String(error?.message || error) });
      if (error.name === "AbortError") {
        toast.error("O processamento turbo demorou além do limite de 3 minutos. Tente novamente.");
      } else {
        toast.error(error.message || "Erro ao processar minuta turbo.");
      }
    } finally {
      setIsLoading(false);
      limparPendenteModulo("turbo", progTurbo);
    }
  };

  const currentDisplayMinute = viewHistoryItem ? viewHistoryItem.minute : resultMinute;

  const handleCopyMinute = () => {
    if (!currentDisplayMinute) return;
    const textToCopy = currentDisplayMinute.fullFormattedText || (
      `PROCESSO Nº: ${currentDisplayMinute.processNumber || ""}\n` +
      `POLO ATIVO (AUTOR): ${currentDisplayMinute.parties?.author || currentDisplayMinute.author || "Parte Autora"}\n` +
      `POLO PASSIVO (RÉU): ${currentDisplayMinute.parties?.defendant || currentDisplayMinute.defendant || "Parte Ré"}\n` +
      `COMARCA / VARA: ${currentDisplayMinute.judicialUnit || activeUnitName || "Vara Única"}\n\n` +
      `${currentDisplayMinute.title || "ATO JUDICIAL"}\n\n` +
      `I - RELATÓRIO\n\n${currentDisplayMinute.relatorio || ""}\n\n` +
      `II - FUNDAMENTAÇÃO\n\n${currentDisplayMinute.fundamentacao || ""}\n\n` +
      `III - DISPOSITIVO\n\n${currentDisplayMinute.dispositivo || ""}\n\n` +
      `Publique-se. Registre-se. Intimem-se.`
    );
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast.success("Minuta completa copiada para a área de transferência!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!currentDisplayMinute) return;
    const text = currentDisplayMinute.fullFormattedText || "";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Minuta_Turbo_${currentDisplayMinute.processNumber || "Processo"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo baixado!");
  };

  const handleSendToEditor = () => {
    if (!currentDisplayMinute || !onLoadMinuteToEditor) return;
    onLoadMinuteToEditor(
      currentDisplayMinute,
      currentDisplayMinute.processNumber,
      inputMode === "text" ? pastedText : pdfFile?.text,
      selectedPrompt
    );
    toast.success("Minuta carregada no editor principal!");
    onClose();
  };

  const handleOpenCopilotFromTurbo = () => {
    if (!onOpenCopilot) return;
    const minuteToPass = currentDisplayMinute || resultMinute || undefined;
    const processNumberToPass = minuteToPass?.processNumber || (pdfFile?.name ? pdfFile.name.replace(/\.pdf$/i, '') : undefined);
    const textToPass = inputMode === "text" ? pastedText : (pdfFile?.text || "");
    onOpenCopilot(minuteToPass, processNumberToPass, textToPass);
    toast.success("Processo e minuta vinculados ao Copiloto IA! 🤖");
  };

  return (
    <div style={areaPrincipal ? { position: "relative" } : undefined} data-modulo-janela={areaPrincipal ? "turbo" : undefined} className={areaPrincipal ? "fixed flex items-stretch justify-center p-0 bg-slate-950 w-full h-[84vh] rounded-xl border border-slate-800 overflow-hidden" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"}>
      {dialogCobertura}
      {dlgGigante && <GiganteDialog paginas={dlgGigante.paginas} tokens={dlgGigante.tokens} corte={dlgGigante.corte} lento={dlgGigante.lento} onEscolha={dlgGigante.resolver} />}
      <div className={areaPrincipal ? "bg-slate-900 border-0 w-full max-w-none h-full flex flex-col overflow-hidden text-slate-100" : "bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100"}>
        
        {/* TOPO / HEADER DO MÓDULO TURBO */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-amber-950/40 to-slate-950 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-white">Módulo Turbo Independente</h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                  15 a 30s
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  Isolado
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Geração ágil de minutas em etapa única consolidada sem interferir na esteira principal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCopilot && (
              <button
                type="button"
                onClick={handleOpenCopilotFromTurbo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-950/40 border border-indigo-400/40 whitespace-nowrap group hover:scale-[1.02]"
                title="Abrir Agente Copiloto IA de Gabinete com o processo atual"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-100 group-hover:rotate-12 transition-transform" />
                <span>Copiloto IA</span>
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar Módulo Turbo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          
          {/* SE JÁ HOUVER RESULTADO GERADO OU ITEM DE HISTÓRICO SELECIONADO */}
          {currentDisplayMinute ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Barra de sucesso e estatísticas */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{currentDisplayMinute.title || "MINUTA JUDICIAL GERADA"}</span>
                      {resultStats && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                          ⏱️ {resultStats.elapsedSeconds}s
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">
                      Processo: <strong className="text-amber-300 font-mono">{currentDisplayMinute.processNumber || "Identificado"}</strong> • {currentDisplayMinute.parties?.author || currentDisplayMinute.author || "Autor"} vs {currentDisplayMinute.parties?.defendant || currentDisplayMinute.defendant || "Réu"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    onClick={handleCopyMinute}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "Copiado!" : "Copiar"}</span>
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>

                  {onOpenCopilot && (
                    <button
                      onClick={handleOpenCopilotFromTurbo}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-indigo-500/40"
                      title="Consultar Copiloto IA sobre esta minuta"
                    >
                      <Bot className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Copiloto IA</span>
                    </button>
                  )}

                  {onLoadMinuteToEditor && (
                    <button
                      onClick={handleSendToEditor}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-amber-950/40"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir no Editor</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setResultMinute(null);
                      setViewHistoryItem(null);
                      if (onResetTurboProcess) onResetTurboProcess();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs cursor-pointer transition"
                    title="Nova Análise Turbo"
                  >
                    Nova Análise
                  </button>
                </div>
              </div>

              {resultCobertura && !viewHistoryItem && <AvisoCoberturaLeitura info={resultCobertura} />}

              {/* Seletor de abas da minuta gerada */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab("full")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    activeTab === "full" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Minuta Completa
                </button>
                <button
                  onClick={() => setActiveTab("relatorio")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    activeTab === "relatorio" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  I - Relatório
                </button>
                <button
                  onClick={() => setActiveTab("fundamentacao")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    activeTab === "fundamentacao" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  II - Fundamentação
                </button>
                <button
                  onClick={() => setActiveTab("dispositivo")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    activeTab === "dispositivo" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  III - Dispositivo
                </button>
              </div>

              {/* Área de exibição do texto da minuta com formatação rica */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs leading-relaxed max-h-[500px] overflow-y-auto selection:bg-amber-500/30">
                <div className="space-y-3 font-sans text-slate-200 leading-relaxed text-justify">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-base font-black text-amber-300 mt-4 mb-2 pb-1 border-b border-amber-500/30 tracking-wide uppercase" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-amber-200 mt-3 mb-1.5 uppercase tracking-wide" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-amber-300 mt-3 mb-1 uppercase tracking-wider" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-2.5 text-slate-200 leading-relaxed text-justify" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                      em: ({ node, ...props }) => <em className="italic text-amber-200/90 font-serif" {...props} />,
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="my-2.5 pl-3.5 py-1 border-l-2 border-amber-400/80 bg-amber-950/20 rounded-r-lg text-slate-300 italic text-[11px] leading-relaxed" {...props} />
                      ),
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-300" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-300" {...props} />,
                      li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                      hr: ({ node, ...props }) => <hr className="my-3 border-amber-500/20" {...props} />,
                    }}
                  >
                    {(
                      activeTab === "full"
                        ? (currentDisplayMinute.fullFormattedText || "Sem texto compilado.")
                        : activeTab === "relatorio"
                        ? (currentDisplayMinute.relatorio || "Sem relatório.")
                        : activeTab === "fundamentacao"
                        ? (currentDisplayMinute.fundamentacao || "Sem fundamentação.")
                        : (currentDisplayMinute.dispositivo || "Sem dispositivo.")
                    ).replace(/\\n/g, "\n")}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* SELETOR DE PROMPT DE GABINETE (PUXADO DO SISTEMA) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>Prompt Especializado do Gabinete:</span>
                    {selectedPrompt && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                        {selectedPrompt.category ? selectedPrompt.category.toUpperCase() : "GERAL"}
                      </span>
                    )}
                  </label>
                  <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
                    <span>⚡ Diretrizes, teses e estilo vinculados</span>
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedPromptId}
                    onChange={(e) => setSelectedPromptId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-xs text-white focus:outline-hidden focus:border-amber-400 font-medium cursor-pointer"
                  >
                    {(prompts && prompts.length > 0 ? prompts : (activePrompt ? [activePrompt] : [])).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.category ? `• [${p.category.toUpperCase()}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPrompt?.description && (
                  <p className="text-[11px] text-slate-400 italic line-clamp-1">
                    {selectedPrompt.description}
                  </p>
                )}
              </div>

              {/* CONFIGURAÇÃO E EXECUÇÃO DA NOVA ANÁLISE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Escolha do Tipo de Ato */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tipo de Ato:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActType("sentenca")}
                      className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                        actType === "sentenca"
                          ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      ⚖️ Sentença
                    </button>
                    <button
                      type="button"
                      onClick={() => setActType("decisao")}
                      className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                        actType === "decisao"
                          ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      📝 Decisão
                    </button>
                    <button
                      type="button"
                      onClick={() => setActType("despacho")}
                      className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                        actType === "despacho"
                          ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      📄 Despacho
                    </button>
                    <button
                      type="button"
                      onClick={() => setActType("auto")}
                      className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-left ${
                        actType === "auto"
                          ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      🔍 Auto-detectar
                    </button>
                  </div>
                </div>

                {/* 2. Diretriz ou Orientação Rápida */}
                <div className="md:col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Diretriz do Juiz / Assessor (Opcional):</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Ex: Improcedência / Acolher embargos</span>
                  </label>
                  <input
                    type="text"
                    value={directive}
                    onChange={(e) => setDirective(e.target.value)}
                    placeholder="Ex: Julgar improcedente por ausência de prova documental, sem custas (Lei 9.099)..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Seletor de Entrada: PDF vs Texto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => setInputMode("pdf")}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        inputMode === "pdf" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Anexar PDF dos Autos</span>
                    </button>
                    <button
                      onClick={() => setInputMode("text")}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        inputMode === "text" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Digitar / Colar Texto</span>
                    </button>
                  </div>

                  {pdfFile && inputMode === "pdf" && (
                    <button
                      onClick={() => setPdfFile(null)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover PDF</span>
                    </button>
                  )}
                </div>

                {inputMode === "pdf" ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center gap-3 transition cursor-pointer group text-center"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {isExtractingPdf ? (
                      <div className="flex flex-col items-center gap-2 text-amber-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-bold">Extraindo camada de texto do PDF...</span>
                      </div>
                    ) : pdfFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <FileCheck className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{pdfFile.name}</p>
                          <p className="text-xs text-slate-400">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB • {pdfFile.pageCount || 1} página(s) lidas
                          </p>
                        </div>
                        {pdfFile.pageCount && pdfFile.pageCount > 100 ? (
                          <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-500/50 text-[11px] text-amber-200 text-left max-w-md space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Processo Volumoso ({pdfFile.pageCount} páginas)</span>
                            </div>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                              A esteira turbo é calibrada para máxima agilidade em feitos de até 50 a 80 páginas (máx. 100 págs). Em processos com mais de 100 páginas, a análise pode levar mais tempo. Se preferir a esteira com auditoria aprofundada e segmentação de peças, utilize a <strong>Esteira Principal</strong>.
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-full font-semibold">
                            ✓ Pronto para execução turbo (faixa ideal: {pdfFile.pageCount || 1} págs)
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="p-3 rounded-2xl bg-slate-800 text-amber-400 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">Arraste o PDF dos autos ou clique para selecionar</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Suporta autos com petições, defesas ou certidões em formato PDF pesquisável
                          </p>
                          <p className="text-[11px] text-amber-300/90 font-medium mt-1.5">
                            Faixa ideal: até 80 páginas • Para feitos volumosos, use a Esteira Principal
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Cole aqui o teor da petição inicial, contestação, manifestações ou termo de audiência..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
              </div>

              {/* Botão de Disparo Turbo */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteTurbo}
                  disabled={isLoading || isExtractingPdf}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                    isLoading
                      ? "bg-amber-600/50 text-amber-200 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-950/40 hover:scale-[1.01]"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                      <span>Processando no Motor Turbo... ({timerSeconds}s)</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      <span>Executar Análise Turbo (~15 a 30s)</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

              {/* HISTÓRICO RÁPIDO DO TURBO (QUANDO HOUVER) */}
              {turboHistory.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {mostrarTodosHistorico ? `Todas as minutas do Módulo Turbo (${turboHistory.length}):` : "Minutas Recentes no Módulo Turbo:"}
                    </span>
                    {turboHistory.length > 4 && (
                      <button type="button" data-testid="turbo-historico-todos" onClick={() => setMostrarTodosHistorico(v => !v)} className="ml-auto mr-3 text-amber-300 hover:text-amber-200 font-bold cursor-pointer">
                        {mostrarTodosHistorico ? "Mostrar menos" : `Mostrar todos (${turboHistory.length})`}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setTurboHistory([]);
                        localStorage.removeItem(chaveHistorico());
                        toast.success("Histórico do turbo limpo!");
                      }}
                      className="hover:text-rose-400 cursor-pointer"
                    >
                      Limpar histórico
                    </button>
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${mostrarTodosHistorico ? "max-h-[40vh] overflow-y-auto pr-1" : ""}`}>
                    {(mostrarTodosHistorico ? turboHistory : turboHistory.slice(0, 4)).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setViewHistoryItem(item)}
                        className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 truncate font-mono text-[11px]">
                            {item.processNumber}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.parties}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate" data-testid="turbo-historico-quem-quando" title={`${item.userName || "Usuário não registrado"} · ${item.date}`}>
                            {item.userName || "Usuário não registrado"} · {item.date}
                          </p>
                        </div>
                        <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">
                          {item.elapsedSeconds}s ⚡
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
