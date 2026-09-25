/**
 * Utilitários para Normalização e Manipulação de Agendas do Google Calendar (Gmail)
 * Suporta: IDs de agenda (e-mails ou hashes @group.calendar.google.com),
 * Links públicos de incorporação (embed URLs), links normais do Calendar e tags <iframe> completas.
 */

export interface GoogleCalendarEmbedOptions {
  mode?: 'MONTH' | 'AGENDA' | 'WEEK';
  timezone?: string;
  showTitle?: boolean;
  showNav?: boolean;
  showDate?: boolean;
  showPrint?: boolean;
  showTabs?: boolean;
  showCalendars?: boolean;
  showTz?: boolean;
  bgColor?: string; // Hex sem #
}

/**
 * Extrai o ID ou link base limpo a partir de qualquer formato inserido pelo usuário
 */
export function extractGoogleCalendarSource(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';
  const trimmed = rawInput.trim();

  // 1. Se for uma tag <iframe>, extrai o atributo src
  const iframeMatch = trimmed.match(/<iframe.*?src=["'](.*?)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    return iframeMatch[1];
  }

  return trimmed;
}

/**
 * Converte qualquer ID de agenda ou link do Google Calendar em uma URL segura de incorporação (embed)
 */
export function normalizeGoogleCalendarEmbedUrl(
  rawInput: string,
  options: GoogleCalendarEmbedOptions = {}
): string {
  const source = extractGoogleCalendarSource(rawInput);
  if (!source) return '';

  const tz = options.timezone || 'America/Sao_Paulo';
  const mode = options.mode || 'MONTH'; // 'MONTH' | 'AGENDA' | 'WEEK'
  const showTitle = options.showTitle !== undefined ? (options.showTitle ? '1' : '0') : '0';
  const showNav = options.showNav !== undefined ? (options.showNav ? '1' : '0') : '1';
  const showDate = options.showDate !== undefined ? (options.showDate ? '1' : '0') : '1';
  const showPrint = options.showPrint !== undefined ? (options.showPrint ? '1' : '0') : '0';
  const showTabs = options.showTabs !== undefined ? (options.showTabs ? '1' : '0') : '1';
  const showCalendars = options.showCalendars !== undefined ? (options.showCalendars ? '1' : '0') : '0';
  const showTz = options.showTz !== undefined ? (options.showTz ? '1' : '0') : '0';

  // Caso 1: Já é uma URL completa de embed do Google Calendar
  if (source.includes('calendar.google.com/calendar/embed')) {
    try {
      const url = new URL(source);
      // Garante ou atualiza parâmetros de visualização
      url.searchParams.set('ctz', tz);
      url.searchParams.set('mode', mode);
      url.searchParams.set('showTitle', showTitle);
      url.searchParams.set('showNav', showNav);
      url.searchParams.set('showDate', showDate);
      url.searchParams.set('showPrint', showPrint);
      url.searchParams.set('showTabs', showTabs);
      url.searchParams.set('showCalendars', showCalendars);
      url.searchParams.set('showTz', showTz);
      return url.toString();
    } catch {
      // Se falhar URL parsing, ajusta via concatenação
      return source;
    }
  }

  // Caso 2: É um link de compartilhamento normal (ex: calendar.google.com/calendar/u/0?cid=...)
  if (source.includes('calendar.google.com/calendar')) {
    try {
      const url = new URL(source);
      const cid = url.searchParams.get('cid') || url.searchParams.get('src');
      if (cid) {
        return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(cid)}&ctz=${encodeURIComponent(tz)}&mode=${mode}&showTitle=${showTitle}&showNav=${showNav}&showDate=${showDate}&showPrint=${showPrint}&showTabs=${showTabs}&showCalendars=${showCalendars}&showTz=${showTz}`;
      }
    } catch {
      // continua para fallback
    }
  }

  // Caso 3: É um ID de agenda direto (e-mail, ex: juiz@gmail.com, ou hash@group.calendar.google.com)
  const cleanId = source.replace(/^src=/, '').replace(/^cid=/, '').trim();
  const encodedId = encodeURIComponent(cleanId);

  return `https://calendar.google.com/calendar/embed?src=${encodedId}&ctz=${encodeURIComponent(tz)}&mode=${mode}&showTitle=${showTitle}&showNav=${showNav}&showDate=${showDate}&showPrint=${showPrint}&showTabs=${showTabs}&showCalendars=${showCalendars}&showTz=${showTz}`;
}

/**
 * Gera um link direto para abrir a agenda no Google Calendar em uma nova aba
 */
export function getCalendarDirectLink(rawInput: string): string {
  const source = extractGoogleCalendarSource(rawInput);
  if (!source) return 'https://calendar.google.com';

  if (source.includes('calendar.google.com')) {
    return source;
  }

  const cleanId = source.replace(/^src=/, '').replace(/^cid=/, '').trim();
  return `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(cleanId)}`;
}
