import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  ExternalLink,
  Settings,
  RefreshCw,
  Copy,
  Check,
  Crown,
  Scale,
  ShieldCheck,
  HelpCircle,
  Clock,
  CalendarDays,
  ListFilter,
  Info,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { CabinetCalendarSettings } from '../types';
import {
  normalizeGoogleCalendarEmbedUrl,
  getCalendarDirectLink,
  extractGoogleCalendarSource,
} from '../utils/calendarUtils';
import {
  saveCabinetCalendarSettings,
  subscribeToCabinetCalendarSettings,
} from '../lib/firestoreUtils';

interface CabinetCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CabinetCalendarModal: React.FC<CabinetCalendarModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, userProfile, isAdmin, isJudge } = useAuth();

  // Settings da agenda única do magistrado em tempo real
  const [calendarSettings, setCalendarSettings] = useState<CabinetCalendarSettings | null>(null);
  
  // Modos de visualização
  const [viewMode, setViewMode] = useState<'MONTH' | 'AGENDA' | 'WEEK'>('MONTH');
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const [isLoadingIframe, setIsLoadingIframe] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Aba de configuração (Configurações da Agenda)
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [inputCalendarSource, setInputCalendarSource] = useState<string>('');
  const [inputCalendarTitle, setInputCalendarTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Listener em tempo real da agenda única do Firestore
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToCabinetCalendarSettings((settings) => {
      setCalendarSettings(settings);
    });
    return () => unsub();
  }, [isOpen]);

  // Determina o link/ID ativo da agenda única do magistrado
  const effectiveCalendarSource = useMemo(() => {
    return calendarSettings?.globalCalendarIdOrUrl?.trim() || '';
  }, [calendarSettings]);

  const effectiveCalendarTitle = useMemo(() => {
    return calendarSettings?.globalCalendarTitle?.trim() || 'Agenda Oficial do Magistrado & Pautas';
  }, [calendarSettings]);

  // URL final de embed normalizada
  const embedUrl = useMemo(() => {
    if (!effectiveCalendarSource) return '';
    return normalizeGoogleCalendarEmbedUrl(effectiveCalendarSource, {
      mode: viewMode,
      timezone: 'America/Sao_Paulo',
      showTitle: false,
      showNav: true,
      showDate: true,
      showPrint: false,
      showTabs: true,
      showCalendars: false,
      showTz: false,
    });
  }, [effectiveCalendarSource, viewMode]);

  // Link direto para abrir no Google Calendar em nova aba
  const directLink = useMemo(() => {
    return getCalendarDirectLink(effectiveCalendarSource);
  }, [effectiveCalendarSource]);

  // Preenche formulário de config ao abrir painel
  useEffect(() => {
    if (isConfigOpen) {
      setInputCalendarSource(calendarSettings?.globalCalendarIdOrUrl || '');
      setInputCalendarTitle(calendarSettings?.globalCalendarTitle || '');
      setSaveError(null);
      setSaveSuccess(false);
    }
  }, [isConfigOpen, calendarSettings]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsLoadingIframe(true);
    setIframeKey(Date.now());
  };

  const handleCopyLink = () => {
    if (!effectiveCalendarSource) return;
    navigator.clipboard.writeText(embedUrl || effectiveCalendarSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !isJudge) {
      setSaveError('Apenas o Administrador ou o Magistrado Titular podem alterar a agenda.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const cleanSource = extractGoogleCalendarSource(inputCalendarSource);
      const cleanTitle = inputCalendarTitle.trim();

      // Salva nas configurações globais da agenda única do magistrado
      await saveCabinetCalendarSettings({
        globalCalendarIdOrUrl: cleanSource,
        globalCalendarTitle: cleanTitle || 'Agenda Oficial do Magistrado & Pautas',
        notes: `Atualizado por ${userProfile?.name || user?.email || 'Magistrado'}`,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsConfigOpen(false);
        handleRefresh();
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar configurações da agenda.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col h-[92vh] overflow-hidden text-slate-100 font-sans">
        
        {/* BARRA SUPERIOR DE DESTAQUE */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400" />

        {/* CABEÇALHO DO MODAL */}
        <div className="p-3.5 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-emerald-950/50 to-teal-900/40 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-md shrink-0">
              <CalendarIcon className="w-5 h-5 text-amber-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-400/40 text-amber-300 font-sans text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Agenda Única do Magistrado
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Scale className="w-3 h-3 text-emerald-400" />
                  Pautas de Audiências & Compromissos
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
                <span>{effectiveCalendarTitle}</span>
              </h2>
            </div>
          </div>

          {/* CONTROLES DO CABEÇALHO */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Alternador de Modo de Visualização */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('MONTH')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'MONTH'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visão Mensal"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mês</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('AGENDA')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'AGENDA'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visão de Pauta / Lista de Audiências"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pauta</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('WEEK')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'WEEK'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visão Semanal"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Semana</span>
              </button>
            </div>

            {/* Botão Recarregar */}
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700 shadow-xs"
              title="Recarregar Agenda"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingIframe ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Abrir no Google Calendar Externo */}
            {effectiveCalendarSource && (
              <a
                href={directLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition border border-emerald-500/40 shadow-xs"
                title="Abrir no Google Calendar oficial em nova aba"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Google Agenda</span>
              </a>
            )}

            {/* Copiar Link */}
            {effectiveCalendarSource && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700 shadow-xs cursor-pointer"
                title="Copiar Link da Agenda"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            )}

            {/* Botão Configurar (Juiz / Admin ou se não tiver configurada) */}
            {(isAdmin || isJudge || !effectiveCalendarSource) && (
              <button
                type="button"
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-md border ${
                  isConfigOpen
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border-yellow-300'
                }`}
                title="Configurar ID ou Link da Agenda do Google"
              >
                <Settings className="w-3.5 h-3.5 text-slate-950" />
                <span>{isConfigOpen ? 'Fechar Config.' : 'Configurar Agenda'}</span>
              </button>
            )}

            {/* Fechar Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO PRINCIPAL */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-slate-950">
          
          {/* SEÇÃO PRINCIPAL: IFRAME OU EMPTY STATE */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/50 relative">
            {effectiveCalendarSource ? (
              <div className="w-full h-full relative flex flex-col bg-white">
                {isLoadingIframe && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10 text-center p-4">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                    <p className="text-sm font-bold text-slate-200">Carregando agenda oficial do magistrado...</p>
                    <p className="text-xs text-slate-400">Sincronizando pautas de audiências e compromissos</p>
                  </div>
                )}
                
                <iframe
                  key={iframeKey}
                  src={embedUrl}
                  style={{ border: 0, width: '100%', height: '100%' }}
                  frameBorder="0"
                  scrolling="yes"
                  title="Google Calendar Gabinete Judicial"
                  onLoad={() => setIsLoadingIframe(false)}
                  className="w-full h-full min-h-[400px] flex-1 bg-white select-text"
                />
              </div>
            ) : (
              /* EMPTY STATE: Guia de Boas-Vindas para Configuração */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-6 animate-in fade-in">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-800 to-emerald-950/40 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-xl">
                  <CalendarIcon className="w-10 h-10 text-amber-400" />
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-wider">
                    Integração Google Calendar & Gabinete
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Nenhuma Agenda Vinculada ao Gabinete
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
                    O Magistrado(a) ou o Administrador pode vincular a agenda do Google (Gmail do juiz ou da vara) inserindo o <strong>ID da agenda</strong> ou o <strong>link de incorporação</strong>. Toda a equipe terá acesso imediato à mesma pauta de audiências.
                  </p>
                </div>

                {/* Passo a Passo Ilustrado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center justify-center text-xs font-black">
                      1
                    </div>
                    <h4 className="text-xs font-bold text-slate-200">No Google Agenda</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Abra o Google Agenda no computador, clique nos 3 pontinhos da agenda do magistrado e vá em <em>"Configurações e compartilhamento"</em>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center justify-center text-xs font-black">
                      2
                    </div>
                    <h4 className="text-xs font-bold text-slate-200">Copie o ID ou Link</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Na seção <em>"Integrar agenda"</em>, copie o <strong>ID da agenda</strong> (ex: juiz@gmail.com) ou o <strong>Código de incorporação</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-400/50 text-teal-300 flex items-center justify-center text-xs font-black">
                      3
                    </div>
                    <h4 className="text-xs font-bold text-slate-200">Cole no Assessor</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Cole aqui no botão de configuração. Toda a equipe do gabinete visualizará a mesma pauta oficial em tempo real.
                    </p>
                  </div>
                </div>

                {(isAdmin || isJudge) && (
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(true)}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm transition cursor-pointer shadow-lg border border-yellow-200 flex items-center gap-2 active:scale-95"
                  >
                    <Settings className="w-4 h-4 text-slate-950" />
                    <span>Configurar Agenda do Magistrado Agora</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PAINEL LATERAL DE CONFIGURAÇÃO (QUANDO ABERTO) */}
          {isConfigOpen && (
            <div className="w-full md:w-[420px] bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col p-5 overflow-y-auto shrink-0 z-20 space-y-5 animate-in slide-in-from-right-10 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-extrabold text-white">Vincular Agenda do Magistrado</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-1.5 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Agenda Central do Magistrado</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Esta agenda é compartilhada com toda a equipe do gabinete e reflete todas as audiências e compromissos do juiz.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    ID da Agenda ou Link do Google Calendar:
                  </label>
                  <textarea
                    rows={3}
                    value={inputCalendarSource}
                    onChange={(e) => setInputCalendarSource(e.target.value)}
                    placeholder="Ex: juiz.pauta@gmail.com ou código https://calendar.google.com/calendar/embed?src=... ou tag <iframe>"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono transition"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    Aceita: E-mail do Gmail, ID da agenda (@group.calendar.google.com), Link de incorporação público ou Tag iframe completa.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Título da Agenda (Opcional):
                  </label>
                  <input
                    type="text"
                    value={inputCalendarTitle}
                    onChange={(e) => setInputCalendarTitle(e.target.value)}
                    placeholder="Ex: Agenda Oficial do Magistrado • Pautas & Julgamentos"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400 transition"
                  />
                </div>

                {saveError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{saveError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-bold animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Agenda vinculada e sincronizada com sucesso!</span>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 border border-yellow-200"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Check className="w-4 h-4 text-slate-950" />
                    )}
                    <span>{isSaving ? 'Salvando...' : 'Salvar e Vincular Agenda'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer border border-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>

              {/* Dica de Ajuda */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Dica de Compartilhamento no Google:</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Para que os assessores vejam os compromissos sem precisar fazer login com o e-mail do juiz, marque a opção <strong>"Disponibilizar para o público"</strong> (ou apenas <em>"Ver detalhes de todos os eventos"</em>) nas configurações de compartilhamento da agenda no Google.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Agenda Unificada • Visualização sincronizada para toda a equipe do Gabinete Judicial
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
