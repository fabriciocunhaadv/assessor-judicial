import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  FileText, 
  Settings, 
  Library, 
  Search, 
  Loader2, 
  Sparkles, 
  X, 
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Key,
  ShieldCheck,
  Zap,
  Scale,
} from 'lucide-react';
import { hasCustomApiKey, getMaskedApiKey } from '../utils/apiKeyManager';
import { useAuth } from '../lib/AuthContext';
import { Server, Users } from 'lucide-react';

interface FloatingGuideProps {
  isLoading: boolean;
  loadingStep: string;
  auditStatus?: string;
  pdfCount: number;
  activeModal: 'history' | 'teses' | 'prompts' | 'projudi' | 'precedents' | 'manual' | 'none';
  hasResult: boolean;
  isVisible?: boolean;
  onClose?: () => void;
  onOpenApiKeyConfig?: () => void;
  onOpenSuperAdmin?: () => void;
  onOpenUserManager?: () => void;
  onOpenPetitionPanel?: () => void;
}

export const FloatingGuide: React.FC<FloatingGuideProps> = ({
  isLoading,
  loadingStep,
  auditStatus = 'idle',
  pdfCount,
  activeModal,
  hasResult,
  isVisible = true,
  onClose,
  onOpenApiKeyConfig,
  onOpenSuperAdmin,
  onOpenUserManager,
  onOpenPetitionPanel,
}) => {
  // Lateral drawer state: recolhido por padrão no início ou conforme preferência salva
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('assessor_floating_guide_open');
      if (saved !== null) {
        return saved === 'true';
      }
      // Por padrão em telas grandes (desktop ultrawide >= 1600px) pode iniciar aberto, mas em notebooks e telas comuns (< 1600px) fica recolhido
      return window.innerWidth >= 1600;
    }
    return false;
  });

  const handleToggleOpen = (newVal: boolean) => {
    setIsOpen(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('assessor_floating_guide_open', String(newVal));
    }
  };
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => hasCustomApiKey());
  const { isSuperAdmin, isAdmin } = useAuth();

  useEffect(() => {
    const updateApiKey = () => {
      setHasApiKey(hasCustomApiKey());
    };
    updateApiKey();
    window.addEventListener('api-key-updated', updateApiKey);
    return () => {
      window.removeEventListener('api-key-updated', updateApiKey);
    };
  }, []);

  if (!isVisible) return null;

  let title = "Como iniciar uma análise";
  let icon = <Play className="w-4 h-4 text-emerald-400" />;
  let steps: { title: string; desc: React.ReactNode; icon?: React.ReactNode }[] = [];
  let statusBadge = <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">GUIA RÁPIDO</span>;
  let tabLabel = "Como Iniciar";

  // 1. Loading State
  if (isLoading) {
    title = "Processando Análise";
    icon = <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    statusBadge = <span className="bg-blue-950/80 text-blue-300 border border-blue-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">EM ANDAMENTO</span>;
    tabLabel = "Processando...";
    steps = [
      {
        title: "Leitura e Extração dos Autos",
        desc: "O assistente está analisando as peças processuais e extraindo os fatos essenciais.",
      },
      {
        title: "Status Atual",
        desc: (
          <span className="text-blue-300 font-medium text-xs bg-blue-950/50 p-2 rounded border border-blue-800/60 block">
            {loadingStep || "Iniciando processamento com IA..."}
          </span>
        ),
      },
      {
        title: "Aguarde a Minuta",
        desc: "Em processos volumosos, isso pode levar alguns segundos para garantir precisão e segurança jurídica.",
      }
    ];
  } 
  // 2. Auditing State
  else if (auditStatus === 'auditing') {
    title = "Auditoria Anti-Alucinação";
    icon = <Search className="w-4 h-4 text-indigo-400 animate-pulse" />;
    statusBadge = <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">AUDITANDO</span>;
    tabLabel = "Auditoria";
    steps = [
      {
        title: "Checagem de Jurisprudência",
        desc: "A IA está cruzando todas as súmulas e precedentes citados com os repositórios oficiais.",
      },
      {
        title: "Proteção do Magistrado",
        desc: "Garante que nenhuma citação fictícia ou errônea chegue à minuta final assinada.",
      }
    ];
  }
  // 3. Modal States
  else if (activeModal === 'teses') {
    title = "Caderno de Teses & Modelos";
    icon = <Library className="w-4 h-4 text-amber-400" />;
    statusBadge = <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">GABINETE</span>;
    tabLabel = "Teses & Modelos";
    steps = [
      {
        title: "Aba Teses Gerais",
        desc: "Cadastre regras imutáveis que a IA deve respeitar (ex: teto indenizatório de danos morais).",
      },
      {
        title: "Aba Modelos Paradigmas",
        desc: "Adicione decisões reais do juiz para espelhar estilo, vocabulário e formato do dispositivo.",
      }
    ];
  }
  else if (activeModal === 'history') {
    title = "Histórico & Dossiê";
    icon = <Search className="w-4 h-4 text-slate-300" />;
    statusBadge = <span className="bg-slate-800 text-slate-300 border border-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">MEMÓRIA</span>;
    tabLabel = "Histórico";
    steps = [
      {
        title: "Dossiê por Processo",
        desc: "Todas as análises de um mesmo processo ficam agrupadas em uma linha do tempo única.",
      },
      {
        title: "Restauração de Minutas",
        desc: "Restaure qualquer versão gerada anteriormente com um único clique.",
      }
    ];
  }
  else if (activeModal === 'prompts') {
    title = "Gerenciador de Prompts";
    icon = <Settings className="w-4 h-4 text-emerald-400" />;
    statusBadge = <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">DIRETRIZES</span>;
    tabLabel = "Prompts";
    steps = [
      {
        title: "Fase Processual",
        desc: "Defina o tipo de decisão (Sentença Cível, Decisão Liminar, Despacho, etc.).",
      },
      {
        title: "Diretrizes Estruturais",
        desc: "Indique como o juiz prefere: relatório conciso, tópicos destacados e dispositivo padrão.",
      }
    ];
  }
  else if (activeModal === 'precedents') {
    title = "Súmulas STF / STJ / TNU";
    icon = <Sparkles className="w-4 h-4 text-teal-400" />;
    statusBadge = <span className="bg-teal-950/80 text-teal-300 border border-teal-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">PRECEDENTES</span>;
    tabLabel = "Súmulas";
    steps = [
      {
        title: "Busca Oficial de Teses",
        desc: "Consulta a base oficial de teses vinculantes e súmulas de tribunais superiores.",
      },
      {
        title: "Injeção Automática",
        desc: "Os precedentes selecionados são inseridos com fidelidade na fundamentação da minuta.",
      }
    ];
  }
  else if (hasResult) {
    title = "Revisão & Chat da Minuta";
    icon = <FileText className="w-4 h-4 text-emerald-400" />;
    statusBadge = <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">MINUTA PRONTA</span>;
    tabLabel = "Revisão";
    steps = [
      {
        title: "1. Edição Direta",
        desc: "Você pode clicar e editar qualquer palavra no documento na tela de resultado.",
      },
      {
        title: "2. Assistente Interativo",
        desc: "Peça correções no chat: 'Adicione condenação em litigância de má-fé' ou 'Ajuste honorários'.",
      },
      {
        title: "3. Exportar & Copiar",
        desc: "Copie o texto formatado para o sistema do tribunal (PROJUDI, PJe, Eproc) ou gere PDF.",
      }
    ];
  }
  else {
    // Initial State: "Como iniciar uma análise"
    title = "Como iniciar uma análise";
    icon = <Play className="w-4 h-4 text-emerald-400" />;
    statusBadge = <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">PASSO A PASSO</span>;
    tabLabel = "Como Iniciar";
    steps = [
      {
        title: "1. Anexar os Autos",
        desc: "Arraste ou selecione o PDF do processo (Petição Inicial, Contestação, Provas).",
      },
      {
        title: "2. Escolher o Prompt",
        desc: "Confira o Prompt Ativo no topo (ex: Sentença JEC, Decisão de Tutela, etc.).",
      },
      {
        title: "3. Minuta Paradigma (Opcional)",
        desc: "Vincule um modelo do juiz para clonar o formato e dispositivo exatos.",
      },
      {
        title: "4. Executar Análise",
        desc: "Clique no botão verde 'Gerar Análise Jurídica / Minuta' e acompanhe o resultado.",
      }
    ];
  }

  return (
    <aside 
      aria-label="Tutor e Guia Lateral"
      className="hidden md:flex flex-row-reverse fixed right-0 top-1/2 -translate-y-1/2 z-30 items-center select-none gap-2 pr-0.5 sm:pr-1"
    >
      {/* Botões das Abas Laterais (Na Borda Direita) */}
      <div className="flex flex-col gap-1.5 shrink-0 z-10">
        
        {/* 1. Botão Aba Lateral de Acionamento do Guia / Como Iniciar */}
        <button
          onClick={() => handleToggleOpen(!isOpen)}
          className={`group flex items-center gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-l-xl font-bold text-xs shadow-2xl transition-all duration-300 cursor-pointer border-y border-l ${
            isOpen
              ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300 hover:bg-slate-800'
              : 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-emerald-500/60 text-white hover:border-emerald-400 hover:shadow-emerald-500/20 hover:scale-105'
          }`}
          title={isOpen ? "Recolher Guia Lateral" : "Abrir Guia Lateral: Como iniciar uma análise"}
        >
          <div className="flex flex-col items-center gap-1.5">
            {isOpen ? (
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover:-translate-x-0.5" />
            )}

            <div className="p-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              <Bot className="w-3.5 h-3.5" />
            </div>

            {/* Texto vertical elegante */}
            <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-[10px] tracking-wider uppercase text-slate-200 group-hover:text-emerald-300 transition py-0.5">
              {tabLabel}
            </span>

            {!isOpen && (
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </button>

        {/* 2. Botão Lateral Chave API Grátis (Google Gemini) */}
        {onOpenApiKeyConfig && (
          <button
            onClick={onOpenApiKeyConfig}
            className={`group flex items-center gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-l-xl font-bold text-xs shadow-2xl transition-all duration-300 cursor-pointer border-y border-l ${
              hasApiKey
                ? 'bg-gradient-to-b from-emerald-950/95 via-slate-900 to-slate-900 border-emerald-500/60 text-emerald-300 hover:border-emerald-400 hover:scale-105'
                : 'bg-gradient-to-b from-amber-950/95 via-slate-900 to-slate-900 border-amber-500/60 text-amber-300 hover:border-amber-400 hover:scale-105'
            }`}
            title={
              hasApiKey
                ? `Chave Pessoal Ativa (${getMaskedApiKey()}) - Clique para testar ou alterar`
                : 'Configurar Chave Pessoal Gratuita Google Gemini (Sem Custos)'
            }
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className={`p-1 rounded-lg border ${
                hasApiKey
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}>
                <Key className="w-3.5 h-3.5" />
              </div>

              <span className="[writing-mode:vertical-rl] rotate-180 font-bold text-[9px] tracking-wider uppercase text-slate-200 group-hover:text-white transition py-0.5">
                {hasApiKey ? 'CHAVE ATIVA' : 'CHAVE API'}
              </span>

              <span className="flex h-1.5 w-1.5 relative">
                {hasApiKey ? (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </>
                )}
              </span>
            </div>
          </button>
        )}


        {/* Botão Equipe na lateral */}
        {isAdmin && onOpenUserManager && (
          <button
            onClick={onOpenUserManager}
            className="group flex items-center gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-l-xl font-bold text-xs shadow-2xl transition-all duration-300 cursor-pointer border-y border-l bg-purple-950/95 border-purple-500/60 text-purple-300 hover:bg-purple-800 hover:border-purple-400 hover:scale-105"
            title="Gerenciar acessos da equipe"
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="[writing-mode:vertical-rl] rotate-180 tracking-widest text-[9px] uppercase font-black py-0.5 group-hover:text-white transition">
                Equipe
              </span>
            </div>
          </button>
        )}

        {/* 5. Botão Aba Lateral de SaaS Admin */}
        {isSuperAdmin && onOpenSuperAdmin && (
          <button
            onClick={onOpenSuperAdmin}
            className="group flex items-center gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-l-xl font-bold text-xs shadow-2xl transition-all duration-300 cursor-pointer border-y border-l bg-indigo-950/95 border-indigo-500/60 text-indigo-300 hover:bg-indigo-800 hover:border-indigo-400 hover:scale-105"
            title="Abrir Painel SaaS Admin"
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                <Server className="w-3.5 h-3.5" />
              </div>
              <span className="[writing-mode:vertical-rl] rotate-180 tracking-widest text-[9px] uppercase font-black py-0.5 group-hover:text-white transition">
                SaaS Admin
              </span>
            </div>
          </button>
        )}
        
        {/* 6. Botão Aba Lateral de Petição & Defesa 360° (Exclusivo Super Admin) */}
        {isSuperAdmin && onOpenPetitionPanel && (
          <button
            id="btn-floating-petition-initial"
            onClick={onOpenPetitionPanel}
            className="group flex items-center gap-1.5 py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-l-xl font-bold text-xs shadow-2xl transition-all duration-300 cursor-pointer border-y border-l bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-900 border-indigo-500/70 text-indigo-200 hover:from-indigo-900 hover:to-purple-900 hover:border-indigo-400 hover:scale-105 shadow-indigo-500/20"
            title="Módulo Petição & Defesa 360° (Inicial, Contestação e Recursos)"
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 group-hover:text-white">
                <Scale className="w-3.5 h-3.5" />
              </div>
              <span className="[writing-mode:vertical-rl] rotate-180 tracking-widest text-[9px] uppercase font-black py-0.5 group-hover:text-white transition text-indigo-200">
                Petição & Defesa
              </span>
            </div>
          </button>
        )}

      </div>

      {/* 3. Painel Lateral Deslizante (Gaveta lateral) */}
      {isOpen && (
        <div className="w-[300px] sm:w-[340px] max-h-[78vh] bg-slate-900/95 border border-slate-700/90 shadow-2xl rounded-2xl overflow-hidden flex flex-col text-slate-100 backdrop-blur-md animate-in slide-in-from-right-6 duration-300">
          
          {/* Header do Painel */}
          <div className="bg-slate-950/80 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                {icon}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-100 text-xs truncate">{title}</span>
                <div className="mt-0.5">{statusBadge}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button 
                onClick={() => handleToggleOpen(false)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
                title="Recolher para a lateral"
              >
                <span>Recolher</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                  title="Ocultar Tutor"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Conteúdo com os Passos */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs text-slate-300 bg-gradient-to-b from-slate-900/90 to-slate-950/90">
            
            {/* Card de Acesso Rápido à Chave API Gratuita */}
            {onOpenApiKeyConfig && (
              <div className={`p-3 rounded-xl border shadow-xs transition ${
                hasApiKey
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    hasApiKey ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-white">
                        {hasApiKey ? 'Chave Pessoal Conectada' : 'Chave API Google Gemini'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        hasApiKey ? 'bg-emerald-900/80 text-emerald-300' : 'bg-amber-900/80 text-amber-300'
                      }`}>
                        {hasApiKey ? 'ATIVA' : 'GRÁTIS'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {hasApiKey 
                        ? `Você está utilizando sua cota dedicada individual (${getMaskedApiKey()}).`
                        : 'Obtenha cota gratuita dedicada do Google Gemini em 30 segundos.'}
                    </p>
                    <button
                      onClick={onOpenApiKeyConfig}
                      className={`mt-1.5 w-full py-1.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                        hasApiKey
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{hasApiKey ? 'Gerenciar Minha Chave' : 'Configurar Chave Gratuita'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Acesso Rápido ao Módulo Petição & Defesa 360° */}
            {isSuperAdmin && onOpenPetitionPanel && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 text-indigo-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">Petição & Defesa 360°</span>
                      <span className="text-[10px] text-indigo-300/80">Inicial, Contestação & Matriz 341 CPC</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                    Admin
                  </span>
                </div>
                <button
                  onClick={onOpenPetitionPanel}
                  className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Abrir Módulo Petição & Defesa</span>
                </button>
              </div>
            )}

            {steps.map((step, idx) => (
              <div 
                key={idx} 
                className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-emerald-500/40 transition flex gap-2.5 items-start shadow-xs"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="font-bold text-slate-200 text-xs leading-snug">
                    {step.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}

            {/* Dica do Gabinete */}
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2 text-[11px] text-emerald-300/90">
              <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Dica:</strong> As abas de Guia e Chave API ficam sempre fixadas na lateral direita para acesso imediato.
              </p>
            </div>
          </div>

          {/* Rodapé informativo */}
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Tutor Sempre Disponível
            </span>
            <button 
              onClick={() => handleToggleOpen(false)}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Recolher lateral ‹
            </button>
          </div>

        </div>
      )}
    </aside>
  );
};
