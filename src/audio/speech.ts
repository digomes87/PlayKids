import { describeError, logDiagnostic } from '../diagnostics';
import { playClip } from './clipPlayer';

const SPEECH_LANG = 'pt-BR';
const SPEECH_RATE = 0.9;
const SPEECH_POLL_MS = 100;
/** Um número falado leva ~1 s; depois disso seguimos mesmo que o aparelho não avise o fim. */
const SPEECH_MAX_WAIT_MS = 4000;

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** iOS só libera a síntese de voz depois de um toque: chame isto no botão "Começar". */
export function unlockSpeech(): void {
  if (!canSpeak()) return;
  const silent = new SpeechSynthesisUtterance(' ');
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
}

function synthesize(value: number): () => void {
  if (!canSpeak()) return () => {};
  const utterance = new SpeechSynthesisUtterance(String(value));
  utterance.lang = SPEECH_LANG;
  utterance.rate = SPEECH_RATE;
  utterance.onstart = () => logDiagnostic('speech_start', { value });
  utterance.onend = () => logDiagnostic('speech_end', { value });
  utterance.onerror = (event) => logDiagnostic('speech_error', { value, error: event.error });
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

/**
 * Fala um número: toca a gravação (do capítulo ou da voz escolhida) pelo Web Audio
 * e, se ela não existir ou falhar, usa a voz do aparelho.
 * Devolve uma função que interrompe a fala.
 */
export function speakNumber(value: number, clipUrl: string | null): () => void {
  if (!clipUrl) {
    logDiagnostic('number_spoken', { value, via: 'device_voice' });
    return synthesize(value);
  }

  let stop = () => {};
  let isStopped = false;
  playClip(clipUrl)
    .then((stopClip) => {
      logDiagnostic('number_spoken', { value, via: 'recording', clip: clipUrl });
      stop = stopClip;
      if (isStopped) stopClip();
    })
    .catch((error: unknown) => {
      logDiagnostic('recording_failed', { value, clip: clipUrl, error: describeError(error) });
      if (!isStopped) stop = synthesize(value);
    });
  return () => {
    isStopped = true;
    stop();
  };
}

/** Resolve quando a voz do aparelho termina de falar (ou após um limite de segurança). */
export function waitForSpeechToFinish(): Promise<void> {
  if (!canSpeak()) return Promise.resolve();
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const hasTimedOut = Date.now() - startedAt >= SPEECH_MAX_WAIT_MS;
      if (!window.speechSynthesis.speaking || hasTimedOut) {
        resolve();
        return;
      }
      window.setTimeout(check, SPEECH_POLL_MS);
    };
    check();
  });
}
