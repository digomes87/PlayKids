import { registerSW } from 'virtual:pwa-register';
import { isMidGame } from './updatePolicy';

/** PWA instalado pode ficar dias aberto em segundo plano: confere de tempos em tempos. */
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

let isUpdatePending = false;

/** Rota atual do HashRouter ("#/play/x" -> "/play/x"). */
function currentPath(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

/** Recarrega para usar a versão nova, a menos que a criança esteja jogando. Chamado a cada troca de rota. */
export function applyPendingUpdate(path: string): void {
  if (!isUpdatePending || isMidGame(path)) return;
  window.location.reload();
}

function checkForUpdates(registration: ServiceWorkerRegistration): void {
  registration.update().catch((error: unknown) => console.warn('Falha ao procurar atualização do app.', error));
}

/** Ao voltar para o app (tablet desbloqueado, aba reaberta) e periodicamente. */
function keepCheckingForUpdates(registration: ServiceWorkerRegistration): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdates(registration);
  });
  window.setInterval(() => checkForUpdates(registration), UPDATE_CHECK_INTERVAL_MS);
}

export function startServiceWorker(): void {
  registerSW({
    immediate: true,
    onNeedReload: () => {
      isUpdatePending = true;
      applyPendingUpdate(currentPath());
    },
    onRegisteredSW: (_scriptUrl, registration) => {
      if (registration) keepCheckingForUpdates(registration);
    },
    onRegisterError: (error: unknown) => console.error('Falha ao registrar o service worker.', error),
  });
}
