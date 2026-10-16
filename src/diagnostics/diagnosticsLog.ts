import { appendEntry, type DiagnosticDetail, type DiagnosticEntry } from './entries';

const STORAGE_KEY = 'playkids.diagnostics.v1';
/** ~4 partidas inteiras de eventos; o bastante para ver o que veio antes de um travamento. */
const MAX_ENTRIES = 600;

function readStored(): readonly DiagnosticEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let entries = readStored();

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Armazenamento cheio ou bloqueado: o registro continua só na memória.
  }
}

/** Registra um evento só neste aparelho; nada é enviado para fora. */
export function logDiagnostic(event: string, detail?: DiagnosticDetail): void {
  const entry: DiagnosticEntry = detail ? { at: new Date().toISOString(), event, detail } : { at: new Date().toISOString(), event };
  entries = appendEntry(entries, entry, MAX_ENTRIES);
  persist();
}

export function readDiagnostics(): readonly DiagnosticEntry[] {
  return entries;
}

export function clearDiagnostics(): void {
  entries = [];
  persist();
}

const describeError = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/** Erros não tratados, troca de aba/app e a identificação do aparelho e da versão. */
export function installGlobalDiagnostics(): void {
  logDiagnostic('app_started', { build: __BUILD_ID__, userAgent: navigator.userAgent, url: window.location.href });
  window.addEventListener('error', (event) =>
    logDiagnostic('window_error', { message: event.message, source: `${event.filename}:${event.lineno}` }),
  );
  window.addEventListener('unhandledrejection', (event) =>
    logDiagnostic('unhandled_rejection', { reason: describeError(event.reason) }),
  );
  document.addEventListener('visibilitychange', () => logDiagnostic('visibility', { state: document.visibilityState }));
}

export { describeError };
