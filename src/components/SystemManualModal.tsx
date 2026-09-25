import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  Trash2,
  X,
  Book,
  FileText,
  Database,
  Scale,
  Terminal,
  MessageSquare,
  Users,
  UserCheck,
  GitBranch,
  Rocket,
  ShieldCheck,
  Search,
  Settings,
  ChevronRight,
  BookOpen,
  ListOrdered,
  Sparkles,
  Zap,
  CheckCircle,
  Scissors,
  Gavel,
  Layers,
  Key,
  Target,
  FileUp,
  Building2,
  Globe,
  Crown,
  Calendar,
  Smartphone,
  Puzzle,
  SlidersHorizontal,
  Calculator,
  Bell,
  FileSignature,
  RefreshCw,
  Coins,
  BarChart3,
} from "lucide-react";

interface SystemManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 
  | "visao-geral"
  | "passo-a-passo"
  | "central-chamados"
  | "pesquisa-legislativa"
  | "peticao-inicial"
  | "extensao-projudi"
  | "super-admin-saas"
  | "agenda-gabinete"
  | "chave-api"
  | "auditor-magistrado"
  | "mesa-audiencias"
  | "fluxo"
  | "paradigma"
  | "consectarios-fatos"
  | "versoes-comparacao"
  | "projudi-guia"
  | "multiusuario-atualizacoes"
  | "teses"
  | "prompts"
  | "conhecimento"
  | "editor"
  | "versionamento"
  | "changelog";

export const SystemManualModal: React.FC<SystemManualModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, isSuperAdmin, isJudge } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("visao-geral");
  const [showMobileMenu, setShowMobileMenu] = useState(true);

  if (!isOpen) return null;

  const allTabs: { id: TabType; label: string; icon: React.ReactNode; requiresSuperAdmin?: boolean; requiresJudgeOrSuperAdmin?: boolean }[] = [
    { id: "visao-geral", label: "Visão Geral", icon: <Book className="w-4 h-4" /> },
    { id: "passo-a-passo", label: "Passo a Passo de Uso", icon: <ListOrdered className="w-4 h-4" /> },
    { id: "central-chamados", label: "Central de Chamados & Feedback (Novo)", icon: <MessageSquare className="w-4 h-4 text-amber-500" /> },
    { id: "pesquisa-legislativa", label: "Pesquisa Legislativa & Consectários (Novo)", icon: <BookOpen className="w-4 h-4 text-indigo-500" /> },
    { id: "peticao-inicial", label: "Módulo Petição & Defesa 360° (Exclusivo)", icon: <Scale className="w-4 h-4 text-indigo-400" />, requiresSuperAdmin: true },
    { id: "extensao-projudi", label: "Extensão PROJUDI (Novo)", icon: <Zap className="w-4 h-4 text-indigo-500" />, requiresSuperAdmin: true },
    { id: "super-admin-saas", label: "Painel Super Admin SaaS", icon: <Building2 className="w-4 h-4 text-indigo-500" />, requiresSuperAdmin: true },
    { id: "agenda-gabinete", label: "Agenda & Pautas do Google", icon: <Calendar className="w-4 h-4 text-amber-500" /> },
    { id: "chave-api", label: "Chave API Gratuita (Sem Custos)", icon: <Key className="w-4 h-4 text-emerald-500" /> },
    { id: "auditor-magistrado", label: "Bancada de Tripla Conferência (Auditoria Ouro)", icon: <ShieldCheck className="w-4 h-4 text-amber-500" />, requiresJudgeOrSuperAdmin: true },
    { id: "mesa-audiencias", label: "Mesa de Audiências & Instrução", icon: <Gavel className="w-4 h-4 text-amber-500" /> },
    { id: "fluxo", label: "Fluxo de Trabalho", icon: <Rocket className="w-4 h-4" /> },
    { id: "paradigma", label: "Minuta Paradigma (Espelho)", icon: <Sparkles className="w-4 h-4" /> },
    { id: "consectarios-fatos", label: "Consectários & Fato vs Prova", icon: <Scale className="w-4 h-4" /> },
    { id: "versoes-comparacao", label: "1º Modelo, Versões & Comparador", icon: <GitBranch className="w-4 h-4" /> },
    { id: "projudi-guia", label: "Guia PROJUDI do Gabinete", icon: <FileText className="w-4 h-4" /> },
    { id: "multiusuario-atualizacoes", label: "Multiusuário & Atualizações", icon: <Users className="w-4 h-4" /> },
    { id: "teses", label: "Teses & Extrator de PDFs", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "prompts", label: "Gerenciador de Prompts", icon: <Terminal className="w-4 h-4" /> },
    { id: "conhecimento", label: "Base de Conhecimento", icon: <Database className="w-4 h-4" /> },
    { id: "editor", label: "Editor e Chat (Revisão)", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "versionamento", label: "Código e Colaboração", icon: <Settings className="w-4 h-4" /> },
    { id: "changelog", label: "Registro de Modificações", icon: <FileText className="w-4 h-4" /> },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.requiresSuperAdmin && !isSuperAdmin) return false;
    if (tab.requiresJudgeOrSuperAdmin && !isSuperAdmin && !isJudge) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col md:flex-row max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        
        {/* Mobile Header (Close button only visible on mobile at the top if stacked, or absolute) */}
        {showMobileMenu && (
          <button
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Sidebar Navigation */}
        <div className={`${showMobileMenu ? "flex" : "hidden"} md:flex w-full md:w-64 lg:w-72 bg-slate-50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0`}>
          <div className="p-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white leading-tight">Manual do Sistema</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Guia do Usuário</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm"
                    : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <div className={`${activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
                  {tab.icon}
                </div>
                <span className="flex-1 text-left">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 opacity-50" />}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`${showMobileMenu ? "hidden" : "flex"} md:flex flex-1 flex-col min-w-0 bg-white dark:bg-slate-900 h-[80vh] md:h-auto overflow-y-auto`}>
          {/* Mobile Back to Menu & Close */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
            <button
              onClick={() => setShowMobileMenu(true)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Menu
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden md:flex justify-end p-4 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 border-b border-transparent">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 md:px-10 md:pb-12 max-w-4xl mx-auto w-full">
            
            {/* 1. VISÃO GERAL */}
            {activeTab === "visao-geral" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
                  <Book className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                  O <strong>Assessor Judicial</strong> é um assistente de inteligência artificial jurídica avançado, desenvolvido para atuar diretamente nos gabinetes do Tribunal de Justiça. 
                  Sua arquitetura é projetada para resolver a sobrecarga de análise documental, automatizando a extração de fatos, auditoria de provas e a elaboração de minutas complexas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <ShieldCheck className="w-6 h-6 text-slate-800 mb-2" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Segurança e Privacidade</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">O processamento das peças ocorre através da API segura do modelo Gemini (Google), com prompts e teses configurados para restringir alucinações jurídicas.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <Scale className="w-6 h-6 text-amber-500 mb-2" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Moldado ao Gabinete</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Totalmente adaptável através do <em>Caderno de Teses</em> e do <em>Gerenciador de Prompts</em>, permitindo que a IA reproduza o entendimento pacificado do magistrado titular.</p>
                  </div>
                </div>
              </div>
            )}

            {/* PASSO A PASSO DE USO */}
            {activeTab === "passo-a-passo" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                  <ListOrdered className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Passo a Passo de Uso</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base">
                  Guia prático para iniciar suas análises processuais e gerar minutas rapidamente.
                </p>

                <div className="space-y-6 mt-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 text-sm">1</span>
                      Anexar os Autos (PROJUDI ou PDF)
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-2">
                      <li><strong>Metodologia Recomendada:</strong> Instale a <strong>Extensão Oficial do PROJUDI</strong> e envie autos diretamente do TJGO, sem limites de tamanho, superando a barreira de PDFs pesados.</li>
                      <li><strong>Metodologia Manual:</strong> Na seção de Entrada dos Autos do Processo, arraste ou faça upload dos arquivos (Petição Inicial, Contestação).</li>
                      <li>Se preferir usar apenas texto, mude para a aba "Texto / Casos" e cole as informações do Projudi.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 text-sm">2</span>
                      Escolher o Prompt
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-2">
                      <li>No topo direito (abaixo da barra de navegação), clique no botão <strong>Prompt Ativo</strong> para abrir o Gerenciador.</li>
                      <li>Selecione o modelo que deseja (ex: "Sentença Cível - Juizado Especial", "Despacho Saneador").</li>
                      <li>Você pode editar as regras desse prompt clicando no ícone de lápis ou criar o seu próprio clicando em "Novo Prompt".</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 text-sm">3</span>
                      Verificar Teses e Base de Conhecimento
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-2">
                      <li>Clique em <strong>Teses do Gabinete</strong> no topo para conferir se o seu caderno de entendimentos está ativo e atualizado.</li>
                      <li>Se precisar de jurisprudências extras ou súmulas em PDF, ative-as no quadro <strong>Base de Conhecimento</strong>.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/10 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-sm">4</span>
                      Gerar Minuta
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-2">
                      <li>Clique no botão verde <strong>Executar Prompt no PDF / Processo</strong>.</li>
                      <li>O assistente cruzará os fatos, as provas e as teses, redigindo a minuta completa.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 text-sm">5</span>
                      Revisão e Chat
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 ml-2">
                      <li>Após gerada, use o <strong>Chat Interativo</strong> na lateral para pedir ajustes (ex: "Altere a data dos juros de mora").</li>
                      <li>Você também pode usar o <strong>Editor Rico</strong> para alterações manuais.</li>
                      <li>Quando finalizar, copie a minuta (via botão HTML Projudi ou Editor Rico) ou clique em <strong>Salvar no Histórico</strong>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CENTRAL DE CHAMADOS & FEEDBACK */}
            {activeTab === "central-chamados" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
                  <MessageSquare className="w-8 h-8" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Central de Chamados, Feedback & Melhorias (Estilo Ticket)
                    </h1>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      Comunicação Direta entre Gabinetes e a Administração SaaS • Sininho de Recados em Tempo Real
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <p className="text-sm text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                    A <strong>Central de Chamados</strong> permite que magistrados, administradores de gabinete e assessores abram solicitações formais de melhorias, implementação de recursos, relatos de erros, sugestões de novos prompts e dúvidas de usabilidade, acompanhando em tempo real os despachos e o status de resolução.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                      Como Abrir um Chamado:
                    </h3>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <li>Clique no ícone de <strong>Sininho</strong> no cabeçalho ou vá em <strong>Configurações &gt; Central de Chamados</strong>.</li>
                      <li>Clique no botão <strong>+ Novo Chamado / Pedido</strong>.</li>
                      <li>Escolha o tipo: <em>Melhoria no Sistema, Nova Funcionalidade, Relato de Erro, Dúvida ou Elogio</em>.</li>
                      <li>Defina a prioridade (<em>Baixa, Média, Alta ou Urgente</em>) e descreva com detalhes o que necessita no seu gabinete.</li>
                      <li>O chamado é registrado com segurança na nuvem com sincronização instantânea.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Status e Ciclo de Vida do Chamado:
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 p-1.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>1. Aberto / Aguardando Triagem:</span> Recém-enviado pelo gabinete.
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>2. Em Análise / Triagem:</span> Em estudo técnico pela equipe de engenharia.
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>3. Em Construção / Desenvolvimento:</span> Funcionalidade em codificação.
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>4. Solucionado / Provido:</span> Entregue e disponível no sistema!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                  <h3 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Recursos Exclusivos do Módulo:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-indigo-900 dark:text-indigo-300">
                    <li><strong>Sininho com Notificações Não Lidas:</strong> Exibe badge numérico com chamados pendentes e popover para abertura com 1 clique.</li>
                    <li><strong>Painel de Despacho para Super Admin:</strong> A administração central dispõe de botões rápidos para <em>Prover e Entregar, Iniciar Construção, Solicitar Mais Informações ou Não Prover</em> com fundamentação.</li>
                    <li><strong>Thread de Mensagens Interativa:</strong> Permite envio de mensagens bidirecionais entre a equipe do gabinete e os desenvolvedores/administração.</li>
                    <li><strong>Desativação Modular Segura:</strong> Caso o administrador decida desativar o módulo, isso pode ser feito sem qualquer impacto nos demais recursos do sistema.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB: PESQUISA LEGISLATIVA & TAXONOMIA DE CONSECTÁRIOS */}
            {activeTab === "pesquisa-legislativa" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                  <BookOpen className="w-8 h-8" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Pesquisa Legislativa & Taxonomia de Consectários (TJGO)
                    </h1>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      Novo Motor de Subsunção Jurídica & Mapeamento Dinâmico de Microssistemas
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
                  O sistema agora opera com um <strong>motor taxonômico multidimensional</strong> que identifica automaticamente a natureza jurídica da lide a partir dos autos do processo (PDFs e petições), aplicando com rigor a legislação específica de cada microssistema e os regimes exatos de juros de mora e correção monetária.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm space-y-2">
                    <h3 className="font-bold text-base text-indigo-950 dark:text-indigo-300 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-indigo-600" />
                      1. Subsunção por Microssistemas
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Em vez de aplicar uma regra genérica, a IA reconhece se a matéria pertence a:
                    </p>
                    <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 font-medium">
                      <li>Obrigações Cíveis Gerais (Lei 14.905/2024, arts. 389 e 406 CC)</li>
                      <li>Fazenda Pública & Precatórios (EC 113/2021 e Tema 810/STF)</li>
                      <li>Direito Bancário & Sistema Financeiro (Lei 4.595/64 e Súmula 379/STJ)</li>
                      <li>Locações Urbanas (Lei 8.245/1991 e art. 397 CC)</li>
                      <li>Títulos de Crédito & Cheques (Lei 7.357/1985 e Súmulas 503/600 STJ)</li>
                      <li>Saúde Suplementar (Lei 9.656/1998 e Resoluções ANS)</li>
                      <li>Aviação Civil & Transporte Aéreo (Resolução ANAC 400 e CC)</li>
                      <li>Seguro DPVAT & Trânsito (Lei 6.194/1974 e Súmulas 426/580 STJ)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm space-y-2">
                    <h3 className="font-bold text-base text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      2. Auditoria e Parametrização Exata de Consectários
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      No Checklist de Auditoria e no Dispositivo da Minuta, são exibidos com transparência:
                    </p>
                    <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 font-medium">
                      <li><strong>Índice de Correção Monetária:</strong> IPCA, IPCA-E, INPC ou índice contratual.</li>
                      <li><strong>Termo Inicial de Correção:</strong> Súmula 362/STJ (arbitramento) ou Súmula 43/STJ (evento danoso/desembolso).</li>
                      <li><strong>Taxa de Juros de Mora:</strong> Selic menos IPCA (Lei 14.905/2024), 1% a.m. ou Selic simples.</li>
                      <li><strong>Termo Inicial dos Juros:</strong> Citação (art. 405 CC), Evento Danoso (Súmula 54/STJ) ou Vencimento (art. 397 CC).</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Como Utilizar a Ferramenta "Legislação & Juros"
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-400 ml-2">
                    <li>Clique no botão <strong>Legislação & Juros</strong> na barra superior ou acesse pelos cards do Checklist de Auditoria.</li>
                    <li>Navegue pelos 10 microssistemas cadastrados ou digite qualquer artigo, lei ou controvérsia na barra de pesquisa.</li>
                    <li>Utilize o botão <strong>Pesquisar IA</strong> para obter ementas, artigos pertinentes e precedentes vinculantes em tempo real.</li>
                    <li>Copie a cláusula pronta do dispositivo com um clique ou insira diretamente na minuta em elaboração.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB: MÓDULO PETIÇÃO & DEFESA 360° (EXCLUSIVO SUPER ADMIN) */}
            {activeTab === "peticao-inicial" && isSuperAdmin && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                  <Scale className="w-8 h-8" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Módulo Petição & Defesa 360° (Ambiente Contencioso Independente)</h1>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      Isolamento Total • Banco Separado • Inicial, Defesa, Contestação & Recursos
                    </span>
                  </div>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    O <strong>Módulo Petição & Defesa 360°</strong> é um ambiente totalmente independente e desvinculado do sistema judicial de gabinete. Ele atua tanto na propositura da ação (Petição Inicial) quanto no <strong>decorrer de processos já existentes</strong>, assessorando o advogado na defesa técnica de seus clientes através de Contestação, Réplica, Manifestações Incidentais e Recursos.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 my-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                      <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 mb-2 text-sm">
                        <Scale className="w-4 h-4" />
                        5 Posturas Processuais
                      </h4>
                      <p className="text-xs text-indigo-900/70 dark:text-indigo-200">
                        Alterne entre Petição Inicial, Contestação, Réplica, Manifestação Incidental ou Recurso, adaptando o direcionamento aos autos e juízo competentes.
                      </p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50">
                      <h4 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2 text-sm">
                        <ShieldCheck className="w-4 h-4" />
                        Preliminares Art. 337 CPC
                      </h4>
                      <p className="text-xs text-amber-900/70 dark:text-amber-200">
                        Injeção em 1 clique de preliminares processuais (incompetência, inépcia, ilegitimidade, falta de interesse, prescrição e decadência).
                      </p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800/50">
                      <h4 className="font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2 text-sm">
                        <Sparkles className="w-4 h-4" />
                        Matriz Art. 341 CPC
                      </h4>
                      <p className="text-xs text-purple-900/70 dark:text-purple-200">
                        Impugnação específica obrigatória: confronto analítico de cada fato alegado na inicial contra a refutação da defesa e a prova correspondente.
                      </p>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                      <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-2 text-sm">
                        <BookOpen className="w-4 h-4" />
                        Duplo Upload Seletivo
                      </h4>
                      <p className="text-xs text-emerald-900/70 dark:text-emerald-200">
                        Divisão inteligente entre o PDF dos autos do processo (petição adversa) e os documentos e provas de defesa do próprio cliente.
                      </p>
                    </div>

                    <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-xl border border-sky-100 dark:border-sky-800/50">
                      <h4 className="font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-2 mb-2 text-sm">
                        <Search className="w-4 h-4" />
                        Google Grounding Real
                      </h4>
                      <p className="text-xs text-sky-900/70 dark:text-sky-200">
                        Busca de precedentes em tempo real no Google e portais de tribunais com link oficial, separando acórdãos reais de teses doutrinárias sugeridas.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 text-sm text-indigo-950 dark:text-indigo-200 my-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Protocolo Anti-Alucinação & Transparência Estrita de Jurisprudência (Google Grounding)
                    </h4>
                    <p className="text-xs leading-relaxed">
                      Para assegurar que o advogado nunca cite processos ou relatores inexistentes, o sistema integra o motor Gemini 3.8 ao <strong>Google Search Grounding</strong>. Todos os julgados apresentados na aba <em>Precedentes & Jurisprudência</em> são classificados em duas categorias visualmente transparentes:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs pt-1">
                      <li><strong className="text-emerald-700 dark:text-emerald-300">🟢 Jurisprudência Real Verificada:</strong> Acórdãos oficiais ou Súmulas validadas na web com botão direto <em>"Abrir Fonte Oficial"</em> para conferência imediata.</li>
                      <li><strong className="text-amber-700 dark:text-amber-300">🟡 💡 Sugestão de Tese Argumentativa:</strong> Linhas de mérito e doutrina jurídica sugeridas pela IA com alerta explícito para que o profissional pesquise nos autos do tribunal antes de transcrever número processual.</li>
                    </ul>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-6 mb-3">Fluxo de Atuação em Processo Existente (Defesa do Cliente)</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-600 dark:text-slate-300 text-sm">
                    <li><strong>Selecione a Postura:</strong> Clique em <em>Contestação</em>, <em>Réplica</em> ou <em>Manifestação Incidental</em>.</li>
                    <li><strong>Identifique os Autos:</strong> Preencha o Número do Processo (formato CNJ), Vara/Juízo e confirme a Tempestividade (data da citação/intimação e prazo legal).</li>
                    <li><strong>Upload dos Autos do Processo:</strong> Anexe o PDF da petição inicial ou da decisão judicial contra a qual seu cliente precisa se defender.</li>
                    <li><strong>Upload das Provas do Cliente:</strong> Anexe contratos, comprovantes de pagamento, conversas de WhatsApp, e-mails ou laudos que fundamentam a defesa.</li>
                    <li><strong>Marque as Preliminares Relevantes:</strong> Escolha as matérias processuais do art. 337 do CPC com um clique.</li>
                    <li><strong>Redigir Minuta 360°:</strong> A IA estruturará a peça combativa, as preliminares e montará automaticamente a <em>Matriz de Impugnação Específica (Art. 341 CPC)</em> para visualização em aba dedicada.</li>
                    <li><strong>Histórico Seguro:</strong> Todas as peças são indexadas com número de processo, postura e data, com exclusão segura e modal in-app nativo.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB: EXTENSÃO PROJUDI */}
            {activeTab === "extensao-projudi" && isSuperAdmin && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                  <Zap className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Extensão Oficial de Conexão ao PROJUDI</h1>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-slate-600 dark:text-slate-300">
                    A extensão "Assessor IA & PROJUDI" é um módulo instalável no Google Chrome desenvolvido especificamente para eliminar o trabalho de baixar e subir PDFs manualmente.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                      <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 mb-2">
                        <FileUp className="w-5 h-5" />
                        Sem limite de tamanho
                      </h4>
                      <p className="text-sm text-indigo-900/70 dark:text-indigo-200">
                        Os downloads e transferências de processos com dezenas de milhares de páginas e até centenas de Megabytes acontecem integralmente de memória a memória, sem estourar limites do navegador.
                      </p>
                    </div>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                      <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5" />
                        Totalmente Autenticado
                      </h4>
                      <p className="text-sm text-indigo-900/70 dark:text-indigo-200">
                        O sistema utiliza os seus cookies nativos do TJGO de forma segura, garantindo que o Tribunal não bloqueie o acesso (Erro 0 Bytes) ao baixar o Inteiro Teor do documento.
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-8 mb-4">Como instalar a Extensão?</h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300">
                    <li>Clique no menu <strong>Configurações (engrenagem)</strong> superior direito ou no atalho <strong>Extensão PROJUDI</strong> no menu.</li>
                    <li>Clique no botão para gerar o <strong>Download do Arquivo .ZIP</strong>, onde nosso sistema construirá a extensão customizada para a sua sessão atual.</li>
                    <li>Extraia o arquivo .zip em uma pasta no seu computador.</li>
                    <li>No Google Chrome, digite na barra de endereços: <code>chrome://extensions/</code></li>
                    <li>Ative o <strong>Modo do Desenvolvedor</strong> (canto superior direito).</li>
                    <li>Clique em <strong>Carregar sem compactação</strong> e selecione a pasta extraída.</li>
                  </ol>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-8 mb-4">Formas de Uso</h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
                    <li><strong>Baixando o Inteiro Teor:</strong> Abra um processo no PROJUDI e clique na opção que exibe todas as folhas juntas (Inteiro Teor). A extensão injetará um botão verde "⚡ ENVIAR PROCESSO COMPLETO". </li>
                    <li><strong>Baixando Múltiplas Movimentações:</strong> Vá até a aba "Movimentações". Marque as caixinhas (checkbox) dos PDFs que você deseja ler e depois clique no botão superior direito da nossa extensão.</li>
                  </ul>
                  
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-md">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-medium m-0">
                      <strong>Dica de Segurança:</strong> Se você enfrentar qualquer falha ou travamento ("0 bytes" ou erro de CORS) ao enviar um processo gigante em Inteiro Teor, utilize o Plano B: A aba de movimentações individuais foi otimizada e garante total integridade ao transferir centenas de documentos fragmentados de uma vez.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SUPER ADMIN SAAS */}
            {activeTab === "super-admin-saas" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-indigo-600" />
                    Painel Super Admin SaaS & Governança Multi-Tenant
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Gestão centralizada de inquilinos (gabinetes), monitoramento de métricas executivas, suspensão/ativação de acessos, transferências de membros e transmissão global de comunicados.
                  </p>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 text-sm text-indigo-900 dark:text-indigo-300">
                  <h4 className="font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Arquitetura SaaS Multi-Tenant Particionada
                  </h4>
                  <p className="leading-relaxed">
                    O sistema opera no modelo SaaS Multi-Tenant com isolamento estrito de dados por gabinete (<code>gabinetes/&#123;tenantId&#125;</code>). Cada magistrado e sua assessoria têm seus próprios prompts, históricos, auditorias e cadernos de teses isolados, garantindo total segurança, conformidade e confidencialidade jurisdicional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      1. Gestão de Gabinetes & Planos
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li><strong>Provisionamento Instantâneo:</strong> Criação de novos inquilinos definindo slug, nome do juiz, e-mail titular (@gmail.com) e plano contratado (Magistrado Pro, Enterprise, Trial).</li>
                      <li><strong>Ativação / Suspensão Geral:</strong> O Super Admin pode suspender o acesso integral de um gabinete com mensagem explicativa instantânea exibida para todos os membros.</li>
                      <li><strong>Inspeção de Membros:</strong> Visualização rápida de todos os assessores e juízes vinculados a cada gabinete em drawer expansível.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      2. Gestão Global de Usuários
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li><strong>Mudar de Gabinete:</strong> Transferência direta e persistente de assessores e juízes entre gabinetes contratantes com opção de criação inline de novos gabinetes.</li>
                      <li><strong>Exclusão Segura e Definitiva:</strong> Exclusão permanente de usuários com modal dedicado de confirmação, limpeza de credenciais e cancelamento automático de convites pendentes.</li>
                      <li><strong>Controle de Permissões:</strong> Alternância imediata entre Administrador e Assessor, ou designação de Magistrado Titular.</li>
                      <li><strong>Chave Nativa da Plataforma:</strong> Liberação ou bloqueio individual do uso da cota de IA do sistema para cada usuário.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      3. Transmissão de Comunicados Globais
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li><strong>SaaS Broadcast:</strong> Emissão de banners em tempo real para avisar todos os usuários de novidades, atualizações de sistema ou manutenções técnicas programadas.</li>
                      <li><strong>Prévia em Tempo Real:</strong> Visualização do formato e cores do aviso antes da publicação.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Database className="w-4 h-4 text-rose-500" />
                      4. Métricas & Ferramentas de Migração
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li><strong>Métricas Executivas:</strong> Total de gabinetes, usuários ativos, minutas geradas e prompts criados no ecossistema global.</li>
                      <li><strong>Migração de Bancos Legados:</strong> Importação guiada de históricos anteriores para novos gabinetes selecionados.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm md:col-span-2">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      5. Central de Snapshots de Segurança & Auto-Cura de Gabinetes
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li><strong>Snapshots Automáticos Pré-Permissão:</strong> Antes de qualquer operação crítica no painel (criação, edição, suspensão ou exclusão de gabinetes, transferências e alterações de função de usuários), o sistema gera automaticamente um ponto de restauração completo do Firestore.</li>
                      <li><strong>Pontos de Restauração Manuais:</strong> Geração instantânea de snapshots a qualquer momento com descrições personalizadas.</li>
                      <li><strong>Exportação & Importação JSON:</strong> Download de arquivos de backup para salvaguarda offline e upload de JSON para restauração independente.</li>
                      <li><strong>Restauração Transacional de Dados:</strong> Recomposição em um clique de gabinetes, usuários, lotações de magistrados, teses e prompts.</li>
                      <li><strong>Script de Auto-Cura e Reconciliação:</strong> Botão exclusivo de reparo que reestabelece os gabinetes de Rafael Machado e Júlia Vianna, recompõe os perfis de magistrados titulares e resgata minutas históricas e prompts órfãos.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2 shadow-sm md:col-span-2">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-500" />
                      6. Telemetria de Tokens & Custos em Reais (R$) da Chave Nativa
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li><strong>Estimativa Monetária Precisa em Reais (R$):</strong> Cálculo em tempo real do custo financeiro do consumo de IA baseado nas tarifas oficiais da API Gemini (Prompt: US$ 0.13/1M; Saída: US$ 0.50/1M convertido para R$), exibido no total global, por gabinete e individualizado por assessor/usuário.</li>
                      <li><strong>Auditoria Particionada por Gabinete:</strong> Acompanhamento preciso do volume de tokens de Prompt (Entrada) e Candidatos (Saída) faturados na Chave Nativa da plataforma por mês de competência com ranking de consumo.</li>
                      <li><strong>Detalhamento Individual por Usuário:</strong> Visualização em gavetas expansíveis da quantidade de requisições, último acesso, custo estimado em R$, tokens consumidos e porcentagem de participação no consumo do gabinete por assessor e magistrado.</li>
                      <li><strong>Ferramenta de Importação Retroativa:</strong> O botão <em>"Importar Histórico Retroativo"</em> varre com segurança todas as minutas e análises salvas no histórico e logs passados de todos os gabinetes, consolidando o volume histórico sem risco de perda ou duplicação de dados.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AGENDA & PAUTAS DO GOOGLE */}
            {activeTab === "agenda-gabinete" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-amber-600" />
                    Agenda Oficial do Magistrado & Pautas do Gabinete
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Integração direta da Agenda Única do Google (Gmail/Workspace) do magistrado por ID ou Link para consulta de audiências, júris e pautas.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-sm text-amber-900 dark:text-amber-300">
                  <h4 className="font-bold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Agenda Única Centralizada do Magistrado
                  </h4>
                  <p className="leading-relaxed">
                    O Magistrado possui uma agenda única centralizada de audiências e compromissos. Com a integração direta por <strong>ID da Agenda</strong> ou <strong>Link de Compartilhamento do Google Calendar</strong>, toda a equipe do gabinete visualiza em tempo real a pauta oficial de audiências, júris e despachos, sem necessidade de logins OAuth adicionais.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm">
                      1
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Obter ID ou Link no Google</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      No Google Calendar do magistrado, acesse as configurações da agenda desejada, marque como pública ou compartilhe com link e copie o <strong>ID da Agenda</strong> (ex: <code>juiz@gmail.com</code> ou <code>c_xxxx@group.calendar.google.com</code>) ou o link público/código iframe.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm">
                      2
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Vincular no Assessor Judicial</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      O Administrador ou Magistrado clica em <strong>"Agenda"</strong> no cabeçalho ou no banner do juiz e insere o ID/Link no painel de configuração. O sistema aceita qualquer formato (ID, Link completo ou tag &lt;iframe&gt;).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm">
                      3
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Consulta pela Equipe</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Assessores e estagiários podem abrir a <strong>Agenda</strong> a qualquer momento para alternar visualizações (Mês, Semana, Lista de Pautas) e acompanhar audiências de instrução, perícias e plantões.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Destaques e Funcionalidades da Agenda
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <li><strong>Agenda Única do Magistrado:</strong> Sem fragmentação por comarca — uma agenda central para todo o gabinete.</li>
                    <li><strong>Modos de Exibição:</strong> Alternância rápida no modal entre visualização <em>Mensal</em>, <em>Semanal</em> e <em>Pauta/Agenda</em>.</li>
                    <li><strong>Acesso Externo Direto:</strong> Botão de atalho para abrir a agenda em aba independente ou no app do Google Agenda.</li>
                    <li><strong>Permissões Seguras:</strong> Assessores visualizam a pauta sem risco de alterar ou apagar eventos por acidente.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB: CHAVE DE API GRATUITA (SEM CUSTOS) */}
            {activeTab === "chave-api" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="w-6 h-6 text-emerald-600" />
                    Como Usar o Sistema Gratuitamente com Sua Própria Chave de API
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Guia oficial para gerar uma chave gratuita no Google AI Studio (Gemini) sem necessidade de cartão de crédito ou faturamento.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-sm text-emerald-900 dark:text-emerald-300">
                  <h4 className="font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    100% Gratuito no Nível Grátis do Google AI Studio
                  </h4>
                  <p className="leading-relaxed">
                    O Google disponibiliza uma cota gratuita generosa para modelos como o <strong>Gemini 2.5 Flash</strong> e <strong>Gemini Flash Lite</strong> através do Google AI Studio. Você não precisa assinar plano pago nem cadastrar dados bancários para obter sua chave.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      1
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Acesse o Google AI Studio</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Entre em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-semibold">aistudio.google.com/app/apikey</a> com sua conta Google (Gmail pessoal ou institucional).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      2
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Crie a Chave de API</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Clique no botão azul <strong>"Create API Key"</strong> (Criar Chave de API). Escolha um projeto padrão ou crie um novo sem configurar faturamento.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      3
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Insira no Assessor Judicial</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Copie o código da chave (iniciado por <code>AIzaSy...</code>) e cole no botão <strong>"Chave API"</strong> no topo da tela do sistema.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Sincronização na Nuvem Vinculada à Sua Conta Google & Celular
                  </h3>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <li>Ao salvar sua chave gratuita, ela fica <strong>vinculada com segurança ao seu perfil de usuário autenticado</strong> no Firestore.</li>
                    <li><strong>Sincronização Automática:</strong> ao abrir o sistema no celular, no tablet, no notebook de casa ou no computador do gabinete, sua chave é carregada automaticamente sem necessidade de digitá-la novamente.</li>
                    <li>Você pode testar a validade da chave em tempo real com o botão <strong>"Testar Conexão"</strong> e alterá-la ou removê-la a qualquer momento.</li>
                    <li><strong>Pool de Múltiplas Chaves e Failover Automático 429:</strong> Cadastre 2 ou mais chaves gratuitas na mesma conta para criar um pool resiliente. Caso o limite temporário por minuto ou diário do Google AI Studio seja atingido durante a redação de uma minuta, o sistema comuta instantaneamente para a próxima chave reserva sem interromper o serviço.</li>
                    <li><strong>Monitoramento Executivo pelo Super Admin:</strong> O Super Administrador acompanha em tempo real a integridade das chaves de todos os membros do gabinete, a volumetria de requisições diárias em relação à cota gratuita (~1.500 req/dia), o histórico de trocas automáticas e dispõe de botão com 1 clique para orientar assessores que precisem cadastrar sua 2ª chave.</li>
                    <li><strong>Governança de Acesso e Modalidade Chave Nativa:</strong> O Administrador dispõe de botão exclusivo para <strong>Ativar ou Desativar a modalidade de Chave Nativa do Gabinete</strong> tanto para sua própria conta quanto para qualquer outro usuário (administrador ou assessor). Usuários com a modalidade desativada devem cadastrar sua própria chave gratuita do Google AI Studio para operar a IA.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 2. FLUXO DE TRABALHO */}
            {activeTab === "fluxo" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-slate-900 dark:text-slate-400 mb-2">
                  <Rocket className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fluxo de Trabalho</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base">
                  O sistema opera em um ciclo contínuo de 4 etapas estruturadas:
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">1</div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Fornecimento de Autos</h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">No painel principal, insira os arquivos PDF do processo (petição inicial, contestação, documentos). O sistema extrai e indexa o texto.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">2</div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Seleção de Prompt</h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Escolha o tipo de ato (Sentença, Despacho, Decisão) no catálogo de prompts. Você pode criar novos comandos personalizados para cenários específicos.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">3</div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Injeção e Processamento</h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Ao clicar em "Gerar Minuta", o sistema compila os Autos + O Prompt Selecionado + As Teses do Gabinete (se ativas) e envia ao núcleo de IA.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">4</div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Revisão e Chat</h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">A minuta é exibida no visualizador. O assessor pode ajustá-la manualmente no "Editor Rico" ou usar o "Chat" lateral para pedir à IA que altere trechos específicos (ex: "Altere o valor do dano moral para R$ 5.000,00").</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LUPA DO MAGISTRADO & AUDITOR DE MINUTAS (FUNÇÃO DE OURO) */}
            {activeTab === "auditor-magistrado" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
                  <ShieldCheck className="w-8 h-8 text-amber-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Bancada de Tripla Conferência & Lupa do Magistrado</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono text-xs font-black uppercase">
                        Função de Ouro • Juiz & Super Admin
                      </span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Leitor do PDF dos autos, minuta de referência ideal do sistema e minuta pré-analisada do assessor lado a lado com deliberação imediata.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 space-y-2">
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    Geralmente o assessor deixa pronta a pré-análise do processo no sistema da justiça (PROJUDI). Para garantir segurança máxima e conferência ágil, o Magistrado e o Super Admin dispõem da <strong>Bancada de Tripla Conferência (Visão 360°)</strong>, que coloca lado a lado:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700">
                      <strong className="text-slate-800 dark:text-white block mb-1">📄 1. PDF dos Autos</strong>
                      Visualização gráfica real dos PDFs das peças com zoom, navegação e busca textual indexada com destaque visual.
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-300 dark:border-amber-700">
                      <strong className="text-amber-700 dark:text-amber-400 block mb-1">✨ 2. Minuta do Sistema (Gabarito)</strong>
                      Minuta estruturada gerada pelo núcleo de IA com observância rigorosa do relatório, fundamentação e dispositivo.
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-indigo-300 dark:border-indigo-700">
                      <strong className="text-indigo-700 dark:text-indigo-400 block mb-1">✍️ 3. Minuta do Assessor</strong>
                      Minuta pré-analisada do assessor com editor ao vivo e botões para Homologar, Devolver com Parecer ou Injetar no Acervo.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <Scale className="w-5 h-5" />
                      <span>1. Princípio da Congruência</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Mapeia todos os pedidos da petição inicial, contestações e pedidos contrapostos. Acusa expressamente se o assessor incorreu em julgamento <strong>citra petita</strong> (omissão), ultra petita ou extra petita.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                      <Search className="w-5 h-5" />
                      <span>2. Matriz Forense & Provas (6 Pilares)</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Auditoria cautelar em 6 pilares: autenticidade de assinaturas físicas/digitais e logs ICP/Gov.br, anacronismos temporais, integridade visual (rasuras/fontes), selos/QR codes cartorários, arts. 428/429 CPC e Tema 1049 STJ, e confronto direto PDF vs Minuta.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      <MessageSquare className="w-5 h-5" />
                      <span>3. Deliberação & Devolução</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      O Juiz pode aprovar e homologar a minuta, aplicar sugestões da IA ou devolver com parecer fundamentado pronto para envio ao assessor via WhatsApp ou e-mail.
                    </p>
                  </div>
                </div>

                {/* Estrutura das Abas e Persistência */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-500" />
                    Estrutura de Abas e Recursos de Persistência no Banco:
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <li><strong>🌟 Bancada de Tripla Conferência:</strong> Layout em 3 painéis (PDF, Gabarito e Assessor) para análise rápida e deliberação imediata do magistrado. Conta com geração sob demanda da Minuta Gabarito (botão <code>⚡ Gerar Minuta Gabarito com IA</code>), gerando uma economia superior a 50% de tokens nas análises iniciais.</li>
                    <li><strong>⚡ Otimização Extrema de Tokens e Custo:</strong> Eliminação da transmissão redundante de textos em PDF e desacoplamento da minuta referencial completa, executando o diagnóstico com máxima velocidade e sem desperdício de cota.</li>
                    <li><strong>🔍 Nova Auditoria & Limpar Tudo:</strong> Permite colar o texto do assessor, anexar PDFs, inserir diretrizes e rodar a análise. O sistema detecta automaticamente se o número de processo já possui autos salvos e oferece reaproveitá-los em 1 clique.</li>
                    <li><strong>🔄 Lançar Minuta Corrigida (Sem Reenviar PDF):</strong> Quando o assessor corrige uma minuta apontada pela auditoria, basta colar a nova redação. O sistema reaproveita instantaneamente os autos probatórios já gravados no banco de dados e executa a reauditoria automática.</li>
                    <li><strong>⚖️ Comparador Antes vs Depois (Evolução & Resolução de Alertas):</strong> Na aba de Análise da minuta corrigida, exibe para o Juiz: o delta de nota, a evolução nos 3 pilares e o status de resolução de cada alerta anterior.</li>
                    <li><strong>📜 Dossiê Unificado por Processo no Histórico:</strong> Todos os registros com o mesmo número de processo são unificados automaticamente em um único dossiê expansível.</li>
                    <li><strong>📊 Resultado & Análise:</strong> Diagnóstico 360° dividido em 5 pilares: Adstrição aos Pedidos, Choque Probatório, Preliminares & Rito, Feedback de WhatsApp e Trecho Sugerido de Correção.</li>
                    <li><strong>✍️ Visualizar & Editar Minuta:</strong> Editor completo integrado ao banco de dados para o Magistrado ajustar o texto da minuta e despachar anotações privativas.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* MINUTA PARADIGMA & CLONAGEM ESTRUTURAL */}
            {activeTab === "paradigma" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
                  <Sparkles className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Minuta Paradigma & Clonagem Estrutural (Espelho do Juiz)</h1>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <p className="text-sm text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                    A funcionalidade de <strong>Minuta Paradigma (Espelho Estrutural)</strong> permite utilizar uma decisão ou sentença anterior do próprio magistrado como molde rígido de redação, estilo, capitulação e dispositivo. A IA replica rigorosamente a arquitetura do modelo, preenchendo apenas os fatos, nomes das partes e provas do caso concreto.
                  </p>
                </div>

                {/* NOVO: DETECTOR E SUGESTOR AUTOMÁTICO DE PARADIGMA */}
                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span>Detecção e Sugestão Automática de Paradigma (IA Contextual):</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Ao anexar os PDFs dos autos ou colar o texto do processo, o sistema <strong>faz uma busca em tempo real em toda a biblioteca compartilhada de modelos de decisão do juiz</strong>. O algoritmo compara termos-chave, controvérsias de direito material (ex.: <em>Cartão RMC, Negativação Indevida, Extinção sem Resolução, Voo/Bagagem</em>) e números de processo.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <strong className="text-amber-700 dark:text-amber-400 block mb-1">1. Alerta em Destaque</strong>
                      Identificado o paradigma compatível, surge um banner âmbar informando o percentual de afinidade e as razões do match.
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <strong className="text-amber-700 dark:text-amber-400 block mb-1">2. Pré-visualização Segura</strong>
                      Você pode clicar em <em>"Ver Modelo"</em> para inspecionar o texto completo antes de decidir vincular.
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                      <strong className="text-amber-700 dark:text-amber-400 block mb-1">3. Vinculação em 1 Clique</strong>
                      Ao clicar em <em>"⚡ Vincular este Paradigma"</em>, o interruptor é ativado e a minuta modelo é definida automaticamente como molde.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      Injeção em 1 Clique (⚡ Injetar no Prompt)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Dentro do <strong>Caderno de Teses</strong> (aba <em>Modelos de Decisões do Juiz</em>) ou no <strong>Extrator de PDFs</strong>, basta clicar no botão <strong>⚡ Injetar no Prompt</strong>. O sistema ativa instantaneamente o modo paradigma e vincula a decisão como matriz da próxima análise.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      Preservação Rígida de Títulos e Grifos
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      A IA reproduz a sequência exata de tópicos (ex: <em>"1. DA PRELIMINAR DE ILEGITIMIDADE"</em>, <em>"2. DO MÉRITO E INVERSÃO DO ÔNUS"</em>, <em>"3. DO DANO MORAL IN RE IPSA"</em>), mantendo inclusive expressões típicas e o formato do dispositivo.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs">
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2 mb-1.5 text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Proteção Antiduplicação no Caderno de Teses
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Quando uma análise é gerada com um paradigma já vinculado (exibindo a tarja escura <em>"Minuta com Paradigma Vinculado"</em>), o sistema <strong>oculta automaticamente a opção e o botão "Salvar Tese"</strong> no cabeçalho e na barra flutuante. Isso evita que o assessor cadastre acidentalmente o mesmo modelo várias vezes, mantendo o banco de dados do gabinete limpo, ágil e livre de duplicatas.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 shadow-2xs">
                  <h3 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-1.5 text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Autonomia Total do Gabinete (Zero Auto-Injeção de Padrões)
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Em conformidade estrita com as diretrizes do magistrado, o sistema <strong>não realiza auto-injeção de modelos genéricos ou modelos padrão do sistema</strong> no Caderno de Teses. Todos os modelos exibidos na biblioteca pertencem exclusivamente ao gabinete. Caso existam modelos residuais de demonstração injetados previamente, um botão <em>"Limpar Modelos Padrão"</em> fica disponível no topo da aba de Modelos para expurgá-los com segurança em 1 clique.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-2">
                    Como utilizar na prática:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <li>Selecione os PDFs do processo atual na aba principal. O detector automático sugerirá o modelo ideal se já houver paradigma compatível.</li>
                    <li>No quadro <strong>Minuta Paradigma do Juiz</strong>, confirme a sugestão ou escolha manualmente um modelo existente na lista compartilhada do gabinete.</li>
                    <li>Certifique-se de que o interruptor <em>"Utilizar Paradigma como Espelho"</em> está ativado.</li>
                    <li>Clique em <strong>Executar Prompt</strong>. A minuta final manterá a alma e a estrutura da decisão do juiz aplicada ao processo novo.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* MESA DE AUDIÊNCIAS & INSTRUÇÃO JUDICIAL */}
            {activeTab === "mesa-audiencias" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
                  <Gavel className="w-8 h-8 text-amber-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Mesa de Audiências & Instrução Judicial</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono text-xs font-black uppercase">
                        Em Construção • Homologação Super Admin
                      </span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Copiloto probatório, roteiro de perguntas para o Juiz, deliberações orais prontas e sentenças proferidas em mesa.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 space-y-2">
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    Durante as audiências de instrução e conciliação, o Magistrado e seus assessores necessitam de agilidade extrema e precisão procedimental. O <strong>Módulo da Mesa de Audiências</strong> foi desenvolvido de forma 100% desacoplada e independente da estrutura existente, operando como um painel lateral ou modal amplo focado na presidência dos atos:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-amber-500" />
                      1. Briefing & Fatos Controvertidos (Art. 373 CPC)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Ao colar a petição inicial ou contestação, a IA isola em segundos o que realmente é <strong>ponto controvertido que depende de prova oral</strong>, distribuindo expressamente o ônus probatório (autor, réu, inversão do CDC ou carga dinâmica), eliminando discussões inúteis na mesa.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      2. Roteiro de Inquirição & Oitiva de Testemunhas
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Cadastro dos depoentes (testemunhas do autor, testemunhas do réu, informantes). Geração de perguntas cirúrgicas para o Magistrado inquirir cada testemunha sobre o fato pontual alegado, com campo de anotações em tempo real e marcação de status (Aguardando, Inquirido, Contraditado, Dispensado).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                      <Gavel className="w-4 h-4 text-emerald-500" />
                      3. Deliberações Rápidas na Ata (1 Clique)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Modelos inteligentes e prontos para inserção imediata no termo:
                      <br />• <strong>Acordo Total ou Parcial</strong> com valor, parcelamento, chave PIX, cláusula penal, renúncia mútua e rateio de custas.
                      <br />• <strong>Decretação de Revelia</strong> do art. 344 do CPC com presunção de veracidade.
                      <br />• <strong>Contradita de Testemunha</strong> (art. 457, § 1º) e indeferimento de perguntas impertinentes (art. 459 CPC).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      4. Sentença em Mesa (Julgamento Oral Imediato)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Para audiências que encerram com julgamento imediato no pregão (Juizados Especiais ou rito comum): a IA redige a sentença completa em texto corrido contínuo (relatório conciso, fundamentação valorando os depoimentos colhidos e dispositivo imperativo formal).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                      <FileSignature className="w-4 h-4 text-indigo-500" />
                      5. Ata de Audiência & Termo de Assentada (Aba 5)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Central completa de confecção do Termo de Audiência:
                      <br />• <strong>Pregão & Presenças Automatizados:</strong> Qualificação do autor, réu, preposto, patronos com OAB, Ministério Público e registro de ocorrências/protestos.
                      <br />• <strong>Importação Rápida entre Abas:</strong> Puxe para dentro da ata com 1 clique a deliberação/acordo da Aba 3, a sentença da Aba 4 ou os depoimentos inquiridos da Aba 2.
                      <br />• <strong>Redação Completa por IA & Esqueleto Padrão:</strong> Consolida todo o ato em formato contínuo e formal.
                      <br />• <strong>Exportação Multiformato:</strong> Copiar para o PROJUDI/PJe, baixar em Word (.docx) formatado ou imprimir.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-2">
                    Política de Acesso e Homologação:
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    O módulo encontra-se temporariamente etiquetado como <strong>Em Construção</strong>, visível e liberado para o <strong>Super Admin</strong> testar e calibrar. Assim que validado, o acesso será estendido de forma irrestrita a todos os magistrados e assessores do sistema sem qualquer alteração na base existente.
                  </p>
                </div>
              </div>
            )}

            {/* CONSECTÁRIOS & AUDITORIA FATO VS PROVA */}
            {activeTab === "consectarios-fatos" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                  <Scale className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Consectários Legais & Auditoria Fato vs. Prova</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
                  Ferramentas integradas para blindar o dispositivo de sentenças condenatórias e assegurar que toda afirmação factual tenha lastro documental irrefutável.
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20">
                    <h3 className="font-bold text-indigo-950 dark:text-indigo-200 mb-2 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Calculadora de Consectários Legais (Juros e Correção)
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                      Localizada na aba <strong>Consectários</strong> da minuta gerada, automatiza a redação precisa das regras de correção monetária e juros moratórios de acordo com as súmulas dos Tribunais Superiores:
                    </p>
                    <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <li><strong>Danos Morais:</strong> Correção pelo INPC a partir do arbitramento (Súmula 362/STJ) e Juros de 1% ao mês ou SELIC conforme responsabilidade contratual (citação - art. 405 CC) ou extracontratual (evento danoso - Súmula 54/STJ).</li>
                      <li><strong>Danos Materiais:</strong> Correção a partir do efetivo prejuízo (Súmula 43/STJ) e juros a partir da citação/evento.</li>
                      <li><strong>Copiar Dispositivo Pronto:</strong> Gera a cláusula final padronizada para inclusão direta no dispositivo da sentença.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Quadro de Auditoria Fato vs. Prova
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Na aba <strong>Fato vs Prova</strong>, a IA monta uma tabela analítica confrontando as alegações da Petição Inicial e da Contestação com os documentos acostados aos autos (ID do Projudi, extratos, contratos, comprovantes de pagamento e prints), apontando preclusões, confissões e ausência de prova indispensável (art. 373 do CPC).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. 1º MODELO, VERSÕES E COMPARADOR */}
            {activeTab === "versoes-comparacao" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
                  <Scale className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">1º Modelo Original, Versões & Comparador</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
                  Para garantir total segurança e precisão jurídica, o <strong>Assessor Judicial</strong> implementa uma arquitetura de preservação estrita de versões: nenhuma alteração sobrescreve ou apaga a minuta inicial gerada.
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20">
                    <h3 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-center text-xs font-bold">1</span>
                      Preservação do 1º Modelo Original (Aba "1º Modelo Original")
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      No instante em que a IA gera a minuta inicial, ela é armazenada como <strong>Modelo Base Intocável</strong>. Mesmo que você faça dezenas de perguntas ao Assistente, peça para reescrever o dispositivo ou edite no Editor Rico, a aba <em>"1º Modelo Original"</em> permanece 100% preservada e pronta para restauração imediata.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-950/20">
                    <h3 className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 flex items-center justify-center text-xs font-bold">2</span>
                      Comparador Lado a Lado (Aba "Comparar Versões")
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      Permite colocar duas versões lado a lado (ex: o <strong>1º Modelo Original</strong> versus a <strong>Minuta Atual com Refinos do Chat</strong>). O sistema destaca alterações em Relatório, Fundamentação e Dispositivo para que você avalie qual redação atende melhor aos autos. Em cada lado, há botões rápidos para <em>Copiar</em>, <em>Exportar Word</em> ou <em>Definir como Minuta Ativa</em>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold">3</span>
                      Histórico Cronológico de Versões (Aba "Histórico de Versões")
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Cada refino solicitado no chat ou edição no editor cria automaticamente uma nova entrada numerada com carimbo de data/hora, resumo da solicitação e autor. Você pode alternar ou restaurar qualquer versão com um clique.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. GUIA PROJUDI DO GABINETE */}
            {activeTab === "projudi-guia" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
                  <FileText className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Guia de Lançamentos e Diretrizes PROJUDI</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
                  O <strong>Guia PROJUDI</strong> é o repositório oficial de códigos de movimentação, rotinas de triagem, modelos de certidões e instruções de cumprimento de atos de secretaria.
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20">
                    <h3 className="font-bold text-blue-950 dark:text-blue-200 mb-1 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-600" />
                      Indicação Automática de Tipo de Movimentação TPU CNJ no PROJUDI / PJe
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      Ao gerar qualquer minuta (Sentença, Decisão Interlocutória ou Despacho), o sistema analisa o teor do dispositivo judicial e infere automaticamente o <strong>Código TPU CNJ</strong> (Tabelas Processuais Unificadas do Conselho Nacional de Justiça), a descrição do movimento, a fila sugerida na secretaria de vara, o prazo legal aplicável e as orientações cartorárias de cumprimento.<br />
                      Na aba <strong>Texto Projudi & TPU CNJ</strong> do visualizador da minuta, a equipe dispõe de uma ficha pronta com o botão <em>Copiar Código TPU</em> e <em>Copiar Ficha PROJUDI</em> para lançamento ágil em 1 clique.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20">
                    <h3 className="font-bold text-blue-950 dark:text-blue-200 mb-1">Como acessar e consultar o Guia:</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Clique no botão <strong>Guia PROJUDI</strong> na barra superior do sistema ou acesse a aba <strong>PROJUDI</strong> dentro do painel de resultado da minuta. Lá você encontrará as orientações para lançamentos de sentenças (extinção com ou sem mérito), tutelas de urgência, prazos e cumprimento.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Edição Centralizada (Administradores):</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Usuários com perfil de Administrador podem clicar em <strong>Editar Diretrizes</strong> na janela do Guia PROJUDI para acrescentar novos códigos de movimento CNJ ou portarias internas do gabinete. A alteração é salva no Firestore e fica disponível imediatamente para toda a equipe.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. MULTIUSUÁRIO & ATUALIZAÇÕES EM TEMPO REAL */}
            {activeTab === "multiusuario-atualizacoes" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 mb-2">
                  <Users className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ambiente Multiusuário e Atualizações em Tempo Real</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
                  O sistema foi desenhado para ambientes onde múltiplos assessores, juízes e estagiários utilizam o sistema simultaneamente.
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20">
                    <h3 className="font-bold text-emerald-950 dark:text-emerald-200 mb-1 flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-600" />
                      Banco Compartilhado vs. Histórico Individual Privado
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>• Recursos Compartilhados na Nuvem (Gabinete):</strong> Todos os <strong>Modelos Paradigmas do Juiz</strong>, <strong>Caderno de Teses Vinculantes</strong>, <strong>Gerenciador de Prompts</strong>, <strong>Base de Conhecimento RAG</strong> e <strong>Guia PROJUDI</strong> são 100% compartilhados e sincronizados em tempo real entre toda a equipe. Qualquer modelo ou tese inserida por um usuário fica imediatamente acessível para todos os demais membros.<br/>
                      <strong>• Histórico Individual Seguro:</strong> O <strong>Histórico de Processos e Minutas Analisadas</strong> é exclusivo de cada usuário, preservando o sigilo das análises em andamento e dos rascunhos de cada assessor.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-900/40 bg-slate-50/60 dark:bg-slate-900/20">
                    <h3 className="font-bold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-slate-900" />
                      Auto-Save Contínuo de Rascunhos (Nenhum Trabalho é Perdido)
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      Cada caractere digitado, número de processo, PDF inserido, chat realizado e versão de minuta gerada são gravados continuamente em cache resiliente. Se a página for recarregada ou o servidor reiniciado durante uma republicação, o sistema restaura automaticamente o rascunho ativo.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/20">
                    <h3 className="font-bold text-purple-950 dark:text-purple-200 mb-1">
                      Painel de Broadcast & Notificação de Atualizações
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      O administrador do gabinete pode disparar um comunicado em tempo real no menu <strong>Equipe / Gerenciar Equipe</strong> avisando que o sistema receberá uma nova versão ou entrará em manutenção breve. Todos os usuários logados recebem uma tarja de aviso destacada no topo da tela instantaneamente, assegurando previsibilidade e tranquilidade.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                      O que fazer ao republicar uma nova versão?
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1.5 mt-2">
                      <li>O administrador pode acionar o aviso prévio de 2 minutos pelo painel de equipe.</li>
                      <li>Ao republicar no AI Studio, os assessores que estão trabalhando não perdem suas minutas graças ao auto-save de sessão.</li>
                      <li>Ao término do carregamento da nova versão, uma barra no topo confirmará: <em>"Sessão anterior recuperada automaticamente"</em>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 6. TESES DO GABINETE & MODELOS DE DECISÕES */}
            {activeTab === "teses" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 mb-2">
                  <Scale className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Caderno de Teses & Modelos do Gabinete</h1>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
                    A janela do <strong>Caderno de Teses do Gabinete</strong> é dividida em duas ferramentas essenciais: o <strong>Caderno de Teses Normativas</strong> (injeção de regras prioritárias na IA) e a aba de <strong>Modelos de Decisões do Juiz</strong> (biblioteca categorizada com o texto integral das decisões do magistrado).
                  </p>
                </div>
                
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mt-4">1. Aba "Caderno de Teses Normativas" (Injeção Obrigatória/Universal):</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><strong>🚨 Injeção Global na IA:</strong> As teses e regras listadas nesta aba são injetadas em <strong>todas as minutas e análises</strong> da equipe (quando ativadas). Elas servem como leis do sistema.</li>
                  <li><strong>Lançamento Estruturado:</strong> Clique em <em>"Inserir Novo Lançamento"</em> para adicionar regras gerais, estrutura padronizada, ou limites de valores (ex: dano moral máximo).</li>
                  <li><strong>Prioridade Absoluta:</strong> Garante que os comandos básicos e entendimentos universais consolidados pelo magistrado sejam seguidos rigorosamente.</li>
                </ul>

                <h3 className="font-bold text-slate-800 dark:text-slate-200 mt-4">2. Aba "⚖️ Modelos de Decisões do Juiz" (Injeção Sob Demanda/Específica):</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><strong>📌 Aplicação Específica:</strong> Ao contrário das Teses Normativas, os Modelos são usados apenas quando você deseja espelhar a redação de um caso idêntico (via botão <em>"⚡ Injetar no Prompt"</em>).</li>
                  <li><strong>Organização por Tipo de Decisão:</strong> Classifique as decisões em <em>Procedência Total</em>, <em>Improcedência</em>, <em>Parcial Procedência</em>, <em>Extinção sem Resolução</em>, <em>Tutelas Deferidas/Indeferidas</em> e <em>Despachos/Interlocutórias</em>.</li>
                  <li><strong>Texto Integral Pronto para Uso:</strong> Cada modelo conta com seu relatório, fundamentação e dispositivo completos.</li>
                  <li><strong>Copiar com 1 Clique:</strong> Botão rápido para copiar o texto integral da decisão e colar no PROJUDI ou onde desejar.</li>
                  <li><strong>Busca & Filtros Rápidos:</strong> Localize decisões anteriores por número de processo, ramo do direito ou palavras-chave no texto.</li>
                </ul>

                <h3 className="font-bold text-slate-800 dark:text-slate-200 mt-4">3. ⚡ Injeção Rápida por Seleção de Texto (PROJUDI / Minuta):</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><strong>Seleção com o Mouse:</strong> Ao ler qualquer texto nas abas <em>"Texto Projudi"</em>, <em>"Minuta Formatada"</em> ou <em>"1º Modelo Original"</em>, basta selecionar o parágrafo ou fundamentação desejada com o cursor.</li>
                  <li><strong>Botão Flutuante Instantâneo:</strong> Aparecerá automaticamente o botão <strong>⚡ "Injetar no Caderno de Teses do Gabinete"</strong> sobre a seleção.</li>
                  <li><strong>Pré-preenchimento Automático Inteligente:</strong> O sistema abre a janela de cadastro já com o <em>Texto Selecionado</em>, o <em>Número do Processo</em> dos autos, o <em>Ramo do Direito</em> e o <em>Tipo de Decisão</em> pré-classificados.</li>
                  <li><strong>Salvamento em Segundos:</strong> Basta conferir o título sugerido e clicar em <em>"Salvar Modelo"</em>.</li>
                </ul>

                <h3 className="font-bold text-indigo-900 dark:text-indigo-400 mt-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>4. ✨ Aba "Varredura Automática do Gabinete" (Mineração por IA & Anti-Duplicação):</span>
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li><strong>Varredura Multitenant Segura:</strong> A IA varre todas as decisões históricas e modelos paradigmas salvos exclusivamente no gabinete e unidade ativos, respeitando com rigor o isolamento de dados.</li>
                  <li><strong>Mineração Estruturada de Verbetes:</strong> A IA extrai hipóteses fáticas (.1), critérios de prova (.2), consequências jurídicas (.3) e consectários/precedentes (.4) formatados no padrão do tribunal.</li>
                  <li><strong>Blindagem Anti-Duplicação:</strong> Validação em tempo real (no servidor e cliente) que compara as teses sugeridas com o que já existe no Caderno de Teses, rotulando com precisão as teses inéditas e bloqueando duplicações de matérias semelhantes.</li>
                  <li><strong>Ações em Lote e Ajuste Fino:</strong> Selecione múltiplas teses para injetar sequencialmente no Caderno ou salvar nos Modelos do Juiz com 1 clique, ou edite os campos antes da inserção.</li>
                </ul>

                <div className="mt-4 p-4 bg-slate-900 rounded-lg text-slate-400 font-mono text-xs overflow-x-auto">
                  1. CARTÃO RMC - IMPROCEDÊNCIA (PROCESSO DE REFERÊNCIA Nº 5123456-78.2024.8.09.0105)<br/>
                  1.1. Hipótese: Comprovada TED e uso contínuo do cartão, reputam-se legítimos os descontos.<br/>
                  1.2. Prova: Faturas anexadas com compras e saques.<br/>
                  1.3. Dispositivo: Julgo improcedentes os pedidos (art. 487, I, CPC).
                </div>
              </div>
            )}

            {/* 4. GERENCIADOR DE PROMPTS */}
            {activeTab === "prompts" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 mb-2">
                  <Terminal className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gerenciador de Prompts</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base">
                  Diferente das Teses (que são universais), os Prompts são instruções pontuais de formato. Eles dizem à IA <em>como estruturar o documento</em> e qual o objetivo principal da análise.
                </p>

                <div className="space-y-4 mt-6">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                      <Search className="w-4 h-4 text-purple-500" /> Prompts do Sistema vs Customizados
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">O sistema já possui modelos prontos (Sentença Juizado, Despacho Saneador, Sentença Embargos). Você pode criar os seus próprios clicando em <strong>Gerenciar Meus Prompts</strong>.</p>
                  </div>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-purple-500" /> Tags de Fase Processual
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Ao criar um prompt, classifique-o (Fase de Conhecimento, Execução, etc.). Isso ajuda a organizar a lista quando o sistema estiver escalado.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BASE DE CONHECIMENTO */}
            {activeTab === "conhecimento" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-teal-600 dark:text-teal-400 mb-2">
                  <Database className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Base de Conhecimento</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base">
                  A seção de <strong>Repositório & RAG</strong> permite fazer upload de acórdãos, manuais do tribunal, ou doutrinas de referência em PDF.
                </p>

                <ul className="list-disc list-inside space-y-2 mt-4 text-sm text-slate-600 dark:text-slate-400">
                  <li>Estes arquivos <strong>não</strong> são peças do processo (não são lidos para extrair fatos das partes).</li>
                  <li>Eles servem como "biblioteca" para a IA pesquisar.</li>
                  <li>Selecione as caixas de seleção (checkbox) dos documentos da Base de Conhecimento que você quer que a IA leia antes de gerar a minuta atual.</li>
                </ul>

                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-2 mt-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Repositório de Súmulas & Informativos de Jurisprudência TJGO
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Além dos arquivos de doutrina e acórdãos enviados manualmente, o sistema conta com a base automatizada <strong>"Súmulas & TJGO"</strong> na barra lateral. Ela abrange as súmulas e teses vinculantes do STF, STJ e TNU, além dos verbetes e informativos de jurisprudência oficial do TJGO, que são filtrados e injetados de forma autônoma na análise das minutas do gabinete.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/20 space-y-2 mt-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-600" />
                    Camada Híbrida: Grounding Oficial ao Vivo (Google Search em Fontes Oficiais)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Para matérias atípicas, novas súmulas ou teses que não estejam no catálogo estático, o sistema conta com a <strong>Camada Grounding ao Vivo</strong>. Ao ser ativada no modal de precedentes vinculantes, o motor de IA faz uma busca instantânea restrita aos portais oficiais (<em>transparencia.tjgo.jus.br/jurisprudencia</em>, <em>tjgo.jus.br</em>, <em>stj.jus.br</em> e <em>stf.jus.br</em>), recupera os acórdãos mais recentes com links oficiais e os injeta diretamente no Stage 2 da fundamentação jurídica.
                  </p>
                </div>
              </div>
            )}

            {/* 6. EDITOR E CHAT */}
            {activeTab === "editor" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-pink-600 dark:text-pink-400 mb-2">
                  <MessageSquare className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Editor e Interação</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base">
                  Após a geração da minuta, a tela de revisão apresenta ferramentas essenciais para o assessor judicial finalizar o documento.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Visualização Formatada</h3>
                    <p className="text-xs text-slate-500">Exibição elegante, separada por Relatório, Fundamentação e Dispositivo.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Editor Rico</h3>
                    <p className="text-xs text-slate-500">Editor de texto (estilo Word) para você modificar a minuta livremente. Suporta negrito, listas e tabelas.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">HTML Projudi</h3>
                    <p className="text-xs text-slate-500">Gera automaticamente o código HTML pronto para copiar e colar no sistema Projudi do Tribunal.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Chat de Ajuste Fino</h3>
                    <p className="text-xs text-slate-500">Barra lateral para conversar com o documento. Ex: "Aumente os honorários para 15%". A IA reescreverá a minuta aplicando a ordem.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. VERSIONAMENTO E COLABORAÇÃO */}
            {activeTab === "versionamento" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                  <Users className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Versões e Colaboração</h1>
                </div>
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 mb-6">
                  <p className="text-sm text-indigo-900 dark:text-indigo-200">
                    Para expandir o uso da ferramenta para outros gabinetes ou integrar a equipe de TI, o ambiente de desenvolvimento possui recursos nativos de colaboração.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                      <GitBranch className="w-5 h-5 text-indigo-500" /> Exportação para GitHub (Versões de Código)
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Se você precisa que desenvolvedores contribuam com o código-fonte (para adicionar integração de login único TJGO, ou salvar dados em banco SQL PostgreSQL/Supabase):
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>No ambiente de desenvolvimento do AI Studio, vá ao menu de configurações.</li>
                      <li>Clique em <strong>Exportar para GitHub</strong>.</li>
                      <li>Isso criará um repositório git onde a equipe técnica poderá criar <em>branches</em> e enviar "Pull Requests".</li>
                    </ul>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800" />

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-indigo-500" /> Compartilhamento de Links (Testes de Usuário)
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Para convidar outros assessores ou juízes para testar a ferramenta sem precisarem ver o código:
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>Use a função <strong>Share (Compartilhar)</strong> no AI Studio para gerar um link público.</li>
                      <li>Seu link atual (Shared App URL) é a versão estável para a equipe usar.</li>
                      <li>Se você pedir alterações à IA, apenas a versão "Development App URL" é afetada até você publicar novamente.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 8. CHANGELOG */}
            {activeTab === "changelog" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 mb-2">
                  <FileText className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Registro de Modificações</h1>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 mb-6">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Acompanhe aqui as últimas evoluções, ferramentas adicionadas e ajustes feitos no sistema <strong>Assessor Judicial</strong>.
                  </p>
                </div>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                  
                  {/* Item: Auto-Extração e Cadastro de Partes & Julgamento de Embargos de Declaração */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                          <span>Auto-Extração e Cadastro Automático de Partes & Julgamento de Questões Pendentes (Embargos de Declaração)</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">INTELIGÊNCIA PROCESSUAL</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Extração e Cadastro Automático sem Intervenção Manual:</strong> Ao carregar o PDF dos autos, o sistema extrai instantaneamente na camada do navegador e do servidor o número do processo (formato CNJ completo), o nome do Promovente (Autor/Embargante/Exequente) e do Promovido (Réu/Embargado/Executado), cadastrando-os automaticamente na tela e nos dados da minuta.<br />
                        • <strong>Observância Fiel da Marcha Processual e Questões Pendentes:</strong> O motor de análise agora examina a ordem cronológica dos autos e proíbe a prolação de nova sentença se o processo já tiver sido sentenciado. Se houver Embargos de Declaração pendentes de apreciação (ex.: mov. 55) ou orientação específica do prompt, o sistema redige a <em>Decisão/Julgamento de Embargos de Declaração</em>, analisando a tempestividade (art. 1.023 do CPC) e enfrentando minuciosamente cada omissão, contradição, obscuridade ou erro material apontado.<br />
                        • <strong>Card Informativo de Validação Imediata:</strong> Exibição de painel visual logo abaixo da área de upload confirmando os dados cadastrados automaticamente e a fase processual identificada.
                      </p>
                    </div>
                  </div>

                  {/* Item: Ajuste Direto de Partes & Blindagem de Cota e Extração */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                          <span>Ajuste Direto de Dados do Autor/Partes & Blindagem de Cota por Minuto</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">DADOS & RESILIÊNCIA</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Ajuste Direto das Partes (Promovente / Promovido / Autos):</strong> Botão de ação rápida <em>"Ajustar Dados do Autor / Partes"</em> integrado diretamente no cabeçalho de identificação dos autos e no Editor de Minutas, permitindo retificar o nome do autor, réu e número CNJ instantaneamente com salvamento persistente no histórico e no Firestore.<br />
                        • <strong>Blindagem Semântica Anti-Captura de Predicados:</strong> Novo filtro léxico e regex estrita com pontuação obrigatória que impede que narrativas fáticas (ex.: <em>"manteve união afetiva com o requerido"</em>, <em>"aduz que contratou..."</em>) sejam indevidamente extraídas como nome de partes.<br />
                        • <strong>Resfriamento de Cota & Backoff Inteligente para Chaves Gratuitas:</strong> Intervalo preventivo de resfriamento entre a Etapa 1 e Etapa 2 (2.5s) e pausa automática com retry progressivo (6s) em caso de erro 429 (Rate Limit / Quota Exceeded), evitando que requisições em processos pesados estourem o limite por minuto da camada gratuita do Google Gemini.
                      </p>
                    </div>
                  </div>

                  {/* Item: Reativação da Esteira em Duas Etapas (Two-Stage Pipeline) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Reativação Oficial da Esteira em Duas Etapas (Two-Stage Pipeline: Assessor Fático &rarr; Juiz Revisor)</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">DENSIDADE MÁXIMA</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Etapa 1: O "Assessor Fático" (Extração e Confronto Bruto):</strong> O modelo atua estritamente como assessor fático-processual e analista probatório, sem tentar resumir. Extrai o Relatório cronológico minucioso de cada evento/movimentação (Mov. X, Arq. Y, Pág. Z) e estrutura a Fundamentação fática rigorosamente nos <strong>7 blocos obrigatórios</strong> em 5 a 8 parágrafos densos (regularidade processual, cerne da controvérsia, regime legal, confronto fático-probatório concreto documento a documento com transcrição literal de laudos/contratos entre aspas, subsunção motivada, julgamento individualizado de cada pedido e consectários da Lei 14.905/2024).<br />
                        • <strong>Etapa 2: O "Juiz Revisor" (Teses, Súmulas & Matriz Forense):</strong> O modelo atua como Juiz Revisor Especialista. Lê a minuta preliminar fática e confronta-a com o <strong>Caderno de Teses do Gabinete</strong>, <strong>Súmulas Vinculantes (STF, STJ, TNU e TJGO)</strong>, <strong>Grounding oficial ao vivo</strong> e <strong>Minuta Paradigma</strong> (com clonagem de estilo e isolamento fático estrito), adensando a fundamentação magistral e gerando a <strong>Matriz de Auditoria Forense Completa</strong> (Fato vs Prova, Competência, 6 Pilares de Integridade Documental e Pré-Auditoria).<br />
                        • <strong>Restauração dos Schemas Ricos com Descrições Mandatórias:</strong> Os schemas de saída do Gemini agora contêm descrições detalhadas e exaustivas para cada campo, eliminando respostas telegráficas ou resumos curtos.<br />
                        • <strong>Blindagem Concorrente contra Timeouts e Telemetria Transparente:</strong> O pulso de batimento cardíaco (heartbeat streaming) permanece ativo durante ambas as etapas, e os tokens de entrada e saída das duas fases são somados de forma fidedigna nas métricas e custos de IA.
                      </p>
                    </div>
                  </div>

                  {/* Item: Blindagem Ativa contra Timeout em Autos Pesados (HTTP Heartbeat Streaming & Conexão Contínua) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Blindagem Ativa contra Timeout em Autos Pesados (Heartbeat Streaming)</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">INFRAESTRUTURA</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Transmissão Contínua (HTTP Chunked Streaming):</strong> O endpoint de geração de minutas estabelece imediatamente conexão contínua com pulso de batimento cardíaco (heartbeat) a cada 3 segundos, mantendo a conexão ativa e impedindo que proxies de rede e o Cloud Run encerrem requisições durante a leitura de processos de 400+ páginas.<br />
                        • <strong>Ampliação de Timeouts do Servidor (10 Minutos):</strong> Timeouts de conexão estendidos para suportar dossiês processuais massivos com centenas de documentos.<br />
                        • <strong>Autocorreção e Reparo de Estrutura no Cliente:</strong> O navegador agora conta com recuperador resiliente de JSON capaz de reconstituir dados de resposta mesmo em caso de truncamento ou oscilação de pacotes.
                      </p>
                    </div>
                  </div>

                  {/* Item: Resgate Cirúrgico da Fundamentação Jurídica Raiz e Desacoplamento de Burocracias Secundárias */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Resgate Cirúrgico da Fundamentação Jurídica Raiz & Desacoplamento Burocrático</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">EXCELÊNCIA JUDICANTE</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-800 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Foco Neural Total na Minuta (CPC, Mérito e Provas):</strong> Eliminação da sobrecarga de contexto ("prompt bloat") que forçava a IA a preencher dezenas de campos secundários e burocráticos. A inteligência jurídica agora direciona 100% da sua capacidade e cota de saída exclusivamente para a redação densa, magistral e articulada do <em>I - Relatório</em>, <em>II - Fundamentação</em> e <em>III - Dispositivo</em>.<br />
                        • <strong>Preservação e Fortalecimento do Caderno de Teses e Paradigma:</strong> O Caderno de Teses do Gabinete, as Súmulas do TJGO/STJ e os Modelos Paradigmas do magistrado foram purificados contra poluição de códigos brutos de secretaria, sendo aplicados com máxima profundidade e espaço no texto decisório.<br />
                        • <strong>Desacoplamento Determinístico:</strong> Dados de auditoria, classificações TPU e checklists secundários passam a ser estruturados com perfeição pelo próprio servidor, sem concorrer com a capacidade de raciocínio da IA ou apequenar a fundamentação da sentença.
                      </p>
                    </div>
                  </div>

                  {/* Item: Detecção Mandatória de Petição Inicial, Rigor em Decisões Liminares e Blindagem no Chat */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Detecção Mandatória de Petição Inicial Isolada, Rigor em Liminares & Blindagem no Chat</span>
                          <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">INTELIGÊNCIA JURÍDICA</span>
                        </h3>
                        <time className="text-xs font-mono text-blue-800 dark:text-blue-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Detecção Automática Mandatória de Fase Inicial (Petição Inicial Isolada):</strong> Quando os autos contêm apenas a petição inicial sem contestação apresentada ou audiência realizada (diferenciando os pedidos de estilo da exordial de peças defensivas reais), o sistema proíbe automaticamente a prolação de sentença de mérito, enquadrando compulsoriamente o ato como <em>Decisão Interlocutória</em> (se houver pedido de tutela provisória/urgência/liminar) ou <em>Despacho Inicial</em>.<br />
                        • <strong>Injeção de Rigor Exaustivo nas Decisões Interlocutórias:</strong> As decisões interlocutórias de tutela de urgência passam a contar com diretrizes obrigatórias de exaustividade nos termos do art. 300 do CPC (probabilidade do direito com exame probatório, perigo de dano concreto, reversibilidade, gratuidade da justiça, fixação de astreintes e ordem de citação/audiência do art. 334 do CPC), eliminando decisões curtas ou genéricas.<br />
                        • <strong>Blindagem no Chat (/api/chat-agaia):</strong> Ao solicitar ajustes ou conversão de atos judiciais pelo chat, o assistente agora opera sob proibição absoluta de respostas monoparágrafo ou sucintas, gerando fundamentações magistrais e dispositivos completos e recompilando a íntegra da minuta.
                      </p>
                    </div>
                  </div>
                  
                  {/* Item: Blindagem de Minutas Densas, Auto-Reparo Estrutural e Transparência do Caderno de Teses */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Blindagem de Minutas Exaustivas, Auto-Reparo Estrutural & Auditoria do Caderno de Teses</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTABILIDADE</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Blindagem e Auto-Reparo Estrutural da Minuta:</strong> Implementação de mecanismo inteligente de sanitização e recomposição de seções (`I - Relatório`, `II - Fundamentação` e `III - Dispositivo`), eliminando riscos de fragmentação ou resíduos de sintaxe técnica. Minutas longas e robustas preservam integridade sem truncamento.<br />
                        • <strong>Auditoria Explícita das Teses do Gabinete:</strong> Exibição detalhada de cada diretriz e tese aplicada diretamente na visualização da decisão judicial e no painel de Pré-Auditoria Forense, com certificação individualizada das diretrizes do magistrado.<br />
                        • <strong>Resiliência e Failover Imediato na Esteira de Modelos:</strong> Rotação inteligente instantânea sob picos de demanda ou quotas específicas de modelos da API Gemini, mantendo o fluxo contínuo de trabalho do gabinete sem interrupções.
                      </p>
                    </div>
                  </div>

                  {/* Item: Sentença Exaustiva (Gemini 3.8 Flash • 16k Tokens) & Visibilidade Total do Caderno de Teses e TPU */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Sentença Exaustiva (Motor 3.8 Flash • 16k Tokens) & Confirmação de Teses e TPU</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">APRIMORAMENTO</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Elevação do Motor Judicante (Gemini 3.8 Flash):</strong> O motor de geração foi atualizado para operar prioritariamente com o modelo de alta inteligência <em>Gemini 3.8 Flash</em> com limite de saída expandido para <strong>16.384 tokens</strong>. Foi eliminada a síntese curta de sentenças, assegurando minutas densas, completas e profundas com cumprimento integral do art. 489, § 1º, do CPC (relatório cronológico detalhado, fundamentação magistral enfrentando todas as preliminares e provas, e dispositivo exauriente).<br />
                        • <strong>Confirmação Visual do Caderno de Teses do Gabinete:</strong> Quando o gabinete possui teses vinculantes ativas, o sistema exibe agora de forma explícita o <em>Banner de Confirmação</em> ("Caderno de Teses do Gabinete Aplicado"), badge correspondente na caixa de metadados da minuta e certificação de aplicação no Pilar 6 da Pré-Auditoria Forense.<br />
                        • <strong>Classificação TPU CNJ na Minuta e no PROJUDI:</strong> Indicação destacada da movimentação oficial do CNJ no cabeçalho do documento e ficha completa com cópia rápida para a secretaria de vara na aba Texto Projudi.
                      </p>
                    </div>
                  </div>

                  {/* Item: Indicação Tipo de Movimentação TPU CNJ no PROJUDI & Vínculo de Modelos e Teses do Gabinete */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Indicação TPU CNJ no PROJUDI, Vínculo de Modelos/Teses & Concluir Atualização</span>
                          <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO RECURSO</span>
                        </h3>
                        <time className="text-xs font-mono text-blue-800 dark:text-blue-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Indicação de Movimentação TPU CNJ (PROJUDI / PJe):</strong> Toda minuta gerada (Sentença, Decisão ou Despacho) agora inclui automaticamente a classificação oficial do Conselho Nacional de Justiça: Código TPU (ex.: 219 para Procedência, 220 para Improcedência, 221 para Parcial, 22 para Extinção, 25 para Tutela Deferida, 480 para Saneamento e 11010 para Despacho), nome do movimento, fila sugerida na secretaria de vara, prazo processual e ficha completa de lançamento com botões de cópia direta de 1 clique na aba <em>Texto Projudi & TPU CNJ</em>.<br />
                        • <strong>Vínculo de Modelos e Teses do Gabinete nas Minutas:</strong> Adicionado botão direto <strong>⚡ Injetar no Prompt</strong> em cada card da biblioteca de Modelos Paradigmas do Magistrado (Aba 2 do Caderno). A injeção tanto das Teses Vinculantes quanto dos Modelos de Casos Idênticos foi blindada com prioridade máxima no prompt estruturado da IA.<br />
                        • <strong>Botão "Concluir Atualização" Resiliente e Instantâneo:</strong> O botão de conclusão de atualização foi estabilizado com salvamento redundante no Firestore, localStorage e broadcast de eventos, e também inserido diretamente na tarja de aviso de atualização para desativação em 1 clique por administradores.
                      </p>
                    </div>
                  </div>

                  {/* Item: Modo de Atualização do Sistema (1-Clique), Seletor de Tipo de Minuta & Análise Judicial Exaustiva */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Modo de Atualização, Seletor de Tipo de Minuta & Rigor Exaustivo</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO RECURSO</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-800 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Modo de Atualização do Sistema (1-Clique no Super Admin):</strong> Botão direto no topo do Painel Super Admin e na aba de Comunicados. Ao acionar, o sistema entra em Modo de Atualização, dispara snapshot automático do banco de dados e exibe banner em tempo real informando a todos os usuários sobre instabilidade temporária, garantindo o salvamento ininterrupto de rascunhos. Com mais um clique, o administrador conclui a atualização e desativa o aviso.
                        <br />• <strong>Seletor de Tipo de Minuta (Auto-Detectar, Sentença, Decisão e Despacho):</strong> Seletor interativo logo acima da inserção dos autos. Se o assessor carregar apenas a Petição Inicial (sem contestação nos autos), a inteligência artificial detecta a fase postulatória e elabora a Decisão Interlocutória (liminar/tutela de urgência, gratuidade e citação) ou Despacho inicial cabível, sem forçar sentenças extemporâneas.
                        <br />• <strong>Preservação Integral dos Autos (Sem Truncamento):</strong> Eliminação completa de cortes de miolo de textos e de limites de 40.000 caracteres. Toda a íntegra dos PDFs e contestações é preservada até o limite amplo de 1.500.000 caracteres, aproveitando a capacidade de mais de 1 milhão de tokens dos modelos Gemini.
                        <br />• <strong>Fundamentação Aprofundada & Enfrentamento Exaustivo (Art. 489, § 1º, CPC):</strong> Mandato estrito para análise de todas as questões e preliminares (incluindo impugnação à assistência judiciária gratuita, inépcia da inicial e ilegitimidade), confronto probatório documental direto de cada prova e preservação de formatação rica (negritos, itálicos e parágrafos estruturados). Proibição expressa de encurtar fundamentações para poupar espaço ou tokens.
                      </p>
                    </div>
                  </div>
                  
                  {/* Item: Estabilização de Cabeçalhos HTTP & Blindagem de Processos Volumosos */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Estabilização de Cabeçalhos HTTP & Blindagem de Processos Volumosos</span>
                          <span className="bg-sky-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">CONEXÃO LIMPA</span>
                        </h3>
                        <time className="text-xs font-mono text-sky-800 dark:text-sky-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Eliminação de Conflitos de Cabeçalho (ERR_HTTP_HEADERS_SENT):</strong> Desacoplamento cirúrgico de fluxos parciais no socket. O servidor agora emite respostas JSON atômicas com status HTTP precisos (200, 429 para cotas esgotadas, 503 para alta demanda), prevenindo erros de cabeçalho e interrupções em autos volumosos.
                        <br />• <strong>Isolamento da Sinopse Holística em 5 Pilares:</strong> A rotina prévia de consolidação documental agora atua como pré-processamento interno limpo e isolado, operando com limite seguro de tokens (3072) e contingência condensada sem impactar o fluxo de resposta da minuta final.
                        <br />• <strong>Garantia de Rotação Transparente de Chaves:</strong> Propagação redundante da chave reserva alternada via cabeçalho HTTP <em>x-gemini-rotated-key</em> e campo direto no corpo JSON, mantendo a alternância imediata em pools de chaves gratuitas sem saturação de cota.
                        <br />• <strong>Resiliência no Teste de Chaves:</strong> O validador de chaves (<em>/api/test-api-key</em>) opera agora com prioridade para <em>gemini-3.1-flash-lite</em> e não aborta prematuramente ao detectar limites transitórios em modelos secundários.
                      </p>
                    </div>
                  </div>
                  
                  {/* Item: Esteira Rápida Prioritária, Desativação do responseSchema & Filtro de Ruídos Folha a Folha */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Esteira Ágil Prioritária, Aceleração JSON & Filtro Folha a Folha</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ALTA PERFORMANCE</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Modelos Ágeis Primeiro na Esteira:</strong> Reordenação natural do pipeline iniciando diretamente pelos modelos mais rápidos e de menor retenção de fila (<em>gemini-3.1-flash-lite &rarr; gemini-flash-latest &rarr; gemini-3.6-flash &rarr; gemini-3.8-flash &rarr; gemini-flash-lite-latest</em>), reduzindo o tempo de resposta e economizando cotas de chaves gratuitas.
                        <br />• <strong>Desativação da Validação Rígida (responseSchema):</strong> Remoção do validador CFG restritivo do Google, mantendo o retorno estrito em JSON por instruções de engenharia de prompt. O processamento torna-se de 2x a 3x mais veloz sem alterar campos, cards ou formatação da minuta.
                        <br />• <strong>Filtro de Ruídos Folha a Folha:</strong> Eliminação cirúrgica no extrator de PDF de carimbos laterais rotacionados, protocolos repetitivos de sistemas (PROJUDI, PJe, e-SAJ), números de folhas ("fls. X"), hashes de autenticação e cabeçalhos repetitivos de tribunais, poupando milhares de tokens úteis.
                      </p>
                    </div>
                  </div>

                  {/* Item: Anti-Retenção de Fila & Transição Imediata de Modelos */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Anti-Retenção de Fila & Transição Imediata de Modelo</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">FILA ZERO</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-800 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Preservação de Tempo Limite Amplo (180s):</strong> Mantido o limite de tempo estendido e seguro por chamada, impedindo qualquer corte ou cancelamento prematuro de minutas densas e autos volumosos enquanto os modelos de IA concluem a fundamentação exauriente e auditoria forense.
                        <br />• <strong>Transição Imediata ao Próximo Modelo:</strong> Havendo erro 503 ou indisponibilidade real no cluster do Google, o sistema não insiste no modelo congestionado e avança IMEDIATAMENTE ao próximo modelo da esteira (<em>gemini-3.1-flash-lite &rarr; gemini-flash-latest &rarr; gemini-3.6-flash &rarr; gemini-3.8-flash &rarr; gemini-flash-lite-latest</em>) sem atrasos artificiais.
                        <br />• <strong>Reinício em Ciclos da Esteira Completa:</strong> Caso ocorra indisponibilidade transitória de todos os modelos da esteira em todas as chaves, o sistema reinicia a esteira do início aplicando os intervalos necessários para resfriamento sem estourar limites de cotas gratuitas.
                      </p>
                    </div>
                  </div>

                  {/* Item: Governança Estrita da Chave Nativa & Reinício com Ciclos Preventivos da Esteira */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Governança da Chave Nativa & Ciclos Preventivos da Esteira</span>
                          <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTEIRA BLINDADA</span>
                        </h3>
                        <time className="text-xs font-mono text-blue-800 dark:text-blue-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Governança Estrita da Chave Nativa (Super Admin):</strong> A Chave Nativa do servidor fica estritamente bloqueada para usuários gerais, sendo acionada exclusivamente se o <em>Super Admin</em> ativar expressamente a permissão no Painel Administrativo.
                        <br />• <strong>Reinício Automático em Ciclos da Esteira:</strong> Caso todos os modelos da esteira (<em>gemini-3.8-flash &rarr; gemini-flash-latest &rarr; gemini-3.1-flash-lite &rarr; gemini-flash-lite-latest</em>) enfrentem indisponibilidade ou alta demanda temporária (503), o sistema reinicia a esteira completa automaticamente.
                        <br />• <strong>Intervalos Preventivos Anti-Estouro:</strong> A transição e os novos ciclos aplicam pausas estratégicas de alívio e resfriamento (1.000ms a 4.500ms), prevenindo estouro de cota e garantindo conclusão estável da minuta.
                      </p>
                    </div>
                  </div>

                  {/* Item: Deduplicação Inteligente de Documentos & Sinopse Holística Forense em 5 Pilares */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Deduplicação Inteligente & Sinopse Holística em Todos os Módulos</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">OTIMIZAÇÃO DE TOKENS</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Deduplicação Fidedigna de Documentos e Blocos:</strong> Elimina peças duplicadas, petições repetidas anexadas em duplicidade e cabeçalhos repetitivos sem descartar nenhum documento ou prova necessária.
                        <br />• <strong>Sinopse Holística Forense em 5 Pilares:</strong> Em autos volumosos (dezenas a centenas de páginas), gera automaticamente uma consolidação minuciosa sem supressão fática ou probatória: <em>I - Polos e Partes, II - Causa de Pedir e Pedidos, III - Preliminares e Impugnações, IV - Acervo Probatório Completo e V - Decisões Intercorrentes</em>.
                        <br />• <strong>Cobertura Integral nos Módulos:</strong> Integrada nas <strong>Minutas Judiciais</strong> (aba e painel de sinopse), na <strong>Lupa do Magistrado (Auditoria de Minuta)</strong> com selo de deduplicação e subaba de auditoria, e na <strong>Mesa de Audiência</strong> (com painel expansível de 5 pilares no resumo fático da lide).
                      </p>
                    </div>
                  </div>

                  {/* Item: Telemetria Granular de Tokens e Custos por Funcionalidade no Painel Super Admin */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Telemetria Granular de Tokens e Custos por Módulo</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">SUPER ADMIN</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-800 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Visão Segmentada por Funcionalidade:</strong> O painel Super Admin agora segrega o consumo de tokens e custos financeiros (R$ e USD) por módulo específico: <em>Minutas Judiciais</em>, <em>Mesa de Audiência</em>, <em>Lupa do Magistrado</em> e <em>Chat & Refino Jurídico</em>.
                        <br />• <strong>Matriz Gabinetes x Módulos & Log em Tempo Real:</strong> Comparativo cruzado detalhado de faturamento por unidade jurisdicional e nova aba de log individual com auditoria de cada requisição enviada à IA (tokens de prompt, tokens gerados e chaves utilizadas).
                      </p>
                    </div>
                  </div>

                  {/* Item: Reconciliação e Blindagem Estrutural da Minuta em Etapa Única */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Reconciliação Estrutural da Minuta & Blindagem de Formatação</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTRUTURAL</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-800 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Reconciliação Polimórfica de Sinônimos:</strong> Motor inteligente que reconhece e mapeia automaticamente variações de esquemas de prompts personalizados (como <code>sentence.report</code>, <code>sentence.foundation</code>, <code>sentence.dispositive</code>), convertendo-os diretamente nos blocos judiciais nativos (<em>I - Relatório, II - Fundamentação, III - Dispositivo</em>).
                        <br />• <strong>Eliminação Definitiva de JSON Cru:</strong> Blindagem do parser para impedir que códigos brutos ou blocos serializados sejam despejados na fundamentação, garantindo texto judicial contínuo, parágrafos fluidos e preservação dos 6 pilares forenses na auditoria analítica.
                      </p>
                    </div>
                  </div>

                  {/* Item: Priorização e Rotação do Pool de Chaves Pessoais (BYOK) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Priorização e Rotação Ativa do Pool de Chaves Pessoais</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTABILIDADE</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Pool de Chaves Pessoais em 1º Lugar:</strong> Correção estrutural que garante o envio prioritário e integral de todas as chaves cadastradas no Pool Inteligente (até 6+ chaves), impedindo que a permissão de chave nativa suprima as chaves pessoais ativas do usuário.
                        <br />• <strong>Imunidade a Erros de Cota (429):</strong> Se uma chave do pool atingir o limite diário da camada gratuita do Google, a rotação comuta automaticamente em segundo plano para as chaves reserva cadastradas sem abortar a leitura do PDF ou a elaboração da minuta.
                      </p>
                    </div>
                  </div>

                  {/* Item: Atualização da Esteira Flash (Gemini 3.8, 3.7 e 3.6 Flash) & Eliminação de Modelos Descontinuados */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-cyan-300 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Modernização da Esteira de Modelos Flash (Gemini 3.8, 3.7 e 3.6)</span>
                          <span className="bg-cyan-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">IA CORE</span>
                        </h3>
                        <time className="text-xs font-mono text-cyan-800 dark:text-cyan-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Cluster de Alta Velocidade:</strong> Eliminação completa de referências ao modelo descontinuado pelo Google (<code>gemini-2.5-flash</code>), atualizando a fila automática de contingência para operar estritamente com os clusters ativos de última geração: <strong>Gemini 3.8 Flash</strong>, <strong>Gemini 3.7 Flash</strong>, <strong>Gemini 3.6 Flash</strong> e <strong>Gemini 3.1 Flash Lite</strong>.
                        <br />• <strong>Detecção Imediata de Modelos Indisponíveis:</strong> Novo mecanismo de auto-ignição que identifica em milissegundos avisos de versões descontinuadas para novas contas Google, comutando sem interrupção e sem erros visíveis para o próximo modelo ativo da fila.
                        <br />• <strong>Minuta Turbo 100% Blindada:</strong> Garantia de fluidez máxima na elaboração de sentenças e decisões com os 6 pilares forenses, tanto em chaves gratuitas do AI Studio quanto em chaves faturadas.
                      </p>
                    </div>
                  </div>

                  {/* Item: Telemetria de Chaves Gratuitas (AI Studio) & Gestão de Cota no Super Admin */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Telemetria de Chaves dos Usuários & Monitor de Cota 429</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">SUPER ADMIN</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-800 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Monitoramento em Tempo Real dos Assessores:</strong> Nova sub-aba executiva no Painel Super Admin para acompanhamento de cada assessor que utiliza chaves gratuitas do Google AI Studio (BYOK), exibindo o tamanho do pool cadastrado, a chave ativa no momento e o volume de requisições diárias em relação ao teto (~1.500 req/dia).
                        <br />• <strong>Auditoria Contínua de Failover & Rotação 429:</strong> Interceptador de rede inteligente que captura trocas de chave automáticas no cliente e no servidor mesmo em requisições de background, persistindo o histórico em tempo real no Firestore e cruzando dados de gabinetes e usuários com total resiliência.
                        <br />• <strong>Diagnóstico de Saúde & Botão de Instrução:</strong> Classificação instantânea de assessores com pool seguro (2+ chaves), em risco (apenas 1 chave) ou sem chave cadastrada, com botão inteligente para copiar mensagem com instruções personalizadas para colar no WhatsApp ou chat da equipe.
                      </p>
                    </div>
                  </div>

                  {/* Item: Selo de Segurança e Pré-Auditoria Forense na Minuta Rápida */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Pré-Auditoria Forense & Selo 100% na Minuta Rápida</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">CONFORMIDADE FORENSE</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Auditoria Prévia Integrada em 1 Etapa:</strong> A modalidade <em>Minuta Rápida (Turbo)</em> agora gera e exibe nativamente a Pré-Auditoria Forense e o Selo de Segurança com diagnóstico completo dos 6 pilares forenses, unificando os recursos entre Minuta Rápida e Minuta Completa.
                        <br />• <strong>Score e Diagnóstico Ativo:</strong> Exibição do badge com score de 100% de conformidade e aba de Pré-Auditoria perfeitamente preenchida, sem telas vazias ou inconsistências.
                        <br />• <strong>Resiliência para Histórico Legado:</strong> O componente de visualização de auditoria conta agora com fallback inteligente para minutas salvas anteriormente no histórico, assegurando integridade visual completa.
                      </p>
                    </div>
                  </div>

                  {/* Item: Extração Automática e Fiel de Metadados na Minuta Rápida */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Extração Fiel de Partes e Processo na Minuta Rápida</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">AUTOS & METADADOS</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Extração Automática dos Dados dos Autos:</strong> A modalidade <em>Resolução Simples (Célere - 1 Etapa)</em> agora extrai de forma nativa e estruturada o número único do processo (formato CNJ: 0000000-00.0000.0.00.0000), o nome completo da parte autora/promovente, o nome da parte ré/promovida e a Vara/Comarca oficial.
                        <br />• <strong>Eliminação Definitiva de Placeholders:</strong> Correção do comportamento que exibia "Extrair automaticamente dos autos", "Parte Autora" e "Parte Ré" no cabeçalho e nos dossiês quando os campos manuais não eram previamente preenchidos.
                        <br />• <strong>Resgate Heurístico e Forense de Cabeçalho:</strong> Incorporação de algoritmo de leitura secundária por expressão regular (Regex) diretamente sobre o relatório judicial e sobre o corpo dos autos em PDF para garantir 100% de preenchimento fidedigno.
                        <br />• <strong>Higienização Automática de Histórico:</strong> Itens salvos no histórico com placeholders antigos são restaurados e exibidos com seus respectivos números reais e identificação correta das partes.
                      </p>
                    </div>
                  </div>

                  {/* Item: Sincronização Semanal Automatizada de Precedentes & Anexo de PDFs de Informativos */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Sincronização Semanal de Precedentes & Anexo de PDFs de Informativos</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">TJGO & PRECEDENTES</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Sincronização Semanal Automatizada (TJGO, STJ e STF):</strong> O catálogo de precedentes conta agora com rotina periódica semanal em segundo plano e gatilho sob demanda <em>"Sincronizar Agora"</em> exclusivo para o Super Admin, mantendo teses, súmulas e julgados do Tribunal de Justiça de Goiás permanentemente atualizados.
                        <br />• <strong>Anexo e Indexação Inteligente de PDFs de Informativos:</strong> Novo recurso para carregar PDFs oficiais de novos informativos de jurisprudência ou súmulas diretamente no repositório. O motor de IA lê e estrutura os enunciados automaticamente em temas, ramos do direito e ementas com armazenamento duradouro.
                        <br />• <strong>Blindagem de Custos no Grounding ao Vivo:</strong> A ativação de buscas externas em tempo real na web (Grounding) foi restrita com exclusividade ao perfil <strong>Super Admin</strong>, protegendo a cota do gabinete contra chamadas externas desnecessárias por outros membros da equipe.
                        <br />• <strong>Nomenclatura Clara de Minutas:</strong> Atualização dos modos de geração entre <em>Resolução Simples (Célere - 1 Etapa)</em> para despachos e decisões céleres e <em>Análise Aprofundada (Sentenças - 2 Etapas)</em> para sentenças de mérito com auditoria completa dos 6 pilares forenses.
                      </p>
                    </div>
                  </div>

                  {/* Item: Modo Turbo / Econômico & Otimização de Créditos do Chat */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Modo Turbo / Econômico & Otimização de Créditos</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ECONOMIA DE CRÉDITOS</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Modo Turbo / Econômico (Minuta Rápida - 1 Etapa):</strong> Seletor interativo na tela principal permitindo escolher entre a <em>Minuta Rápida</em> (para despachos, decisões interlocutórias e análises simples, com resposta em segundos e economia superior a 50% de tokens) e a <em>Minuta Completa</em> (para sentenças complexas com auditoria forense dos 6 pilares).
                        <br />• <strong>Otimização do Chat AGAIA:</strong> Transmissão de Resumo Executivo inteligente dos autos em substituição ao envio de dezenas de milhares de caracteres brutos em PDF, reduzindo em até 85% o tráfego de tokens por mensagem trocada no chat.
                        <br />• <strong>Blindagem de Grounding Web:</strong> Desativação preventiva de buscas externas tarifadas automáticas ($0.035/busca), preservando os créditos para o processamento de texto.
                      </p>
                    </div>
                  </div>

                  {/* Item: Telemetria e Gestão de Consumo de Tokens da Chave Nativa */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Telemetria & Consumo da Chave Nativa (Tokens)</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">SUPER ADMIN SAAS</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-800 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Monitoramento Corporativo:</strong> Nova aba dedicada no Painel do Super Admin exibindo o volume real de tokens consumidos na Chave Nativa Corporativa por competência mensal.
                        <br />• <strong>Detalhamento por Gabinete e Usuário:</strong> Contabilização granular de tokens de entrada (prompt), saída (candidatos) e quantidade de requisições disparadas por cada membro de cada gabinete.
                        <br />• <strong>Transparência Operacional:</strong> Visão macro do ecossistema SaaS com filtros de busca em tempo real e cálculo instantâneo da fatura de inteligência artificial.
                        <br />• <strong>Importação Retroativa de Histórico:</strong> Ferramenta segura integrada ao painel para reconstruir e consolidar com 1 clique todo o consumo prévio a partir dos logs de auditoria e históricos já gravados de cada gabinete, sem alterar nenhuma rotina, dado ou configuração de produção.
                      </p>
                    </div>
                  </div>

                  {/* Item: Camada de Grounding Oficial ao Vivo (TJGO • STJ • STF) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Grounding Oficial ao Vivo (TJGO • STJ • STF)</span>
                          <span className="bg-sky-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">GROUNDING IA</span>
                        </h3>
                        <time className="text-xs font-mono text-sky-800 dark:text-sky-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Pesquisa Jurisprudencial em Tempo Real:</strong> Implementação da camada de Grounding com Google Search estritamente direcionada aos portais oficiais dos tribunais (Transparência TJGO, STJ, STF e Teses & Súmulas).
                        <br />• <strong>Alimentação Híbrida Dinâmica:</strong> Supera a limitação de catálogos fixos: matérias inéditas ou raras têm seus precedentes e teses buscados e incorporados na hora pelo Revisor de Minutas (Stage 2).
                        <br />• <strong>Controle do Usuário e Auditoria:</strong> Botão de ativação/desativação no modal de precedentes com persistência de preferência e rastreamento das fontes consultadas no certificado de auditoria da minuta.
                      </p>
                    </div>
                  </div>

                  {/* Item: Integração e Injeção Automatizada de Jurisprudência e Informativos do TJGO */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Informativos & Jurisprudência Oficial do TJGO na Injeção de Prompts</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">TJGO & PRECEDENTES</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Jurisprudência e Informativos Oficiais TJGO:</strong> Integração automatizada da jurisprudência do Tribunal de Justiça do Estado de Goiás (fonte oficial da Transparência TJGO), somando-se às bases de Súmulas e Teses do STF, STJ e TNU.
                        <br />• <strong>Injeção Cirúrgica no Revisor de Minutas (Stage 2):</strong> Algoritmo de ponderação temática que detecta contexto estadual/regional (termos como TJGO, Goiás, concessionárias locais como Equatorial, Saneago, Ipasgo e teses consolidadas) e injeta os precedentes correspondentes diretamente na instrução de fundamentação da IA.
                        <br />• <strong>Painel Unificado "Súmulas & TJGO":</strong> Acesso rápido com 1 clique pela barra lateral e menu superior para consulta, busca textual indexada e verificação de precedentes vinculantes nacionais e estaduais.
                      </p>
                    </div>
                  </div>

                  {/* Item: Persistência Robusta e Sincronização Dupla dos Modelos Paradigmas */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Persistência Dupla e Proteção Anti-Sobrescrita de Modelos</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">MODELOS PARADIGMAS</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Gravação Dupla no Firestore:</strong> Novos modelos e decisões do juiz são persistidos simultaneamente no isolamento multi-tenant do gabinete e no registro de contingência do sistema, garantindo visualização idêntica em preview e produção.
                        <br />• <strong>Blindagem Anti-Sobrescrita:</strong> Sincronizações remotas mesclam inteligentemente os dados sem descartar modelos salvos localmente, impedindo a perda de minutas cadastradas durante o carregamento de snapshots.
                        <br />• <strong>Sincronia em Tempo Real:</strong> A biblioteca atualiza dinamicamente entre abas e componentes assim que novos paradigmas são inseridos ou editados.
                      </p>
                    </div>
                  </div>

                  {/* Item: Destino Claro na Injeção de Texto, Injeção Direta no Caderno e Toast */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Opção de Destino Clara & Injeção Direta no Caderno de Teses</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">TESES & MODELOS</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-800 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Seletor Visual de Destino:</strong> Ao injetar texto selecionado da análise ou cadastrar uma decisão, o usuário agora escolhe explicitamente entre <em>"Caderno de Teses (Aba 1)"</em>, <em>"Modelo Paradigma (Aba 2)"</em> ou <em>"Em Ambos"</em>.
                        <br />• <strong>Injeção Direta no Caderno de Teses:</strong> Quando selecionado o Caderno, a tese é inserida diretamente com título, número sequencial, hipótese e fundamentação, salvando imediatamente no banco do gabinete.
                        <br />• <strong>Notificação Visual (Toast):</strong> Confirmação em destaque verde informando com precisão o destino salvo e alternando a interface automaticamente para a aba correta com visibilidade instantânea.
                      </p>
                    </div>
                  </div>

                  {/* Item: Prioridade da Chave Nativa Liberada e Sobreposição de Chaves Pessoais */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Prioridade Absoluta da Chave Nativa e Sobreposição de Chaves Pessoais</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">PRIORIDADE IA</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Sobreposição Automática pelo Super Admin:</strong> Quando o Super Administrador autoriza a Chave Nativa para um usuário no Painel Super Admin SaaS, o sistema prioriza automaticamente a infraestrutura do servidor corporativo em todas as chamadas de IA.
                        <br />• <strong>Reserva Segura de Chaves Pessoais:</strong> As chaves de API pessoais cadastradas pelo assessor não são perdidas nem desativadas; passam a constar no gerenciador como <em>"Em Reserva (Sobreposta pela Nativa)"</em> para uso como contingência.
                        <br />• <strong>Sinalização Clara no Gerenciador e Top Banner:</strong> O Gerenciador de Chaves e a barra superior agora indicam com destaque o status <em>"Chave Nativa do Gabinete Ativada (Prioritária) - Sobrepondo chaves pessoais"</em>.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Validação Real de Chave de API e Diagnóstico Transparente */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Validação Real de Chaves Gemini e Diagnóstico de Rede</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTABILIDADE</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Teste Real da Chave Pessoal:</strong> O botão "Testar Chave" no modal de configurações agora efetua uma verificação real contra a API oficial do Google Gemini, identificando instantaneamente chaves expiradas ou limites de cota.
                        <br />• <strong>Captura Multiformato de Credenciais:</strong> O backend agora reconhece chaves próprias enviadas em múltiplos formatos de cabeçalhos e corpo (<code>x-gemini-api-key</code>, <code>x-custom-api-key</code>, <code>Bearer</code> e <code>customApiKey</code>).
                        <br />• <strong>Diagnóstico Transparente de Erros:</strong> Mensagens de sobrecarga temporária do Google (503) ou estouro de requisições por minuto (429/Quota) agora são reportadas com clareza ao usuário, com orientação de reenvio.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Otimização de Performance e Resiliência da Fila Gemini Flash */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Fila Imediata Gemini 3.8 Flash, Conexão Resiliente e Carga Balanceada</span>
                          <span className="bg-sky-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">AGILIDADE MÁXIMA</span>
                        </h3>
                        <time className="text-xs font-mono text-sky-700 dark:text-sky-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Gemini 3.8 Flash Prioritário Imediato:</strong> O pipeline agora aciona de primeira e diretamente o <code>gemini-3.8-flash</code> em ambos os estágios (Stage 1 e Stage 2), eliminando esperas em modelos legados e reduzindo drasticamente o tempo de resposta.
                        <br />• <strong>Resiliência de Rede e Keep-Alive Ativo (4s):</strong> Batimentos cardíacos HTTP acelerados de 10s para 4s e extrator de JSON com recuperação por delimitadores, blindando a requisição contra quedas e oscilações momentâneas de operadoras.
                        <br />• <strong>Carga Balanceada no Stage 2:</strong> A janela dos autos no revisor foi ajustada de 35.000 para 14.000 caracteres essenciais (peças, procurações e teses), conferindo velocidade sem qualquer perda de fidedignidade analítica.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Injeção de Teses Normativas no Stage 1 e Expansão Contextual do Stage 2 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Injeção de Teses Normativas no Stage 1 & Expansão Contextual (Stage 2)</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">INTELIGÊNCIA DECISÓRIA</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Conhecimento Prévio de Teses no Stage 1:</strong> As <em>Teses Normativas</em> cadastradas no Caderno de Teses do Gabinete agora são injetadas diretamente na primeira leitura dos autos (Stage 1), permitindo que a IA detecte de pronto condições específicas (como atuações de advogados que ensejam suspeição por foro íntimo, limites indenizatórios, diretrizes de rito ou cláusulas contratuais vedadas).
                        <br />• <strong>Janela de Autos Ampliada no Juiz Revisor (Stage 2):</strong> O contexto factual transmitido ao Revisor foi expandido de 2.500 para 35.000 caracteres, acompanhado de comando imperativo de checagem cruzada com o Caderno de Teses, impedindo que instruções obrigatórias do gabinete sejam suprimidas na redação final da minuta.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Suporte Híbrido a Autos com Texto e Imagens & Re-extração em Tempo Real */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Suporte a Autos Híbridos (Texto + Imagens) & Re-extração Ativa</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">EXTRAÇÃO ROBUSTA</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Sincronização do Worker PDF.js:</strong> Corrigida a compatibilidade de versão do motor de leitura de PDFs no navegador, garantindo que autos contendo páginas digitadas mescladas com anexos escaneados tenham todo o seu texto extraído sem falhas.
                        <br />• <strong>Re-extração Instantânea com 'Tentar Novamente':</strong> Ao clicar no botão de repetição ou no novo botão <em>Re-extrair</em> do arquivo, o sistema lê imediatamente o PDF mantido em memória, sem necessidade de selecionar o arquivo novamente do disco.
                        <br />• <strong>Fallback Multimodal da Visão da IA:</strong> Caso páginas importantes sejam exclusivamente fotos ou cópias escaneadas, o sistema mantém suporte ao processamento multimodal direto do Gemini (até 25MB) para OCR e interpretação visual de provas.
                      </p>
                    </div>
                  </div>

                  {/* Item: Blindagem Anti-Alucinação e Descarte de Cache Pretérito Conflitante */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Blindagem Anti-Alucinação & Descarte Automático de Cache Conflitante</span>
                          <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">FIDELIDADE PROCESSUAL</span>
                        </h3>
                        <time className="text-xs font-mono text-rose-700 dark:text-rose-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Neutralização das Diretrizes de Sentença:</strong> Eliminados quaisquer exemplos ou vieses temáticos de minutas genéricas no backend (como menções a Curatela/Interdição), garantindo que a IA subordina 100% da fundamentação aos documentos reais dos autos anexados (consumidor, bancário, possessória, cível, etc.).
                        <br />• <strong>Alerta de Autos Digitalizados sem Camada OCR:</strong> Caso o PDF anexado seja uma imagem escaneada sem texto extraído e o campo de texto estiver vazio, o sistema agora alerta o assessor em vez de permitir a geração de casos fictícios.
                        <br />• <strong>Descarte de Rascunho Pretérito ao Inserir Novo PDF:</strong> Ao anexar novos arquivos ou limpar o processo, o rascunho de sessão anterior (localStorage) e a minuta visível em tela são automaticamente limpos, impedindo confusão visual entre análises de processos distintos.
                      </p>
                    </div>
                  </div>
                  
                  {/* Novo Item: Execução Resiliente de Prompts e Leitura Aprofundada de PDFs */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Execução de Prompts sem Exigência de Base de Conhecimento & Leitura Resiliente de PDFs</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">CORREÇÃO CRÍTICA</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        • <strong>Desvinculação Obrigatória da Base de Conhecimento:</strong> O sistema agora executa qualquer prompt perfeitamente mesmo que o gabinete ou usuário não possua nenhum documento ou PDF cadastrado na Base de Conhecimento interna (a base é estritamente opcional).
                        <br />• <strong>Suporte a Autos Escaneados e Volumosos:</strong> Eliminado o bloqueio que gerava o erro <em>"É obrigatório fornecer o PDF dos autos ou o texto/relatório processual"</em> ao juntar PDFs escaneados ou com extração de texto esparsa.
                        <br />• <strong>Timeout Ampliado e Visão Multimodal:</strong> O extrator agora suporta PDFs grandes de tribunais (tempo limite elevado para 30s) e envia a visão direta multimodal (Base64) de até 40MB para leitura de carimbos, certidões e páginas digitalizadas.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Correção do renderizador Markdown */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Correção do Renderizador Markdown nas Telas de Visualização</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">UI FIX</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação global do <code>ReactMarkdown</code> em todas as telas de leitura do sistema. Agora as frases em negrito são devidamente formatadas, os literais (<code>**</code>) desapareceram na <em>Aba Original</em> e <em>Comparador de Versões</em>, e consertamos um defeito visual de sobreposição de linhas numeradas que ocorria dentro dos cards da tela de Histórico, causado por um conflito da função CSS de bloqueio de linhas.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Mutirão Expresso Universal & Visualização Forense da Sentença */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Mutirão Expresso Universal & Visualização Forense da Sentença</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">AUDIÊNCIA & FORMATAÇÃO</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Aperfeiçoamento completo do módulo <strong>Mutirão Expresso (Mesa de Audiências)</strong>:
                        <br />• <strong>Exclusividade de Prompts Cadastrados:</strong> Remoção total de opções de prompt padrão genérico; o seletor lista e aplica <em>exclusivamente</em> os modelos de prompts cadastrados e ativos no sistema pelo gabinete.
                        <br />• <strong>Visualização Forense Clássica:</strong> A sentença gerada conta com folha de estilo judiciário, entrelinhas proporcional, recuo de parágrafos de 2.5cm, realce automático dos tópicos estruturais (<em>I - RELATÓRIO</em>, <em>II - FUNDAMENTAÇÃO</em>, <em>III - DISPOSITIVO</em>) e modo editor livre.
                        <br />• <strong>Eliminação de Resíduos de Texto:</strong> Saneamento preventivo para erradicar qualquer caractere literal <code>\n</code> na tela e nos dados salvos no histórico, com botão de cópia formatada (HTML) para colar no PROJUDI ou Word.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Suporte Ilimitado a Documentos & Leitura no Navegador */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Processamento Ilimitado de Peças & Otimização de PDFs no Navegador</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">PETIÇÃO 360°</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Extensão do leitor de documentos para extrair camadas de texto de arquivos PDF diretamente no navegador, permitindo a análise de petições, transcrições de audiência e autos extensos sem restrição de tamanho binário. Ampliação da capacidade segura de leitura textual para até 5 milhões de caracteres no modelo Gemini 3.6 Flash e refinamento de mensagens de resposta técnica da API.
                      </p>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Resiliência de Chaves de API & Diagnóstico de Cotas na Petição 360°</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">CONFIABILIDADE & API</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Aperfeiçoamento no roteamento de chaves customizadas de API nos módulos de <strong>Petição Inicial & Defesa Forense 360°</strong> (leitura de provas, extração automática e geração de peças), garantindo que as chaves personalizadas cadastradas pelo usuário via cabeçalho <code>x-gemini-api-key</code> sejam consumidas com prioridade. Inclui tratamento de erros com diagnóstico transparente de cotas e créditos pré-pagos esgotados (Erro 429), além de prevenção contra payloads inline excessivos durante uploads pesados de documentos.
                      </p>
                    </div>
                  </div>
                  
                  {/* Novo Item: Blindagem de Autorrecuperação contra Alta Demanda (503) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Blindagem de Autorrecuperação contra Alta Demanda (503) na Fila Flash</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">RESILIÊNCIA IA</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação de autorrecuperação com pausa inteligente (backoff defensivo de 2,5 a 3,5 segundos) para lidar com oscilações pontuais de alta demanda global do Google (HTTP 503). O sistema retenta automaticamente a requisição no modelo prioritário (<em>Gemini 3.8 Flash</em>) e, caso a sobrecarga persista, percorre uma cascata estritamente restrita aos modelos da fila Flash oficial (<em>3.7 Flash, 3.6 Flash, 3.5 Flash, Flash Latest, Flash-Lite</em>). Em caso de indisponibilidade global, a mensagem é traduzida para português amigável com botão de reexecução imediata.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Blindagem de Leitura de PDFs de Grande Porte */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Blindagem de Leitura de PDFs de Grande Porte & Zero-Lag Upload</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTABILIDADE DE AUTOS</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação de blindagem arquitetural de envio e extração de autos processuais volumosos: quando o PDF possui texto digitalizado, o sistema higieniza e transmite exclusivamente a camada textual pura (reduzindo o peso do envio de 30MB para menos de 50KB), prevenindo cortes de rede e sobrecargas de buffer. Além disso, foi expandido o timeout de leitura para 90 segundos com escalonamento cooperativo de páginas, fallback de extração de buffer direta no servidor e proteção estrita contra estouro de cotas e erros de alta demanda (503), preservando integralmente prompts, teses e configurações de gabinete.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Blindagem de Rede e Tratamento Amigável de Erros */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Blindagem de Rede e Mensagens Claras na Execução de Prompts</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTABILIDADE & UX</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação de blindagem defensiva no tratamento de respostas e leitura de fluxos de dados (streaming/JSON). Na eventualidade de qualquer oscilação temporária de sinal ou corte de conexão do navegador durante a transmissão de autos pesados em PDF, o sistema intercepta falhas técnicas nativas (como <em>JSON.parse: unexpected end of data</em>) e as converte automaticamente em orientações amigáveis em português: <em>"A conexão com a inteligência jurídica foi interrompida momentaneamente pela rede durante o envio do processo. Por favor, clique em 'Tentar Novamente'."</em>, disponibilizando botão de retry imediato com um clique, sem alterar nenhuma vírgula da mecânica, dos prompts ou dos dados de gabinete.
                      </p>
                    </div>
                  </div>
                  
                  {/* Novo Item: Pesquisa Automática de Jurisprudência pelo Tema da Peça */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Pesquisa Automática de Jurisprudência pelo Tema da Peça (Zero-Click Grounding)</span>
                          <span className="bg-sky-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">AUTOMAÇÃO INTELIGENTE</span>
                        </h3>
                        <time className="text-xs font-mono text-sky-700 dark:text-sky-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Automatização em segundo plano da pesquisa de precedentes judiciais de acordo com o tema da minuta, petição inicial, contestação ou impugnação: o sistema extrai dinamicamente a controvérsia jurídica principal (higienizando nomes de partes e CPFs) e aciona automaticamente o <strong>Google Search Grounding</strong> sem necessidade de clique manual. Conta com banner temático em tempo real, indicador visual de sincronização contínua, prevenção contra requisições redundantes e blindagem estrita que separa julgados <strong>Reais Verificados (com links oficiais)</strong> de <strong>Sugestões de Teses</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Google Search Grounding & Protocolo Anti-Alucinação de Jurisprudência */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Search className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Google Search Grounding & Auditoria Anti-Alucinação de Jurisprudência</span>
                          <span className="bg-sky-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">CONFIABILIDADE</span>
                        </h3>
                        <time className="text-xs font-mono text-sky-700 dark:text-sky-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Conexão do motor ao <strong>Google Search Grounding</strong> em tempo real para indexação e validação de precedentes oficiais na web. O sistema passa a classificar de forma estrita e transparente os julgados em duas categorias: <strong>🟢 Jurisprudência Real Verificada</strong> (com link oficial direto para a decisão/acórdão) e <strong>🟡 💡 Sugestão de Tese Argumentativa</strong> (com alerta explícito de que a tese é teórica e que o advogado deve pesquisar antes de transcrever qualquer número processual). É terminantemente proibida a invenção de números de processo ou nomes de relatores sintéticos.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Expansão do Módulo Petição & Defesa 360° & Ajuste do Flutuante Lateral */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Módulo Petição & Defesa 360°: Atuação em Processos Existentes & Ajuste Lateral</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVIDADE</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Expansão do módulo independente para atuar plenamente no contencioso do advogado: suporte a <strong>Contestação, Réplica, Incidentais e Recursos</strong> no curso de processos em andamento. Inclui identificação dos autos (CNJ), vara/juízo e tempestividade, duplo upload inteligente (autos do processo vs. provas do cliente), preliminares do art. 337 do CPC, e a inovadora <strong>Matriz de Impugnação Específica (Art. 341 CPC)</strong> que mapeia e rebate ponto a ponto todas as alegações da inicial com provas documentais. Ajuste do flutuante lateral e cabeçalho para acesso direto e ágil.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Modelos Gemini Flash Atualizados & Remoção de Limite de Tempo */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Modelos de Alta Performance & Processamento Ilimitado</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTABILIDADE</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Atualização completa da esteira de modelos de IA para os clusters ativos (gemini-flash-latest, gemini-3.6-flash e gemini-3.6-flash), eliminando o erro de modelos legados indisponíveis. Remoção de qualquer trava de 15 minutos em requisições e suporte pleno a chaves faturadas para uso irrestrito e ilimitado.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Purga de Prompt Sintético & Blindagem do Mutirão Expresso */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Purga de Prompts Fantasmas & Resiliência do Mutirão Expresso</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">CORREÇÃO CRÍTICA</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Eliminação definitiva de registros sintéticos de "Prompt Padrão" gerados automaticamente, assegurando preservação integral dos prompts reais do gabinete. Estruturação padronizada e blindada para todas as sentenças e minutas produzidas no Mutirão Expresso com sanitização de campos e conformidade com o validador de integridade do Histórico de Decisões.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Exclusão Segura de Petição Inicial 360° (In-App) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Histórico da Petição Inicial 360°: Exclusão Segura com Modal Nativo</span>
                          <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">CORREÇÃO</span>
                        </h3>
                        <time className="text-xs font-mono text-rose-700 dark:text-rose-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Substituição de diálogos nativos do navegador por modal in-app de confirmação de exclusão (eliminando bloqueios de <em>window.confirm</em> em iframes), feedback visual imediato e sincronização dupla (Firestore + cache local) garantindo exclusão instantânea e sem travamentos.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Otimização do Pipeline Gemini & Autocura do Histórico */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>IA Judicial: Pipeline Gemini 3.8 Flash & Autocura do Histórico</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTABILIDADE</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Atualização completa da esteira de contingência de modelos para a geração moderna da família Gemini (Gemini 3.8 Flash, Gemini Flash Latest, Gemini 3.6 Flash e Gemini 3.1 Flash Lite), com detecção imediata de esgotamento de créditos da chave de API e abertura automática do modal de configurações. Implementada também rotina de autocura e purga de registros corrompidos ou incompletos no histórico para navegação rápida e sem falhas.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Exclusão Segura de Audiência (In-App) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Mesa de Audiências: Exclusão Segura de Pauta & Usabilidade Mobile</span>
                          <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">MELHORIA</span>
                        </h3>
                        <time className="text-xs font-mono text-rose-700 dark:text-rose-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Substituição de diálogos nativos do navegador por modal in-app de confirmação de exclusão (eliminando bloqueios de iframe no mobile), espaçamento adequado para evitar sobreposição com o texto de rito/instrução e ampliação da área de toque no celular. Adicionado também botão de exclusão direta na barra de edição da audiência ativa.
                      </p>
                    </div>
                  </div>

                  {/* Item: Aba 5 - Ata de Audiência Paradigma & Termo Contínuo */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <FileSignature className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Mesa de Audiências: Aba 5 - Ata de Audiência Paradigma</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO RECURSO</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <strong>Modelo Paradigma do Judiciário de Goiás:</strong> Nova Aba 5 na Mesa de Audiências para geração do Termo de Audiência completo em texto corrido e contínuo (iniciando com "ABERTA A AUDIÊNCIA:"), sem quebras artificiais de seções ou marcadores, respeitando a prática forense real.
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Cabeçalho, Importações Rápidas e Exportação:</strong> Campos customizáveis para Tribunal, Comarca, área Cível/Criminal, vítimas, acadêmico/ouvinte, prazo sucessivo de memoriais e subscrição da secretária. Permite puxar com 1 clique oitivas, acordos e sentenças orais, além de exportar diretamente para o PROJUDI, Word (.docx formatado a 2cm) ou impressão oficial.
                      </p>
                    </div>
                  </div>

                  {/* Item: Módulo Exclusivo - Redator de Petição Inicial 360° */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Módulo Exclusivo: Redator de Petição Inicial 360°</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">SUPER ADMIN</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <strong>Painel Independente Multimodal:</strong> Criado painel desvinculado do fluxo de gabinete judicial para o Super Admin processar arquivos de múltiplos formatos (PDFs, imagens/prints, áudios e vídeos) e redigir automaticamente minutas completas de Petição Inicial com estrutura técnica irrepreensível (CPC).
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Isolamento Fático Estrito & Exportação (.docx):</strong> Motor de IA blindado contra invenção de fatos, com suporte a chat de refinamento e exportação direta para Word e cópia rápida.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Guia do Assessor / Co-Piloto Ativo de Controle Total */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Guia do Assessor: Modo Co-Piloto (Controle Total sem 'Caixa-Preta')</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <strong>Orientação Jurídica Ativa:</strong> Adicionado componente informativo e guia passo a passo na entrada de autos e PDFs para assessores que desejam guiar a IA ativamente (injetando teses consolidadas do gabinete, informativos do Dizer o Direito, precedentes STJ/STF e orientações personalizadas antes e depois da redação da minuta).
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Eliminação do Efeito "Minuteiro Engessado":</strong> O assessor comanda a tese jurídica pelo Caderno de Teses, pelo Gerenciador de Prompts ou pelo Chat com o Processo, mantendo a pena e o estilo do Magistrado Titular intactos.
                      </p>
                    </div>
                  </div>

                  {/* Item: Isolamento de Gabinete Restabelecido & Estabilidade Arquitetural */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Arquitetura Estável: Isolamento Estrito de Gabinete</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">ESTÁVEL</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <strong>Isolamento de Sessão:</strong> O seletor de lotações opera estritamente nas varas e comarcas internas do gabinete do usuário, eliminando misturas acidentais de caminhos e recarregamentos forçados.
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Super Admin Centralizado no Painel SaaS:</strong> O gerenciamento de gabinetes, planos, backups e usuários globais é feito com isolamento no <em>Painel Super Admin SaaS</em>, sem afetar o fluxo de elaboração de minutas.
                      </p>
                    </div>
                  </div>
                  
                  {/* Novo Item: Snapshots de Segurança e Auto-Cura de Gabinetes */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Mecanismo de Snapshots de Segurança & Auto-Cura de Gabinetes</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <strong>Snapshots Pré-Permissão & Pontos de Restauração:</strong> Antes de qualquer operação crítica no Painel Super Admin SaaS (criação, edição, exclusão ou suspensão de gabinetes, transferências de membros e alterações de funções), o sistema tira automaticamente um snapshot completo do Firestore e armazena com redundância local e em nuvem.
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Auto-Cura & Reconciliação Transacional:</strong> Adicionado botão exclusivo para auto-cura e reconstrução de gabinetes essenciais (Dr. Rafael Machado de Souza e Dra. Júlia Vianna), reconciliação de perfis de magistrados titulares e resgate integral de históricos de processos e prompts.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Lançamento da Extensão do PROJUDI e Quebra do Limite de PDFs */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Extensão Oficial PROJUDI (No-Limits)</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <strong>Download Automático Autenticado:</strong> Lançamento da Extensão oficial para o navegador Google Chrome capaz de ler os cookies autenticados do usuário e fazer o intercâmbio de processos inteiros sem a necessidade de gerar os pesados PDFs localmente.
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Memória a Memória (Sem Erro 0 Bytes):</strong> A Extensão agora intercepta as regras de sessão do TJGO para permitir baixar o <em>Inteiro Teor</em> e fragmentos avulsos sem bloqueios corporativos. Foi removida a limitação do tamanho do arquivo (Data URI) que impedia PDFs de +100MB de renderizarem.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Correção de Isolamento de Prompts Padrão e Otimização de Payload Multimodal */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Isolamento de Prompts e Desempenho (Visão)</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        <strong>Isolamento Multi-Tenant:</strong> Corrigida a mecânica de salvamento de Prompts Padrão. Edições feitas nos prompts originais do sistema agora são salvas com identificadores únicos por Unidade Judiciária (Vara/Lotação), evitando sobrescrita de dados entre gabinetes vizinhos.
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Otimização de Análise (503 Gateway):</strong> Melhoria severa na extração multimodal. PDFs longos não enviam mais sua versão inteira em Base64 para a Visão da IA se o texto extraído for confiável e longo (acima de 6 páginas), focando apenas na indexação textual para eliminar falhas de timeout. Documentos curtos e imagens digitalizadas continuam com leitura híbrida habilitada.
                      </p>
                    </div>
                  </div>

                  {/* Item Anterior: Protocolo Obrigatório de Análise e Melhorias de Estabilidade */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Protocolo de Análise Integrado e Estabilidade Aprimorada</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Protocolo Obrigatório de Análise:</strong> O motor de IA base agora respeita um protocolo estrito de distinção de ritos processuais (conhecimento vs. execução) e prioriza os ditames da Lei nº 9.099/95 nos Juizados. A IA foi ajustada para nunca inferir cálculos não verificáveis, aderindo à Regra de Ouro de não "alucinar" fatos inexistentes.
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
                        <strong>Estabilidade e UI:</strong> 
                        Removida a auto-expiração dos alertas de sistema para garantir a leitura do comunicado. Substituídas antigas lógicas de confirmação para proteger a gerência de backups contra bloqueios de navegador. Reduzidas falhas de indisponibilidade (Erros 503) com o refinamento do fallback automático.
                      </p>
                    </div>
                  </div>

                  {/* Item Mais Recente: Blindagem Multi-Tenant e Não-Sobrescrita de Informações Customizadas */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Blindagem Multi-Tenant e Preservação Estrita de Dados Customizados</span>
                          <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-teal-700 dark:text-teal-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Preservação Absoluta de Conteúdo Editado:</strong> O Caderno de Teses, Modelos Paradigmas e Guias de cada gabinete e comarca contam agora com isolamento estrito e proteção contra substituição indesejada por dados padrão do sistema. Sob nenhuma hipótese os dados customizados de gabinetes secundários ou novos usuários são substituídos por modelos padrão ao inicializar ou sincronizar.
                      </p>
                    </div>
                  </div>

                  {/* Item: Isolamento de Chaves API por Usuário, Varas no Histórico e Auditar Minuta Restrita */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Isolamento Estrito de Chaves API & Identificação de Varas no Histórico</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>Isolamento de Chaves de API:</strong> Cada usuário logado passa a ter seu escopo estritamente isolado de chaves cadastradas (UID), impossibilitando que um usuário visualize ou utilize chaves salvas por outros membros da equipe. A única chave compartilhável é a Chave Nativa, controlada exclusivamente pelo Administrador.<br />
                        <strong>Identificação e Filtro por Vara no Histórico:</strong> O Histórico e os Dossiês Processuais agora exibem etiquetas automáticas de especialidade (Família, Cível, Criminal, Fazenda Pública, Infância etc.) e filtro por vara judiciária.<br />
                        <strong>Auditar Minuta Removida:</strong> A função de auditoria de minutas foi removida do sistema.
                      </p>
                    </div>
                  </div>

                  {/* Item Mais Recente: Varredura Automática & Mineração Inteligente do Gabinete */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Varredura Automática & Expansão do Caderno de Teses (IA Multitenant & Anti-Duplicação)</span>
                          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-indigo-700 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação do motor de <strong>Varredura Automática e Mineração Inteligente do Gabinete</strong>. A IA escanéia todas as decisões salvas e histórico do gabinete/unidade ativa, extraindo hipóteses fáticas (.1), critérios probatórios (.2), consequências jurídicas (.3) e precedentes (.4). Conta com <strong>blindagem antiduplicação contextual</strong> que impede a sobreposição de temas já cadastrados no Caderno de Teses, além de suporte a injeção em lote sequencial e salvamento direto nos Modelos Paradigmas do Juiz.
                      </p>
                    </div>
                  </div>

                  {/* Item: Chave de API Pessoal do Google Gemini (Nível Gratuito) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Chave de API Pessoal Gratuita (Google AI Studio) & Desacoplamento de Faturamento</span>
                          <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação do suporte completo para inserção de <strong>Chaves de API Pessoais do Google Gemini (nível gratuito)</strong>. O usuário pode cadastrar sua própria chave obtida no Google AI Studio sem necessidade de faturamento ou cartão, com armazenamento local seguro no navegador (<em>localStorage</em>), validação em tempo real com teste de conectividade, banner superior informativo discreto e botão de status de chave no cabeçalho com fallback automático.
                      </p>
                    </div>
                  </div>

                  {/* Item Mais Recente: Detecção e Sugestão Automática de Minutas Paradigmas */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Detecção e Régua de Afinidade de Paradigmas (0% a 100%)</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação de inteligência de correspondência contextual e <strong>régua visual de aproximação por cores (0% a 100%)</strong>: o banner exibe em tempo real o diagnóstico de afinidade com os modelos do Caderno do Juiz, variando de <em>Cinza/Neutro (0% a 29% - Nenhuma similaridade direta)</em>, <em>Âmbar (30% a 59% - Moderada)</em>, <em>Azul (60% a 79% - Alta)</em> e <em>Verde Esmeralda (80% a 100% - Caso Idêntico / Altíssima)</em>. Permite vincular o modelo com 1 clique (<em>⚡ Vincular e Aplicar este Paradigma</em>), visualização prévia da minuta paradigma e <strong>blindagem antiduplicação</strong> para minutas geradas com paradigma.
                      </p>
                    </div>
                  </div>

                  {/* Item: Consulta Externa a Súmulas & Teses Vinculantes (STF • STJ • TNU) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Alimentação e Aplicação 100% Automática de Súmulas & Teses Vinculantes</span>
                          <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-teal-700 dark:text-teal-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Integração de busca e alimentação 100% automática nas 6 bases vinculantes oficiais indexadas via <strong>tesesesumulas.com.br</strong> (Súmulas e Teses de Repercussão Geral do STF, Súmulas e Recursos Repetitivos do STJ, Súmulas e Pedilefs da TNU). O sistema opera no backend de forma transparente em todas as execuções, sem exigir edição manual do prompt, aplicando e citando expressamente os precedentes cabíveis na fundamentação e dispositivo da minuta gerada.
                      </p>
                    </div>
                  </div>

                  {/* Item Mais Recente: Reprodução Integral e Sem Cortes da Tese do Paradigma */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Tese Completa Sem Cortes no Paradigma Vinculado</span>
                          <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">IMPORTANTE</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação de diretriz mandatória no motor de geração: quando uma Minuta Paradigma é vinculada, a IA é proibida de resumir ou sintetizar a tese jurídica. Todos os múltiplos argumentos, citações jurisprudenciais, precedentes de Tribunais e dispositivos do modelo do magistrado são reproduzidos integralmente na fundamentação, assegurando segurança e completude perante Turmas Recursais.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Fundamentação Normativa e Valoração no Fato vs Prova */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Fundamentação Normativa & Valoração Judicial no Fato vs. Prova</h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        A Matriz de Confronto Fato vs. Prova agora detalha, para cada alegação fática auditada, a indicação expressa das <strong>leis, artigos de lei (CPC, CC, CDC), súmulas (STJ, STF, TNU), teses repetitivas, enunciados do FONAJE e portarias</strong> utilizadas na subsunção, além da <strong>valoração probatória</strong> demonstrando como o juízo utilizou aquele elemento fático para justificar o comando da sentença, decisão ou despacho.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Gestão de Membros e Controle de Acessos da Equipe */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Gestão de Equipe: Convites, Ativação/Desativação e Desvinculação</h3>
                        <time className="text-xs font-mono text-purple-700 dark:text-purple-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O Administrador do Gabinete agora conta com controle total sobre a equipe: formulário direto para <strong>convidar e liberar acesso imediato</strong> a novos assessores pelo e-mail, alternador para <strong>ativar ou suspender/desativar</strong> o acesso de membros existentes, e botão para <strong>desvincular e remover</strong> usuários definitivamente do gabinete.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Injeção Integral no Caderno de Teses */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Injeção Integral sem Truncamento no Caderno de Teses</h3>
                        <time className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Aprimoramento do fluxo de injeção direta e em lote (a partir de arquivos mapeados pela IA ou modelos da biblioteca). Todas as tabelas (ex.: parâmetros de UHDs da Portaria SERINT), normas, hipóteses e fundamentações extensas são transferidas na íntegra para o Caderno de Teses Normativas, sem cortes ou omissões de texto.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Filtro de Detecção de Paradigmas com Afinidade >= 90% */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Filtro de Alta Afinidade para Paradigmas (≥ 90%)</h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O banner expandido de sugestão automática de paradigmas agora só é exibido para casos com <strong>afinidade igual ou superior a 90%</strong>. Quando houver correspondências com afinidade menor, o sistema exibe apenas uma nota discreta informando a quantidade e o percentual encontrado, mantendo a interface limpa e focada.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Extração Automática do Nome da Ação & Estúdio de Seleção */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Extração Automática do Nome da Ação & Estúdio de Ajuste de Seleção</h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ao salvar o texto do documento como modelo paradigma do juiz, o sistema identifica e preenche automaticamente o título com o nome completo da ação judicial (ex.: <em>AÇÃO DE COBRANÇA DE DIFERENÇAS DO ADICIONAL DE INSALUBRIDADE...</em>). Além disso, a seleção de texto agora é destacada visualmente no leitor contínuo e conta com um estúdio de ajuste rápido (expansão de parágrafo inteiro, frases ao redor, aparador de bordas e edição direta do trecho).
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Minuta Paradigma & Clonagem Estrutural */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Minuta Paradigma (Espelho Estrutural do Juiz)</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Inclusão do botão <strong>⚡ Injetar no Prompt</strong> no Caderno de Teses e no Extrator de PDF. A IA replica rigorosamente a arquitetura, títulos, negritos e dispositivo da decisão paradigma anterior do magistrado, adaptando apenas fatos e provas do novo processo.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Extrator Contínuo & Leitor Formatado */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Extração Fluida e Formatação Contínua de PDFs</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Extração contínua e uniforme de peças em PDF sem fragmentação em blocos ou caixas artificiais: o texto corre de forma natural com preservação rigorosa de negritos, itálicos, sublinhados, tópicos e parágrafos idênticos ao arquivo original, livre de ruídos de digitalização e cabeçalhos.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Extração Limpa de PDFs (Sem Topo, Lateral ou Rodapé) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Higienização Automática de Topo, Lateral e Rodapé em PDFs</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Eliminação cirúrgica de todas as escritas de margem superior (cabeçalhos do Projudi/TJGO com número de processo, movimentação, arquivo e data), margens laterais (assinaturas digitais rotacionadas verticalmente) e rodapés (códigos verificadores, links e folhas), entregando apenas o texto jurídico puro e formatado.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Caderno de Teses - Zero Injeção de Padrões e Limpeza em 1 Clique */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Caderno de Teses: Fim da Auto-Injeção de Padrões & Limpeza em 1 Clique</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-mono text-[9px] font-black uppercase">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Eliminação da rotina de auto-injeção de modelos genéricos ou modelos padrão do sistema na <strong>Biblioteca de Modelos Paradigmas do Juiz</strong>. O gabinete preserva exclusivamente decisões reais criadas pelos seus usuários. Foi incorporado também o botão <code>Limpar Modelos Padrão</code> no cabeçalho da biblioteca para expurgar com 1 clique modelos de demonstração residuais do banco de dados sem atingir modelos personalizados.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Otimização de Tokens na Auditoria & Minuta Gabarito Sob Demanda */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Auditoria de Minutas: Otimização de Tokens e Minuta Gabarito Sob Demanda</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-mono text-[9px] font-black uppercase">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de arquitetura de alta eficiência na <strong>Lupa do Magistrado</strong>: eliminação de duplicação de texto de PDFs no payload e desacoplamento da geração da <em>Minuta Gabarito Integral</em>, que passa a ser gerada de forma instantânea sob demanda (botão <code>⚡ Gerar Minuta Gabarito com IA</code> na Bancada de Tripla Conferência e na aba Visualizar/Editar). A medida reduz em mais de 50% o consumo de tokens e previne esgotamento de cotas da API.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Lupa do Magistrado - Lançar Minuta Corrigida & Unificação de Histórico */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Lupa do Magistrado: Lançar Minuta Corrigida & Dossiês Unificados</span>
                          <span className="px-1.5 py-0.2 rounded bg-blue-500 text-white font-mono text-[9px] font-black uppercase">NOVO</span>
                        </h3>
                        <time className="text-xs font-mono text-blue-600 dark:text-blue-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação do fluxo de <strong>Reauditoria Inteligente</strong>: agora o Juiz ou Assessor pode submeter uma <em>Minuta Corrigida</em> sem precisar reenviar os PDFs do processo. A IA reaproveita automaticamente os autos originais gravados no banco. O histórico foi 100% unificado por número de processo, agrupando todas as revisões em um <strong>Dossiê Expansível</strong> com cálculo de evolução de nota (Score Delta), timeline de versões e detecção preventiva na tela de Nova Auditoria com botão de reaproveitamento em 1 clique.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item (Sincronização Reativa e Exclusão de Paradigmas) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Reconciliação e Exclusão Reativa de Modelos Paradigmas</h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Aperfeiçoamento da persistência e sincronização em tempo real entre o Caderno do Gabinete (Biblioteca do Juiz) e a Minuta Vinculada na tela inicial. Modelos excluídos são removidos instantaneamente de todos os seletores e sincronizados com a nuvem (Firestore), eliminando inconsistências visuais e referências obsoletas.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item: Dossiê Processual & Memória Evolutiva de Atos */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Dossiê Processual & Linha do Tempo de Atos</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Agrupamento automático de minutas de um mesmo processo (decisões liminares, despachos e sentenças) em um <strong>Dossiê Único</strong>, eliminando duplicações visuais no histórico. Inclui Linha do Tempo Evolutiva com injeção automática de memória processual no prompt para assegurar coerência decisória.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo (Lupa do Magistrado & Auditor de Minutas - Função de Ouro) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Lupa do Magistrado & Auditoria de Minutas</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black uppercase">OURO</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação e aprimoramento completo da <strong>Função de Ouro</strong>, exclusiva para o Magistrado/Administrador. Conta com <strong>persistência contínua em nuvem (Firestore)</strong>, abas de <em>Nova Auditoria</em>, <em>Processos Auditados</em>, <em>Resultado & Análise</em> e <em>Visualizar & Editar Minuta</em>. Permite confrontar a minuta do assessor com o PDF dos autos para auditar pedidos (prevenção de vício <em>citra petita</em>), valoração probatória e preliminares, com <strong>Raio-X de Tokens</strong>, <strong>Salvar Tese no Gabinete</strong>, feedback pronto para WhatsApp e despachos privativos do Juiz.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo (Reauditoria de Minuta Corrigida & Multi-Usuário em Tempo Real) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Reauditoria de Minuta Corrigida & Sincronização Multi-usuário em Tempo Real</h3>
                        <time className="text-xs font-mono text-blue-600 dark:text-blue-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação do fluxo de <strong>"Lançar Minuta Corrigida"</strong> com captura automática e resiliente do número dos autos via regex CNJ/Projudi na minuta e nos PDFs. Os autos gravados são reaproveitados automaticamente sem necessidade de reenviar PDFs, com suporte a upload de PDFs complementares e unificação de versões em dossiês consolidados. Adicionada sincronização em tempo real via <em>Firestore onSnapshot</em>, permitindo que vários assessores e juízes auditem e revisem processos simultaneamente com atualização instantânea na interface.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo (Barra Superior & Salvar Tese Integral) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Salvar Tese Integral & Barra Superior Otimizada</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O botão <strong>"Salvar Tese"</strong> passa a capturar por padrão o <strong>texto integral e estruturado da minuta</strong> (cabeçalho, qualificação, relatório, fundamentação e dispositivo). O cabeçalho foi otimizado para não sobrepor a marca do Assessor, com os dados da conta conectada, seletor de lotação e botão Sair realocados na barra de apoio inferior ao lado do Prompt Ativo.
                      </p>
                    </div>
                  </div>

                  {/* Item Reauditoria & Comparativo Antes vs Depois */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Reauditoria Ágil & Comparador Antes vs Depois</h3>
                        <time className="text-xs font-mono text-blue-600 dark:text-blue-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Fluxo otimizado de reauditoria para minutas corrigidas: o assessor cola apenas a nova redação sem precisar reenviar PDFs. O sistema reaproveita os autos do banco de dados e gera o painel comparativo exibindo a evolução da nota, checklist de alertas sanados e comparação textual lado a lado.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Exclusão no Visualizador de Minutas & Trava de Fidelidade Estrita */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Fidelidade Estrita ao PDF & Exclusão no Visualizador de Minutas</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O motor de Pré-Auditoria e Análise foi blindado com diretivas de <strong>Fidelidade Absoluta aos Fatos e Documentos do PDF</strong>, impedindo qualquer modificação, acréscimo ou supressão indevida de dados do processo. Além disso, foi adicionado o botão <strong>"Excluir" com confirmação segura</strong> diretamente no cabeçalho do Visualizador de Minutas e na Linha do Tempo da evolução cronológica.
                      </p>
                    </div>
                  </div>

                  {/* Item: Consectários & Auditoria Fato vs Prova */}
                  {/* Item 00 - Lupa do Magistrado & Salvar Tese Completa */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Lupa do Magistrado: Cópia Integral da Minuta para Teses & Paradigmas</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O botão <em>Salvar Tese no Gabinete</em> agora captura e copia automaticamente o <strong>texto integral da minuta auditada</strong> para o acervo de Minutas Paradigma ou Caderno de Teses do Juiz. Foi adicionado o botão <strong>"Limpar Tudo (Novo Cadastro)"</strong> na aba de Nova Auditoria para resetar de forma instantânea todos os campos, PDFs e minutas para um novo julgamento.
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Consectários Legais & Painel Fato vs. Prova</h3>
                        <time className="text-xs font-mono text-purple-600 dark:text-purple-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Cálculo automatizado de juros e correção monetária de acordo com as Súmulas 54, 362 e 43 do STJ e matriz analítica de confronto entre alegações da inicial/contestação e documentos probatórios juntados aos autos.
                      </p>
                    </div>
                  </div>

                  {/* Novo Item (Firebase) */}
                  {/* Item Novo: Exclusão da Evolução Cronológica dos Atos Vinculados */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Exclusão da Evolução Cronológica dos Atos Vinculados</h3>
                        <time className="text-xs font-mono text-rose-600 dark:text-rose-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Disponibilizada a opção para <strong>excluir toda a evolução cronológica dos atos vinculados</strong> a um processo diretamente pela <em>Linha do Tempo (Dossiê)</em> ou pelo painel do <em>Histórico</em> com confirmação de segurança. Também é possível excluir atos individuais ou limpar o histórico de versões refinadas no visualizador de minutas, mantendo a memória processual limpa e sob total controle do gabinete.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Pré-Auditoria Automática */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Pré-Auditoria Automática da Minuta (Segurança 100%)</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ao processar qualquer PDF de autos, o sistema executa automaticamente, antes de concluir, uma auditoria rigorosa confrontando a minuta redigida com as peças do PDF. Entrega um <strong>Certificado de Minuta Pré-Auditada</strong> com Score de Conformidade (0-100), verificação de adstrição (sem vícios citra/extra petita), valoração probatória de todos os IDs e precedentes, gerando total confiança para o assessor e para o magistrado.
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Migração para Firebase Firestore</h3>
                        <time className="text-xs font-mono text-sky-600 dark:text-sky-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O sistema foi integrado com banco de dados em nuvem robusto (Firestore) e Autenticação pelo Google (OAuth), permitindo armazenar de forma segura o histórico, cadernos de teses, base de conhecimento e prompts da equipe global, extinguindo a dependência de arquivos JSON locais limitados.
                      </p>
                    </div>
                  </div>

                  {/* Item Recente: Chave Lateral e Exclusão Permanente */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Acesso Lateral à Chave API & Exclusão Definitiva</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Integração do botão de acesso à Chave API Gratuita do Gemini diretamente na barra lateral (ao lado de &quot;Como Iniciar&quot;). Otimização e alinhamento dos botões do topo do sistema. Reforço da exclusão atômica de atos vinculados no Firestore e cache local com supressão definitiva (tombstones).
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Transferência de Gabinete e Governança Multi-Tenant */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-indigo-950 dark:text-indigo-200">Transferência Instantânea de Usuários, Deduplicação & Criação Inline</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O Super Administrador pode transferir qualquer usuário entre gabinetes contratantes diretamente pelo painel SaaS com persistência definitiva no Firestore. Inclui deduplicação automática de registros (evitando duplicações entre documentos por UID e por e-mail) com limpeza de registros fantasmas e suporte a criação imediata de novos gabinetes durante o fluxo de transferência.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Regra dos 96% nas Minutas Paradigmas & Geração Fluida */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Limiar de 96% para Sugestão de Paradigmas & Ciclo Contínuo</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Limiar de 96% (Regra Segura do Gabinete):</strong> o sistema agora somente sugere e destaca com ênfase visual máxima o botão <em>&quot;⚡ Vincular e Aplicar este Paradigma (Recomendado)&quot;</em> quando a taxa de afinidade atinge <strong>96% ou mais</strong> (caso comprovadamente idêntico). Em taxas inferiores a 96%, os quadros e botões são desidratados/discretos, sugerindo expressamente <strong>não vincular</strong> para preservar a fidelidade às provas dos autos.<br />
                        <strong>Ciclo de Geração Dinâmico e Fluido:</strong> eliminação de qualquer travamento no status de finalização da minuta, com ciclo dinâmico de etapas de redação, orçamento livre de tokens e fallback inteligente com <em>Gemini 3.7 Flash</em> e <em>Gemini 2.5 Flash</em>.
                      </p>
                    </div>
                  </div>

                  {/* Item Recente: Atualização da Suite de Modelos Gemini 3 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Atualização do Motor de IA: Gemini 3.7 Flash & Fallback Resiliente</h3>
                        <time className="text-xs font-mono text-purple-600 dark:text-purple-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Atualização Integral de Modelos:</strong> migração definitiva de todos os fluxos de execução de prompts judiciais, auditoria probatória e assistente AGAIA para o <em>Gemini 3.7 Flash</em> com failover resiliente para o <em>Gemini 3.1 Flash Lite</em> e <em>Gemini Flash Latest</em>, eliminando mensagens de descontinuação de modelos legados.
                      </p>
                    </div>
                  </div>

                  {/* Item Recente: Governança de Chaves de API & Liberação de Chave Nativa */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Governança de Chaves de API: Controle de Chave Nativa por Botão</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Botão de Ativação/Desativação da Chave Nativa:</strong> o Administrador dispõe de controle por botão no painel de administração e no modal de chaves para ativar ou desativar a modalidade de <em>Chave Nativa do Gabinete</em> para si mesmo e para qualquer outro usuário (administrador ou assessor). Qualquer usuário com a chave nativa desativada deve informar sua Chave Pessoal gratuita do Google AI Studio para executar as ferramentas de IA.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Execução Direta do Prompt sem Auditoria Prévia Compulsória */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Geração Ultrarrápida da Minuta (Execução Direta do Prompt)</h3>
                        <time className="text-xs font-mono text-sky-600 dark:text-sky-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Foco e Velocidade na Redação:</strong> remoção da auditoria compulsória prévia durante a execução do prompt. A geração da minuta agora é direta, gerando imediatamente o Relatório Fiel, Fundamentação e Dispositivo sem etapas intermediárias pesadas. 
                      </p>
                    </div>
                  </div>

                  {/* Item Mais Recente: Integração com Agenda e Pautas do Google */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          Agenda Oficial do Magistrado & Pautas da Vara (Google Calendar)
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Integração direta de agenda única e pautas de audiências via ID ou Link de compartilhamento do Google Calendar/Gmail do Magistrado. Permite que o Juiz compartilhe sua agenda única com toda a equipe do gabinete (mesmo utilizando e-mails distintos do login do app) com visualização em Mês, Semana e Lista, sincronização no Firestore e acesso rápido no cabeçalho e banner de magistrado.
                      </p>
                    </div>
                  </div>

                  {/* Item Anterior */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Chave de API Vinculada à Conta Google & Exclusão Segura de Dossiês</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Sincronização Multi-Dispositivo:</strong> a chave de API gratuita do Google Gemini agora é vinculada diretamente à conta do usuário autenticado no Firestore, sendo carregada automaticamente em qualquer dispositivo (celular, tablet ou computadores do gabinete) sem necessidade de reconfiguração.<br />
                        <strong>Sincronização Server-Authoritative de Exclusões:</strong> o Firestore passa a ser a autoridade suprema para histórico e atos processuais. Quando um ato ou dossiê é excluído (ex: no computador), ele é purgado do banco e do cache local sem risco de ressuscitação fantasma ao abrir pelo celular.
                      </p>
                    </div>
                  </div>

                  {/* Item Anterior */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Fundamentação Magistral Completa & Não Compressão pela Auditoria</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Blindagem da minuta contra condensação: a <strong>Auditoria Automática</strong> atua como camada autônoma de averiguação e porcentagens sem interferir ou comprimir a minuta. A <strong>Fundamentação</strong> passa a ser gerada no mais alto padrão judicial (5 a 8 parágrafos densos), com regularidade processual, delimitação da controvérsia, transcrição literal de artigos (ex: art. 1.767, I, e 1.775 do CC; Lei 13.146/2015), citação nominal de peritos (Dr. Nome, CRM, mov.), extração textual com aspas de laudos médicos periciais (CID-10, nível de consciência, dependência) e análise individual de cada pedido/múnus.
                      </p>
                    </div>
                  </div>

                  {/* Item Anterior */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Análise Aprofundada dos Autos & Auditoria Direta</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Otimização do fluxo: remoção de avisos preliminares antes da execução, concentrando toda a verificação na <strong>Auditoria Automática durante a execução do prompt</strong> com confronto fático-probatório real, preservação de todos os eventos/movimentações no extrator de PDFs e estruturação exaustiva de Relatório, Fundamentação e Dispositivo conforme os padrões do TJGO.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Isolamento Rigoroso Multi-Gabinete */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Isolamento Rigoroso de Dados Multi-Gabinete</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Blindagem e particionamento estrito de históricos, dossiês, prompts e membros da equipe por gabinete jurisdicional (Tenant). Garante segregação absoluta entre gabinetes distintos (ex: Gabinete Dr. Gabriel vs Gabinete Dr. Rafael), impedindo qualquer vazamento de processos ou listagem cruzada de usuários.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Identidade Nobre do Magistrado */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          Perfil Nobre & Visual Premium do Juiz
                        </h3>
                        <time className="text-xs font-mono text-amber-700 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Designação visual nobre e diferenciada para o Magistrado Titular do Gabinete: selo áureo no cabeçalho institucional, chancela de gabinete no espelho decisório, banner de sessão oficial do magistrado com atalhos de auditoria analítica e refinamento da tela de login institucional.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Gestão de Lotações por ADM & Marcador do Juiz */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Lotações por ADM & Marcador do Juiz na Equipe</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Governança aprimorada de Unidades Judiciárias: somente o Administrador possui acesso ao cadastro, edição e exclusão de comarcas/varas. A tela inicial de lançamento de PDF apresenta aos assessores apenas o seletor da lotação ativa (sem botão de cadastro). No Gerenciador de Equipe, o ADM conta agora com marcador exclusivo para identificar e destacar o Magistrado / Juiz Titular do gabinete.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Isolamento de Chaves e Categorização do Histórico */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Isolamento Estrito de Chaves & Metadados de Prompt</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Blindagem de segurança para garantir 100% de isolamento das chaves de API do Google AI Studio por UID do usuário autenticado (impedindo qualquer visualização entre contas diferentes). Exibição destacada do Prompt e da área processual (Família, Cível, Fazenda Pública, Criminal, etc.) nos cards do Histórico e Linha do Tempo, além de restrição estrita da ferramenta de Auditoria de Minutas exclusivamente para Administradores/Magistrados.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Resilient PDF Extraction & Server Fallback */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <FileUp className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Leitor e Extrator de PDF Ultrarresistente</h3>
                        <time className="text-xs font-mono text-sky-600 dark:text-sky-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de timeout com proteção anti-travamento no leitor de PDFs, fallback automático para extração via streams e transcrição multimodal via IA no servidor para PDFs escaneados ou com codificações especiais no Mapeador de Decisões e Teses.
                      </p>
                    </div>
                  </div>

                  {/* Item Super Admin SaaS Multi-Tenant */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Painel Super Admin SaaS & Governança Multi-Tenant</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de painel executivo com métricas globais de gabinetes e usuários, controle de ativação/suspensão geral de inquilinos, transferência direta de membros entre gabinetes e sistema de transmissão de comunicados em tempo real (SaaS Broadcast).
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Injeção Seletiva de Modelos no Caderno */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Seletor Interativo de Partes para o Caderno</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ao injetar um modelo do juiz no Caderno de Teses Normativas, abre-se uma aba interativa para selecionar as partes específicas a transformar em tese (Fundamentação/Raciocínio, Diretriz/Resumo, Critérios Probatórios ou Recorte Customizado) com pré-visualização editável em tempo real.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Preservação de Membros do Gabinete */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Consolidação e Preservação de Membros do Gabinete</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Unificação de identificadores e aliases do Gabinete Titular do Dr. Rafael Machado de Souza, assegurando a exibição integral do magistrado, administradores e assessores vinculados, com ordenação hierárquica e integridade multi-tenant em produção.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Multi-Key & Deactivation */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Gerenciador de Múltiplas Chaves e Desativação</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Suporte a cadastro de múltiplas chaves pessoais do Google AI Studio com rótulos customizados, alternância ágil de chave ativa e opção de desativação temporária sem necessidade de exclusão.
                      </p>
                    </div>
                  </div>

                  {/* Item Visão Multimodal e Gestão de Varas */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Visão Multimodal de Manuscritos, Varas Customizáveis e Gestão de Gabinetes</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        • <strong>Visão Multimodal de Manuscritos:</strong> Inspeção visual de notas promissórias, recibos e cheques com confronto matemático imediato (ex: taxas manuscritas vs planilhas).<br />
                        • <strong>Alteração de Vara/Lotação no Histórico:</strong> Todos os membros do gabinete podem alterar a Vara (Família, Criminal, Cível, etc.) e Lotação em cada processo e ato.<br />
                        • <strong>Gestão Firme de Usuários:</strong> Transferência direta entre gabinetes e exclusão definitiva de contas sem reatribuição involuntária.
                      </p>
                    </div>
                  </div>

                  {/* Item Matriz de Auditoria Forense e Marcha Processual */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Matriz de Auditoria Forense (6 Pilares) & Marcha Processual</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação da Matriz de Auditoria Forense e Cautelar Documental com 6 pilares de inspeção profunda (assinaturas e logs ICP/Gov.br, anacronismos temporais, rasuras/emendas/fontes, autenticidade cartorária com selos e QR codes, subsunção aos arts. 428/429 CPC e Tema 1049 STJ, e confronto direto PDF vs Minuta), além do respeito rigoroso à ordem cronológica e à preclusão de matérias já decididas.
                      </p>
                    </div>
                  </div>

                  {/* Item: Controle de Visibilidade da Lupa do Juiz */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Acesso Restrito à Lupa do Juiz (Super Admin)</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O botão, modal de auditoria de minutas e a aba explicativa no Manual referentes à <strong>Lupa do Juiz / Função de Ouro</strong> foram configurados com restrição exclusiva ao perfil <strong>Super Admin</strong>, mantendo o ambiente de trabalho e navegação dos demais usuários focado nas funções ativas do gabinete.
                      </p>
                    </div>
                  </div>

                  {/* Item: Controle de Visibilidade da Extensão PROJUDI */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Puzzle className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Acesso Restrito à Extensão PROJUDI (Super Admin)</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        O botão e ponto de acesso da Extensão PROJUDI foram configurados para exibição restrita e exclusiva ao perfil <strong>Super Admin</strong>, mantendo a interface dos demais perfis do gabinete limpa e direcionada aos fluxos principais de análise via PDF e texto.
                      </p>
                    </div>
                  </div>

                  {/* Item Sincronização e Convites */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Sincronização Total de Convites e Membros</h3>
                        <time className="text-xs font-mono text-purple-600 dark:text-purple-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Aprimoramento do fluxo de entrada de novos assessores convidados: vinculação imediata ao gabinete emitente no momento do primeiro login Google, consumo automático do convite e botão de atualização em tempo real na listagem de membros.
                      </p>
                    </div>
                  </div>

                  {/* Item: Restauração de Cadastros e Multi-Fallback de Segurança */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Sincronização & Restauração Instantânea de Backups</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Aprimoramento completo do motor de restauração de backups: ao aplicar um ponto de restauração, o sistema realiza a gravação simultânea nos caminhos multi-tenant do Firestore, atualiza o cache local (localStorage) de todas as lotações e dispara eventos reativos para atualizar imediatamente os seletores de <strong>Teses, Minutas Paradigmas, Guia PROJUDI e Gerenciador de Prompts</strong> na tela sem necessidade de recarregar a página.
                      </p>
                    </div>
                  </div>

                  {/* Item Backup Automático */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Backup Automático ao Transmitir Alertas & Central de Snapshots</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Sempre que o Administrador transmite um Comunicado ou Alerta de Republicação, o sistema gera automaticamente um snapshot completo de todos os dados do gabinete (Teses, PROJUDI, Paradigmas, Prompts, Lotações e Calendário) no Firestore. Foi adicionada a aba "Snapshots & Backups" no painel com histórico, download de arquivos JSON, botão de restauração instantânea e opção para descartar/excluir backups.
                      </p>
                    </div>
                  </div>

                  {/* Item: Correção e Modal de Exclusão de Usuários no Super Admin */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Exclusão Definitiva de Usuários no Super Admin</h3>
                        <time className="text-xs font-mono text-rose-600 dark:text-rose-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de modal dedicado de confirmação para exclusão permanente de membros da base Firestore, eliminando falhas de execução no iframe, sincronizando regras de segurança e limpando convites pendentes de forma segura.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Identificação Visual do Tipo de Acesso */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Identificação Visual do Tipo de Acesso</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Exibição de insígnias e badges identificadoras do nível de permissão do usuário conectado tanto no <strong>Menu do Assessor Mobile</strong> quanto na régua superior Desktop: <strong>Juiz Titular</strong> (dourado com coroa), <strong>Super ADM</strong> (índigo com escudo), <strong>ADM</strong> (azul com escudo) e <strong>Assessor</strong> (esmeralda).
                      </p>
                    </div>
                  </div>

                  {/* Item Mais Recente: Otimização Mobile e Fluxo de Chamados */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Otimização Mobile Responsiva & Abertura Direta de Chamados</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Adaptação completa da Central de Chamados, menu do cabeçalho, alternador de modo (Simplificado/Avançado) e popover de notificações para dispositivos móveis e celulares. O botão <strong>+ Novo</strong> agora transiciona instantaneamente para o formulário em tela cheia com botão de retorno, barra de métricas com rolagem suave horizontal e popover fixado para evitar cortes de tela.
                      </p>
                    </div>
                  </div>

                  {/* Item Anterior: Central de Chamados, Feedback & Melhorias */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Central de Chamados, Feedback & Melhorias (Estilo Ticket)</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de canal direto e estruturado para que magistrados e administradores de gabinete solicitem melhorias, implementação de recursos, feedback de erros/acertos e novos prompts. Conta com <strong>sininho com badges de notificações em tempo real</strong>, fluxo completo de status (<em>Aguardando, Em Análise, Em Construção, Solucionado</em>), mensagens interativas e arquitetura modular independente com ativação/desativação sem impacto nos demais recursos do sistema.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Persistência e Governança de Usuários */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Sincronização & Persistência Instantânea de Usuários</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Aprimoramento da governança no Painel Super Admin e Gestão de Equipe: alternância de funções (Assessor / Administrador), ativação/desativação de contas e status de magistrado com <strong>atualização otimista imediata na interface e sincronização atômica multidocumental no Firestore</strong> por UID e e-mail.
                      </p>
                    </div>
                  </div>

                  {/* Item Mais Recente: Taxonomia Normativa & Pesquisa Legislativa Integrada */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Taxonomia Normativa & Pesquisa Legislativa Integrada (TJGO)</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação do motor de <strong>subsunção taxonômica dinâmica</strong> e da ferramenta de <strong>Pesquisa Legislativa & Consectários</strong>. Mapeia automaticamente leis específicas (Fazenda Pública, Bancário, Locações, Cheques, DPVAT, Saúde Suplementar, Aviação) e parametriza os juros e correção monetária aplicáveis a cada microssistema em conformidade com o STF, STJ e TJGO.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Varredura Profunda e Resgate de Cadastros */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Varredura Profunda & Resgate de Cadastros</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ferramenta de varredura profunda no Firestore e nos snapshots de segurança históricos para resgatar automaticamente cadastros de <strong>teses jurídicas, modelos de minutas paradigmas, guias de lançamento PROJUDI e prompts personalizados</strong>, consolidando-os em suas devidas partições de gabinetes sem risco de perda de dados.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Bancada de Tripla Conferência (Auditoria Ouro do Juiz) */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Bancada de Tripla Conferência (Auditoria Ouro) <span className="text-[10px] uppercase font-black bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 px-2 py-0.5 rounded-full ml-1">🚧 Em Construção</span></h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação da visualização integrada 360° para Magistrados e Super Admins: <strong>PDF integral dos autos</strong> (com leitor visual gráfico e busca de termos), <strong>Minuta Gabarito gerada pelo Sistema</strong> (referência ideal da IA) e <strong>Minuta Pré-Analisada do Assessor</strong> (com editor ao vivo e botões para Homologação, Parecer de Devolução e Injeção no Caderno de Teses).
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Resiliência de Armazenamento Local e Cota */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Resiliência de Armazenamento & SafeStorage</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de camada centralizada <code>SafeStorage</code> para prevenção proativa de erros de cota (<code>QuotaExceededError</code>) no navegador. Inclui expurgo inteligente de snapshots e logs dispensáveis, preservando integralmente todos os dados em nuvem no Firestore.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Snapshots Globais de Alta Capacidade com Chunking */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Snapshots Globais com Particionamento Automático</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de arquitetura de <strong>particionamento em subcoleções (chunking)</strong> para os Snapshots Globais e Backups do Gabinete. Permite capturar e restaurar bases completas de qualquer tamanho (incluindo históricos volumosos e acervos de decisões) superando com segurança absoluta o limite de 1MB por documento do Firestore.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Gestão e Edição de Lotações / Comarcas nos Gabinetes */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Gestão e Edição Precisa de Lotações / Comarcas</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Inclusão de campo dedicado de <strong>Comarca / Lotação Inicial</strong> no provisionamento de novos gabinetes no Super Admin (ex: <em>Palmeiras de Goiás</em>), campo de <strong>Edição de Lotação Principal</strong> no modal de ajuste de dados do gabinete e recurso de <strong>renomeação inline direta</strong> no Gerenciador de Lotações com sincronização atômica em tempo real.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Otimização de Layout Responsivo para Notebooks e Todos os Dispositivos */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Layout Responsivo & Ergonomia Multidispositivos</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ajuste estrutural em todo o sistema para compatibilidade perfeita com notebooks (resoluções de 1366x768 e 1080p), tablets e celulares: gaveta de navegação compacta com acionamento inteligente em telas intermediárias (&lt; 1280px), recolhimento automático e persistência de estado do tutor e abas laterais flutuantes (com botões compactos arredondados na borda e z-index harmonizado para desobstruir a área de trabalho), garantindo ergonomia e visibilidade total dos autos e minutas.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Robustez no Provisionamento de Novos Gabinetes */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Robustez no Provisionamento de Novos Gabinetes</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Otimização no formulário de cadastro do Super Admin: geração automática inteligente de slug/ID de partição no Firestore a partir do nome, criação instantânea da Lotação/Vara inicial, proteção contra duplicidade de submissão e sincronização atômica do perfil e convite do magistrado titular.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Atualização Instantânea de Status e Limpeza do Sininho de Notificações */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Sincronização de Status de Chamados e Sininho Inteligente</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Aprimoramento completo no ciclo de vida dos chamados: alteração de situação com atualização em tempo real na interface, sincronização imediata no Firestore/Storage e sininho de notificações aprimorado com abas "Não Lidos" e "Todos", botão individual de dispensar notificação e suporte a "Ler todos" com remoção instantânea dos itens pendentes.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Controle Granular e Isolamento de Chamados */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Isolamento e Segurança de Chamados (RBAC Multi-Tenant)</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação de controle rigoroso de acesso aos chamados de suporte: assessores acessam estritamente suas próprias solicitações (Modo Privado), administradores de gabinete visualizam as demandas de sua lotação, e a engenharia/Super Admin conta com gestão global, além de filtros contextuais de escopo e ação de exclusão segura.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Navegação Multi-Gabinete para Super Admin */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Navegação Multi-Gabinete do Super Admin</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Visualização e alternância dinâmica e segura entre todos os gabinetes e lotações/comarcas cadastradas diretamente pelo seletor do cabeçalho, menu mobile e seletor da tela principal, exclusiva para o Super Admin em modo somente leitura/inspeção, sem alterar nada no banco de dados.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Sinalização da Extensão PROJUDI em Construção */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Extensão PROJUDI (Módulo em Construção)</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Sinalização informativa de <strong>Módulo em Construção</strong> no botão e modal da extensão satélite do PROJUDI, reforçando que o sistema opera de maneira completa e autônoma diretamente pelo navegador web.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Exclusão Robusta de Histórico & Dossiês com Sincronização em Nuvem */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Exclusão Robusta do Histórico & Dossiês com Sincronização em Nuvem</h3>
                        <time className="text-xs font-mono text-rose-600 dark:text-rose-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Aprimoramento definitivo na exclusão de análises individuais e dossiês processuais completos: a remoção atua agora transversalmente em todas as coleções de gabinetes e rotas canônicas do Firestore com registro imediato de <em>tombstones</em>, impedindo o retorno indesejado de registros pelo cache. As regras de segurança do Firestore (<code>firestore.rules</code>) foram calibradas com permissões estritas para o gabinete, e a confirmação de exclusão agora conta com botões com estado de carregamento animado e proteção contra múltiplos cliques.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Otimização Mobile da Central de Chamados & Sininho */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Central de Chamados Mobile & Notificações</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Otimização responsiva completa para dispositivos móveis: correção no layout de resposta de tickets, inclusão de chips de toque rápido para alteração instantânea de situação/status, botões de ação ergonômicos e correção no botão <strong>"Marcar todas como lidas"</strong> no sininho com isolamento por usuário.
                      </p>
                    </div>
                  </div>

                  {/* Item Novo: Convites e Bloqueio de Acesso */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Acesso Exclusivo por Convite & Disparo de E-mail</h3>
                        <time className="text-xs font-mono text-purple-600 dark:text-purple-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Bloqueio estrito de novos cadastros avulsos: usuários não convidados são isolados em tela de pendência e impedidos de acessar gabinetes. Administradores contam agora com ações rápidas para envio direto de convites por <strong>Gmail Web, E-mail (Outlook), WhatsApp e Cópia Formatada</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Item Lupa do Magistrado & Bancada de Tripla Conferência */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Lupa do Magistrado & Bancada de Tripla Conferência: Operacionalização Isolada</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Ativação do motor dedicado e isolado <code>/api/audit-assessor-draft</code> no servidor, permitindo a conferência forense profunda da minuta do assessor em confronto com os autos: cálculo de <strong>Score Global (0 a 100)</strong>, pilares de <strong>Adstrição aos Pedidos</strong>, <strong>Choque Fático-Probatório</strong> e <strong>Preliminares & Rito</strong>. Além disso, a Coluna 2 (Minuta Gabarito) da Bancada de Tripla Conferência agora é preenchida diretamente com o modelo referencial sem esperas desnecessárias, assegurando total estabilidade e isolamento modular.
                      </p>
                    </div>
                  </div>

                  {/* Item Mobile Layout & Z-Index Normalization */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Layout Mobile da Mesa de Audiência & Sobreposição de Modais (Z-Index)</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Ajuste completo da interface para celulares e smartphones: navegação responsiva por abas no <strong>Mutirão Expresso</strong> (alternância dinâmica entre Mídia/Degravação e Ata/Sentença evitando rolagem vertical cansativa), alvos de toque ergonômicos (&ge; 44px), botões rápidos de <strong>Copiar</strong>, <strong>Imprimir</strong> e <strong>Salvar</strong>. Além disso, correção da pilha de camadas (z-index) garantindo que modais de aviso, inserção de <strong>Chave de API</strong>, recados e créditos de IA abram sempre em primeiro plano absoluto sobre a mesa de audiência.
                      </p>
                    </div>
                  </div>

                  {/* Item Blindagem de PDF & Trava Super Admin */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Blindagem de Alta Resiliência de PDFs & Trava Super Admin em Petições</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Otimização profunda do motor de envio de PDFs para a IA: quando o texto dos autos já é integralmente extraído com alta precisão, o envio redundante de imagens base64 de páginas completas é suspenso, eliminando sobrecarga e garantindo resposta ágil. Ampliado o carrossel de contingência para 4 modelos (Gemini Flash Latest, 3.8 Flash, 3.1 Flash Lite e 3.6 Flash) com backoff exponencial. Além disso, o módulo <strong>Petição & Defesa 360°</strong> foi blindado com checagem estrita tanto no front-end quanto nos endpoints do servidor, sendo visível e executável unicamente pelo Super Administrador (<code>fabriciocunha.adv@gmail.com</code>).
                      </p>
                    </div>
                  </div>

                  {/* Item Mesa de Audiências: Mágica do PDF & Sentença com IA */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Mesa de Audiência Inteligente: Mágica do PDF & Sentença por IA</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Entrada do fluxo automático completo: o magistrado insere o(s) PDF(s) dos autos e a IA extrai e preenche instantaneamente <strong>número do processo, partes, assunto, resumo da lide, fatos e provas do autor, fatos e contraprovas do réu, pedido contraposto/reconvenção, distribuição do ônus da prova (art. 373 CPC/CDC)</strong>, diagnóstico entre <strong>prova já constante nos autos vs o que AINDA TEM QUE PROVAR na audiência</strong>, roteiro de perguntas para testemunhas, painel de deliberações editáveis em mesa e botão para <strong>geração da Sentença Oral em Ata por IA</strong> com dispositivo e fundamentação formal. Totalmente adaptado para desktop e telas de celulares.
                      </p>
                    </div>
                  </div>

                  {/* Item Resiliência IA e Histórico Mobile */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Histórico Mobile & Espera Progressiva na IA (Backoff Exponencial)</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Otimização responsiva completa do modal de Histórico e Dossiês Unificados para telas de smartphones (cabeçalho flexível, filtros com rolagem horizontal, cartões de processos ajustados e paginação compacta). Implementação no backend de retentativas automáticas com espera progressiva e backoff exponencial com jitter para resiliência imediata a picos de demanda na API Gemini.
                      </p>
                    </div>
                  </div>

                  {/* Item Petição Inicial 360 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Redator de Petição Inicial 360° (Módulo Exclusivo da Advocacia)</h3>
                        <time className="text-xs font-mono text-purple-600 dark:text-purple-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Lançamento do módulo totalmente desvinculado e independente para o Super Admin: histórico dedicado no Firestore (<code>initial_petitions_history</code>), pesquisa jurisprudencial pró-autor com seletor de Tribunais, auditoria de conformidade preventiva CPC (arts. 319/320), biblioteca de causas repetitivas e auto-extração probatória de arquivos.
                      </p>
                    </div>
                  </div>

                  {/* Item Mesa de Audiência - Estabilização Pauta Normal e Mutirão Expresso */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Mesa de Audiência: Estabilização Isolada (Pauta Normal e Mutirão Expresso)</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Ativação dos endpoints dedicados <code>/api/hearing-copilot</code>, <code>/api/mutirao-extract-ata</code> e <code>/api/mutirao-video</code> no servidor, com total isolamento e independência modular. Ao carregar arquivos PDF no Mutirão Expresso, a ata preliminar, autuação e prolação rápida operam de forma isolada sem qualquer impacto nas análises de PDFs do editor principal.
                      </p>
                    </div>
                  </div>

                  {/* Item Mesa de Audiência & Ata */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <FileSignature className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Mesa de Audiência Inteligente: Extração de PDF & Aba de Ata de Audiência</h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação do pipeline de extração mágica por PDF com preenchimento integral dos autos (partes, fatos, ônus da prova, oitivas e deliberações) e entrega da <strong>Aba 5: Ata de Audiência</strong>, permitindo importar deliberações e sentenças com 1 clique, editar presenças, redigir o termo com IA e exportar em Word (.docx), PROJUDI ou impressão direta.
                      </p>
                    </div>
                  </div>

                  {/* Item Prompts Sync */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Sincronização de Prompts em Tempo Real (Multi-Dispositivo)</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Os prompts de análise e minutas judiciais agora são sincronizados instantaneamente em tempo real entre celulares, tablets e computadores via Firestore listener reativo. Desacoplamento de restrições por lotação local garantindo disponibilidade total dos prompts de cada gabinete em qualquer aparelho.
                      </p>
                    </div>
                  </div>

                  {/* Item Auditoria Ouro Juiz Ativo */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Auditoria Ouro: Liberação para Juiz Ativo</span>
                          <span className="text-[10px] uppercase font-black bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded">Ouro</span>
                        </h3>
                        <time className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Liberação integral da <strong>Auditoria Ouro (Lupa do Magistrado & Auditor de Minutas / Bancada de Tripla Conferência)</strong> para usuários com a atribuição de <strong>Juiz Ativo / Magistrado Titular</strong>. O acesso agora está disponível no Banner Nobre do Magistrado, na Barra Lateral e no menu superior.
                      </p>
                    </div>
                  </div>

                  {/* Item Pool e Rotação Automática Transparente de Chaves Gemini */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Pool Inteligente e Rotação Automática de Chaves Gemini (Failover 429)</h3>
                        <time className="text-xs font-mono text-sky-600 dark:text-sky-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Habilitação do mecanismo de redundância transparente entre múltiplas chaves cadastradas. Caso uma chave atinja o limite de requisições ou quota gratuita do Google AI Studio (Erro 429 ou erro de autenticação), o backend avança instantaneamente para a próxima chave disponível do pool, preservando a requisição e notificando a interface via cabeçalho e toast sem travar a produção da minuta.
                      </p>
                    </div>
                  </div>

                  {/* Item Etapa Única de Alta Performance & Blindagem Estrita */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Geração Unificada em 1 Etapa Real & Blindagem da Chave Nativa</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Unificação técnica da minuta em uma única requisição ao modelo: eliminação de ciclos sequenciais redundantes com redução drástica (&gt;50%) no consumo de tokens e custos, preservando integralmente todas as funções de auditoria forense (6 pilares) e teses vinculantes do gabinete. O interruptor de <em>Chave Nativa</em> foi blindado contra failovers involuntários: quando desativado, o sistema opera estritamente com as chaves particulares cadastradas pelo usuário. Textos colados e PDFs passam por filtragem aprofundada de ruídos e carimbos processuais.
                      </p>
                    </div>
                  </div>

                  {/* Item Telemetria de Custos em Reais R$ */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Telemetria de Custos de IA em Reais (R$) por Gabinete e por Usuário</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Implementação do cálculo financeiro em tempo real em Reais (R$) no Painel Super Admin: conversão automática da volumetria de tokens da API Gemini (Prompt e Saída) em valores monetários no resumo geral, na listagem de cada gabinete e no detalhamento gaveta por assessor/usuário, com suporte à ferramenta de importação retroativa de históricos passados.
                      </p>
                    </div>
                  </div>

                  {/* Item Restauração do Modelo Unificado e Prioridade de Chave Nativa */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Restauração do Modelo Unificado & Priorização da Chave Nativa</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Remoção definitiva da bifurcação "Turbo vs Completa" e retorno ao modelo único magistral de alta robustez (com relatório fidedigno, fundamentação densa e dispositivo operacional sem erros de formatação ou JSON bruto). O Pool de Chaves foi reajustado cirurgicamente: quando a chave nativa estiver ativada, ela opera com prioridade máxima imediata; caso desativada, o sistema aciona de forma transparente as chaves cadastradas do usuário em rotação automática na Esteira Estendida de Modelos Flash.
                      </p>
                    </div>
                  </div>

                  {/* Item Resiliência de Extração e Validação das Partes */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Blindagem de Extração de Partes (Promovente & Promovido)</h3>
                        <time className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Reforço integral nos motores Turbo e Duas Etapas para extração nominal das partes em minutas a partir de PDFs processuais. Filtro cirúrgico impede que expressões de andamentos processuais (ex.: <em>designação de audiência</em>, <em>certidões</em>, <em>despachos</em>) poluam os campos de Promovido ou Promovente, ativando fallback inteligente com busca de polos e dispositivos condenatórios no corpo integral dos autos, do visualizador e das exportações (Word/PDF).
                      </p>
                    </div>
                  </div>

                  {/* Item Resiliência Máxima e Esteira Multi-Modelo Antifalhas */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Esteira Flash Resiliente Antifalhas & Failover Automático de Cota</h3>
                        <time className="text-xs font-mono text-violet-600 dark:text-violet-400 font-medium">Setembro 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Blindagem integral contra sobrecarga dos servidores Google (503 Service Unavailable / High Demand) e exaustão de cota por chave (429 Rate Limit). O motor conta com bypass dinâmico de schemas rígidos, esteira escalonada (Gemini 3.8, 3.7, 3.6, 3.5, 3-preview, flash-latest e flash-lite) e failover automático instantâneo para chaves reservas do pool do usuário sem interromper a redação da minuta.
                      </p>
                    </div>
                  </div>

                  {/* Item 0 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Guia Passo a Passo</h3>
                        <time className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Inclusão de um guia prático numerado dentro do Manual do Sistema para orientar novos usuários do gabinete desde a inserção do processo até a geração e revisão da minuta.
                      </p>
                    </div>
                  </div>

                  {/* Item 1 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-slate-100 text-slate-900 dark:bg-slate-900/50 dark:text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Rebranding e Manual</h3>
                        <time className="text-xs font-mono text-slate-900 dark:text-slate-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Alteração do nome do sistema para <strong>Assessor Judicial</strong>, conferindo tom mais formal. Criação deste Manual do Sistema com guias de versionamento e colaboração.
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Injeção Global de Teses</h3>
                        <time className="text-xs font-mono text-blue-600 dark:text-blue-400 font-medium">Agosto 2026</time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Implementação do Caderno de Teses do Gabinete, injetando diretrizes padronizadas em todas as análises para coibir alucinações.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};
