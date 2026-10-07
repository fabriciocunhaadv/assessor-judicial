import React, { useState, useEffect } from "react";
import { Joyride, Step, STATUS, EVENTS, EventData } from "react-joyride";
import { useAuth } from "../lib/AuthContext";

interface SystemTourProps {
  runAppTour?: boolean;
  runResultTour?: boolean;
  runHistoryTour?: boolean;
  runPromptTour?: boolean;
  runTesesTour?: boolean;
}

export const SystemTour: React.FC<SystemTourProps> = ({
  runAppTour,
  runResultTour,
  runHistoryTour,
  runPromptTour,
  runTesesTour,
}) => {
  const { userProfile, completeTour, isSuperAdmin, isAdmin, isJudge } = useAuth();
  
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentTourId, setCurrentTourId] = useState<string | null>(null);
  const [tourKey, setTourKey] = useState(0);

  // App Tour Steps (Passo a Passo Principal)
  const appSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="text-left font-sans space-y-2">
          <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2">
            Bem-vindo ao Assessor Judicial! ⚖️
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Este tour rápido vai guiá-lo pelos recursos avançados do sistema: perfis nobres com chancela do Magistrado Titular, geração de minutas com espelho estrutural do juiz, auditoria analítica e integração com PROJUDI.
          </p>
        </div>
      ),
      placement: "center",
    },
    {
      target: "#tour-header-unit",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Passo 1: Sua Lotação / Comarca</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Selecione a Vara ou Comarca ativa. O sistema ajusta automaticamente o cabeçalho, comarca e formatação oficial do tribunal.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-extensao",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800">Passo 2: Extensão PROJUDI (Módulo em Construção) 🔨</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Módulo satélite experimental para o Google Chrome em fase de engenharia. O Assessor Judicial Web opera de forma integral e independente pelo navegador.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-input-panel",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Passo 3: Seletor de Tipo de Minuta & Inserção dos Autos</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Utilize o seletor interativo para escolher o <strong>Tipo de Minuta (Auto-Detectar, Sentença, Decisão, Despacho ou Embargos)</strong>. No modo <em>Auto-Detectar</em>, a inteligência opera pelo <strong>Protocolo do Fio da Meada</strong> sem travas compulsórias, com leitura fidedigna dos fatos, relatos e provas do PDF e <strong>enfrentamento integral e circunstanciado de 100% dos pedidos preliminares ou urgentes pendentes de deliberação</strong> em qualquer ramo do direito (Família, Cível, Consumidor, Fazenda Pública, Saúde e Juizados). Articula dinamicamente a legislação de regência (CPC, CC, CDC, ECA, Lei 5.478/68 e microssistemas), as diretrizes do prompt ativo do gabinete e a jurisprudência vinculante (Súmulas e precedentes do TJGO, STJ e STF), com extração canônica de polos e vinculação soberana de TPU CNJ (códigos 25, 480, 26, 219, 220, 221 e 60). Todas as minutas seguem o <strong>Guia Simples e Fácil do TJGO</strong> e o Pacto pela Linguagem Simples (STF/CNJ): sem "latinórios" ou arcaísmos, com ordem direta e máxima densidade fundamentadora.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "#tour-assessor-guide-banner",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800 flex items-center gap-1.5">
            <span>Guia do Assessor (Co-Piloto Ativo) 💡</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Prefere ter <strong>controle total</strong> antes da IA redigir? Clique aqui a qualquer momento para ver como injetar teses do Dizer o Direito, informativos STJ, cadernos de teses e prompts personalizados sem cair em "caixas-pretas".
          </p>
        </div>
      ),
      placement: "top",
    },
    {
      target: "#tour-paradigm-selector",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800">Passo 4: Minuta Paradigma & Limiar de 96% ⚡</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            O sistema afere a taxa de afinidade temática dos autos com os modelos do magistrado. Quando a taxa atinge <strong>96% ou mais</strong> (caso praticamente idêntico), o sistema <strong>recomenda e destaca com ênfase máxima</strong> o botão <em>⚡ Vincular e Aplicar este Paradigma</em>.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "#tour-prompt-selector",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Passo 5: Tipo de Ato, Detecção Mandatória de Fase & Rigor Exaustivo ⚖️</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Selecione o tipo de ato ou use <strong>Auto-Detectar</strong>. Caso os autos contenham apenas a <strong>Petição Inicial</strong> (sem contestação ou instrução), o sistema ativa a <strong>Detecção Mandatória de Fase Inicial</strong>, impedindo sentenças de mérito extemporâneas e gerando <strong>Decisão Interlocutória</strong> (com exame exaustivo da tutela de urgência, probabilidade, perigo de dano, astreintes e prazo) ou <strong>Despacho</strong>, com tríplice citação (Mov., Arq. e Pág.) e transcrição literal de dispositivos legais e precedentes.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "#btn-sidebar-binding-precedents, #btn-header-binding-precedents",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800 flex items-center gap-1.5">
            <span>Súmulas Vinculantes, TJGO & Grounding ao Vivo ⚖️</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Em todas as análises, o sistema aplica um motor híbrido inteligente: consulta o catálogo nativo de Súmulas (STF, STJ, TNU) e <strong>Informativos do TJGO</strong>, com sincronização semanal automatizada (ou manual para Super Admin) e <strong>importação integral de novos informativos em PDF</strong> com leitura contínua de 100% das páginas e particionamento em lotes sequenciais. O controle de <strong>Grounding ao Vivo</strong> (pesquisa em tempo real em <em>transparencia.tjgo.jus.br</em>, STJ e STF) é gerenciado com segurança pelo Super Admin.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-legislative-lookup",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-indigo-800 flex items-center gap-1.5">
            <span>Legislação & Parametrização de Consectários (TJGO) 📖</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Mapeamento taxonômico de 10 microssistemas jurídicos (Fazenda Pública, Bancário, Locações, Cheques, DPVAT, Saúde, Aviação, etc.) com pesquisa normativa em tempo real, cálculo exato de juros/correção e geração de cláusula de dispositivo para inserção com 1 clique na minuta.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-agenda",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800 flex items-center gap-1.5">
            <span>Agenda Oficial & Pautas do Magistrado 📅</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Consulte a pauta de audiências e os compromissos oficiais do Magistrado integrados diretamente ao Google Calendar / Gmail em uma agenda única centralizada. Permite alternar visualização em Mês, Semana e Lista, além de configuração ágil por ID ou Link pelo Magistrado/Administrador.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-api-key",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800 flex items-center gap-1.5">
            <span>Chave Nativa Blindada, Modais Coerentes & Pool Inteligente 🔑⚡</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            O sistema gerencia com rigor o acesso à IA: a <strong>Chave Nativa Corporativa</strong> é governada com exclusividade pelo <strong>Super Admin</strong>. A esteira conta com <strong>Proteção Ativa de Créditos Faturados</strong>, <strong>Desoneração Cirúrgica da Etapa 2</strong> (sem duplicação desnecessária de tokens e montagem instantânea no servidor) e <strong>Alternância Balanceada de Chaves (Key Pool Rotation)</strong> entre as etapas: a Etapa 2 inicia diretamente pela próxima chave disponível do pool com cota 100% livre. Além disso, a rotação foi <strong>blindada contra abandono prematuro</strong> na esteira (Gemini 3.8 ➔ 3.7 ➔ 3.6 ➔ 3.5 ➔ Latest ➔ Lite). Quando desativada pelo Super Admin, o sistema opera via <strong>Pool Ilimitado de Chaves</strong> (suporte a qualquer quantidade de projetos/chaves com rotação automática por exaustão de cota).
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-copilot-top",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-indigo-800 flex items-center gap-1.5">
            <span>Agente Copiloto IA no Topo (ao lado de Configurações) 🤖⚡</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Acesso direto ao assistente técnico do gabinete no topo da tela: consultas ao CPC, jurisprudência vinculante, análise dos autos e redação rápida de quesitos e despachos. Projetado em <strong>modo ultra-econômico (~200 a 600 tokens)</strong> para preservar 100% da cota gratuita da sua chave Gemini. Possui <strong>desvinculação cirúrgica automática</strong> ao excluir o processo ou mudar de página, além de botão <em>[Desvincular]</em> sob demanda.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-turbo-top, #btn-header-turbo-top-mobile",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800 flex items-center gap-1.5">
            <span>Módulo Turbo Independente (15 a 30s) ⚡🚀</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Motor autônomo e de alta velocidade para análise rápida de PDFs ou autos colados sem passar pela esteira profunda. Gera a minuta completa (Sentença, Decisão ou Despacho) com fundamentação substancial e aprofundada (art. 489 do CPC), sem simplificações rasas, e formatação rica com parágrafos bem espaçados, negrito, itálico e citação de artigos de lei. Extrai minuciosamente do PDF todos os elementos fáticos e probatórios com <strong>indicação expressa de movimento, arquivo e página (mov., arq., p.)</strong>. Inclui botão de integração direta com o <strong>Copiloto IA</strong>, que puxa automaticamente os autos no modo <em>Autos em Tela</em> para tirar dúvidas ou ajustar a minuta. Faixa ideal: <strong>até 50 a 80 páginas</strong> (máx. 100 págs recomendadas).
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-manual",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800 flex items-center gap-1.5">
            <span>Manual do Sistema & Atualizações 📖</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Acesse o Manual completo do sistema, acompanhe o <strong>Registro de Modificações (Changelog)</strong> para ficar por dentro das últimas melhorias e funcionalidades (como a recente correção no renderizador Markdown), e acesse o guia de suporte.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-user-manager",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-purple-800 flex items-center gap-1.5">
            <span>Gestão da Equipe, Comunicados & Backups 👥</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Área de administração do gabinete para <strong>convidar novos assessores</strong>, gerenciar acessos e permissões, <strong>transmitir comunicados e alertas permanentes com backup automático</strong> do gabinete e gerenciar/restaurar snapshots de segurança no banco de dados, através de caixas de confirmação nativas e seguras.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-superadmin",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-indigo-800 flex items-center gap-1.5">
            <span>Painel Super Admin, Telemetria Forense de PDFs & Monitoramento 🏢</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Módulo executivo global com rateio detalhado de consumo de tokens e custos financeiros (R$ e USD) por funcionalidade específica, matriz comparativa Gabinetes x Módulos, log em tempo real de requisições de IA e <strong>Caixa-Preta Forense de PDFs em Produção</strong> (rastreamento de páginas, caracteres, movimentos capturados e diagnósticos da calibração universal multimatéria em tempo real).
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-notification-bell",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800 flex items-center gap-1.5">
            <span>Central de Chamados & Sininho de Recados 🔔</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Canal direto no estilo <em>ticket</em> com <strong>isolamento estrito de privacidade</strong>: assessores acessam somente suas próprias solicitações (Modo Privado), gestores de gabinete visualizam os chamados de sua equipe e a engenharia conta com painel de atendimento global. Acompanhe a situação em tempo real (<em>Aguardando, Em Análise, Em Construção, Solucionado</em>), filtre pendências não lidas, dispense notificações individualmente ou use <strong>"Ler todos"</strong> com atualização instantânea.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-minute-auditor",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800 flex items-center gap-1.5 flex-wrap">
            <span>Lupa do Magistrado & Bancada de Tripla Conferência 🔍</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-mono text-[9px] font-bold">JUIZ ATIVO & SUPER ADMIN</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            O Magistrado dispõe da <strong>Bancada de Tripla Conferência (360°)</strong> com motor de auditoria de alta eficiência: visualização lado a lado do <strong>PDF integral dos autos</strong>, da <strong>Minuta Gabarito referencial (gerada sob demanda em 1 clique)</strong> e da <strong>Minuta Pré-Analisada pelo Assessor</strong> (com ferramentas de deliberação imediata: Homologar, Devolver com Parecer e Salvar no Caderno de Teses). A separação sob demanda da minuta gabarito economiza mais de 50% de tokens por auditoria, mantendo o confronto probatório estrito e ágil.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#btn-header-hearing-workbench",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800 flex items-center gap-1.5 flex-wrap">
            <span>Mesa de Audiências Inteligente & Mutirão Expresso (100% Mobile) ⚖️</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Módulo dedicado para apoio em tempo real nas audiências de qualquer matéria processual (Cível, Família, Partilha de Bens, Consumidor ou Previdenciário), totalmente otimizado para celulares e computadores: extração mágica de autos por PDF, roteiro de perguntas para testemunhas, deliberações em mesa e redação de sentenças via IA. No modo <strong>Mutirão Expresso</strong>, a interface conta com <em>Visualização Forense</em> com recuo de parágrafos judiciais, alternância para edição livre, seleção exclusiva dos prompts cadastrados no sistema pelo seu gabinete e cópia direta para o PROJUDI ou Word sem resíduos de formatação.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    ...(isSuperAdmin ? [
      {
        target: "#btn-header-petition-module",
        content: (
          <div className="text-left font-sans space-y-1.5">
            <h3 className="font-bold text-md text-purple-800 flex items-center gap-1.5 flex-wrap">
              <span>Módulo Petição & Defesa 360° (Exclusivo Super Admin) 🚀</span>
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Ambiente totalmente separado e independente do fluxo judicial de gabinete. Atua tanto na propositura quanto na <strong>defesa contenciosa (Contestação, Réplica, Incidentais e Recursos)</strong>: conta com inserção de número dos autos (CNJ), tempestividade, duplo upload inteligente, preliminares do art. 337 do CPC, a <strong>Matriz de Impugnação Específica (Art. 341 do CPC)</strong> e a <strong>Pesquisa Automática de Jurisprudência pelo Tema da Peça</strong> (via Google Search Grounding em segundo plano), validando precedentes reais com links oficiais e separando sugestões de teses sem qualquer alucinação.
            </p>
          </div>
        ),
        placement: "bottom" as const,
      }
    ] : []),
    {
      target: "#tour-execute-btn",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Passo 6: Executar Minuta em Duas Etapas & Observância da Marcha ⚖️⚡</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Clique em <strong>Gerar Minuta Judicial</strong> para acionar a esteira em duas fases com inteligência de marcha processual caso a caso e o <strong>Protocolo de Fidelidade Factual Estrita (Anti-Inferência na Inicial)</strong>: o sistema extrai com rigor fotográfico os fatos alegados pelo autor na petição inicial, sem inferir, supor ou florear a causa de pedir. Conta com a <strong>Soberania Absoluta do Dispositivo</strong>: qualquer ato que julgue o mérito (procedência, parcial procedência, improcedência) é categoricamente classificado como <strong>SENTENÇA</strong> com sua respectiva TPU CNJ oficial (219, 220, 221), sendo vedado rebaixá-lo a despacho. Na <strong>Etapa 1 (Assessor Fático)</strong>, extrai fidedignamente fatos e provas com tríplice localização (Mov., Arq. e Pág.); na <strong>Etapa 2 (Juiz Revisor)</strong>, aplica o <strong>Caderno de Teses</strong>, <strong>Súmulas</strong> e <strong>Minuta Paradigma</strong>, gerando a minuta magistral final (com os <strong>consectários da Lei 14.905/2024 liquidados no Dispositivo</strong>) e a <strong>Matriz de Auditoria Forense Completa</strong>.
          </p>
        </div>
      ),
      placement: "right",
    }
  ];

  // Result Tour Steps (Minuta Gerada)
  const resultSteps: Step[] = [
    {
      target: "#tour-result-tabs",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Abas de Trabalho, Teses & Pré-Auditoria Automática 📄</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Navegue entre a <strong>Minuta do Ato</strong> (blindada com as <strong>4 travas de profundidade anti-simplificação</strong>: piso de 14 a 20+ parágrafos nos <strong>7 blocos obrigatórios de fundamentação</strong>, transcrições literais obrigatórias de exordial, defesa e parecer do MP, roteiro exaustivo de <strong>Decisão de Saneamento do art. 357 do CPC</strong>, enfrentamento de 100% dos pedidos e preliminares, diretrizes do <strong>Caderno de Teses Vinculantes</strong> e modelo paradigma do juiz), a <strong>Pré-Auditoria dos Autos</strong>, a aba <strong>Texto Projudi & TPU CNJ</strong> (com código TPU numérico oficial, movimentação, prazos e fila de secretaria), o <strong>1º Modelo Original</strong> (intocável), o <strong>Comparador Lado a Lado</strong>, a <strong>Matriz Fato vs Prova</strong> e a <strong>Calculadora de Consectários (Lei 14.905/2024)</strong>.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-meta-parties-box",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Ajuste Direto de Dados do Autor & Partes ✏️</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Precisa ajustar ou corrigir o nome do <strong>Promovente (Autor)</strong>, <strong>Promovido (Réu)</strong> ou o <strong>Número do Processo</strong>? Clique em <em>Ajustar Dados do Autor / Partes</em> para retificar os dados diretamente na minuta, salvando a alteração no histórico de versões e no banco de dados com total integridade.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-result-chat",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Assistente do Gabinete (Chat Interativo) 💬</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Solicite refinos imediatos (ex: <em>"converter para decisão liminar deferindo a tutela de urgência"</em>, <em>"fixe o dano moral em R$ 4.000,00"</em> ou <em>"acrescente tópico sobre preliminar"</em>). A minuta é atualizada com fundamentação exaustiva em tempo real sem sobrescrever o 1º modelo!
          </p>
        </div>
      ),
      placement: "top",
    },
    {
      target: "#tour-result-actions",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Exportação & Cópia PROJUDI 🚀</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Copie com 1 clique o texto formatado para o editor do PROJUDI ou baixe em formato <strong>Word (.docx)</strong> ou <strong>PDF</strong>.
          </p>
        </div>
      ),
      placement: "top",
    },
    {
      target: "#tour-save-tese",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800">Salvar no Caderno de Teses 📚</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Gostou da redação jurídica inédita? Clique aqui para salvar esta fundamentação no <strong>Caderno de Teses do Gabinete</strong> ou como novo <strong>Modelo Paradigma do Juiz</strong> (o botão é ocultado automaticamente se a minuta já usou um paradigma vinculado, prevenindo cadastros duplicados).
          </p>
        </div>
      ),
      placement: "left",
    }
  ];

  // Teses Tour Steps (Caderno do Gabinete)
  const tesesSteps: Step[] = [
    {
      target: "#tour-teses-tabs",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800">Caderno de Teses & Modelos do Gabinete ⚖️</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Central de inteligência jurídica da sua equipe: diretrizes vinculantes, modelos do magistrado e importação em lote de decisões.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-teses-caderno-tab",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800">Teses Normativas (Regras Universais) 🚨</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Regras, limites e diretrizes normativas que são <strong>obrigatoriamente injetadas em todas as etapas</strong> de análise, leitura do PDF e revisão de minutas (Stage 1 e Stage 2). Use para padronização geral, suspeições de foro íntimo, limites indenizatórios e matérias de ordem pública.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-teses-modelos-tab",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800">Modelos Paradigmas & Destino Claro de Injeção 📌</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Biblioteca de decisões autênticas do magistrado com persistência redundante no banco do gabinete. Cada modelo conta com o botão <strong>⚡ Injetar no Prompt</strong> para aplicação imediata como espelho estrutural da minuta, além de opções para <em>Copiar Texto</em>, <em>Injetar no Caderno de Teses</em> ou <em>Limpar Modelos Padrão</em> residuais.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-teses-pdf-tab",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-amber-800">Mapeador & Extrator de PDFs com IA 📑</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Faça upload de PDFs com decisões anteriores. A extração contínua e higienizada preserva negritos e a fluidez do texto. Ao salvar, o sistema extrai automaticamente o nome da ação como título (ex.: <em>AÇÃO DE COBRANÇA...</em>), além de permitir destacar e ajustar qualquer trecho selecionado em tempo real.
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-teses-varredura-tab",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-indigo-800 flex items-center gap-1.5">
            <span>Varredura Automática & Mineração do Gabinete ✨</span>
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Varredura profunda por IA em todas as decisões históricas e modelos deste gabinete/unidade. Extrai automaticamente novas teses no padrão .1 a .4, <strong>bloqueia matérias repetidas contra o Caderno de Teses</strong> e permite a inserção em lote com 1 clique.
          </p>
        </div>
      ),
      placement: "bottom",
    }
  ];

  // History Tour
  const historySteps: Step[] = [
    {
      target: "#tour-history-search",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Busca & Dossiê Unificado por Processo 📂</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Pesquise por número CNJ, partes ou palavras-chave. Todas as minutas (despachos, decisões e sentenças) do mesmo processo são automaticamente agrupadas em um único <strong>Dossiê Processual</strong>. Você também pode consultar qualquer processo arquivado perguntando diretamente ao <strong>Agente Copiloto IA</strong>!
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-history-list",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Linha do Tempo, Memória & Exclusão de Atos ⏱️</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Abra a <strong>Linha do Tempo</strong> do processo para acompanhar todos os atos em ordem cronológica, carregar qualquer minuta no editor ou <strong>excluir atos específicos e toda a evolução cronológica</strong> com sincronização instantânea no Firestore e proteção ativa contra ressurgimento de dados por cache.
          </p>
        </div>
      ),
      placement: "top",
    }
  ];

  // Prompt Tour
  const promptSteps: Step[] = [
    {
      target: "#tour-prompt-create",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Criar Novo Prompt Personalizado ✏️</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Crie novos modelos de análise ou atos judiciais específicos para sua comarca, definindo fase processual, formato e diretrizes. As diretrizes do prompt selecionado são integradas fim a fim em todas as etapas (Etapa 1 - Assessor Fático para extração dos autos e Etapa 2 - Juiz Revisor para redação final).
          </p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "#tour-prompt-list",
      content: (
        <div className="text-left font-sans space-y-1.5">
          <h3 className="font-bold text-md text-emerald-800">Catálogo & Sincronização em Tempo Real 🔄</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            Organize e filtre seus prompts por fase processual. Qualquer alteração ou novo prompt fica sincronizado instantaneamente em tempo real entre seus computadores e dispositivos móveis.
          </p>
        </div>
      ),
      placement: "top",
    }
  ];

  useEffect(() => {
    if (!userProfile) return;
    const completed = userProfile.completedTours || [];

    // Reset run state if context changes and already completed
    setRun(false);

    if (runTesesTour) {
      if (!completed.includes("teses_tour")) {
        setTimeout(() => {
          setSteps(tesesSteps);
          setCurrentTourId("teses_tour");
          setTourKey(Date.now());
          setRun(true);
        }, 800);
      }
    } else if (runHistoryTour) {
      if (!completed.includes("history_tour")) {
        setTimeout(() => {
          setSteps(historySteps);
          setCurrentTourId("history_tour");
          setTourKey(Date.now());
          setRun(true);
        }, 800);
      }
    } else if (runPromptTour) {
      if (!completed.includes("prompt_tour")) {
        setTimeout(() => {
          setSteps(promptSteps);
          setCurrentTourId("prompt_tour");
          setTourKey(Date.now());
          setRun(true);
        }, 800);
      }
    } else if (runResultTour) {
      if (!completed.includes("result_tour")) {
        setTimeout(() => {
          setSteps(resultSteps);
          setCurrentTourId("result_tour");
          setTourKey(Date.now());
          setRun(true);
        }, 800);
      }
    } else if (runAppTour) {
      if (!completed.includes("app_tour")) {
        const filteredAppSteps = appSteps.filter((step) => {
          if (step.target === "#btn-header-extensao" && !isSuperAdmin) return false;
          if (step.target === "#btn-header-superadmin" && !isSuperAdmin) return false;
          if (step.target === "#btn-header-user-manager" && !isAdmin) return false;
          if (step.target === "#btn-header-minute-auditor" && !isSuperAdmin && !isJudge) return false;
          return true;
        });

        setTimeout(() => {
          setSteps(filteredAppSteps);
          setCurrentTourId("app_tour");
          setTourKey(Date.now());
          setRun(true);
        }, 800);
      }
    }
  }, [runAppTour, runResultTour, runHistoryTour, runPromptTour, runTesesTour, userProfile]);

  const handleJoyrideCallback = (data: EventData) => {
    const { status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) || type === EVENTS.TOUR_END) {
      if (currentTourId) {
        completeTour(currentTourId);
      }
      setRun(false);
    }
  };

  return (
    <Joyride key={tourKey}
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      onEvent={handleJoyrideCallback}
      options={{ zIndex: 100000, primaryColor: "#059669", textColor: "#334155", buttons: ['back', 'close', 'primary', 'skip'], showProgress: true }}
      styles={{
        buttonClose: {
          display: 'none',
        },
        buttonSkip: {
          color: '#64748b',
          fontSize: '13px',
          fontWeight: 600
        },
        buttonPrimary: {
          backgroundColor: '#059669',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 'bold',
        },
        buttonBack: {
          marginRight: 10,
          color: '#059669',
          fontSize: '13px',
          fontWeight: 'bold',
        }
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular Tutorial',
      }}
    />
  );
};
