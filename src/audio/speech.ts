const SPEECH_LANG = 'pt-BR';
const SPEECH_RATE = 0.9;

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
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

/**
 * Fala um número: usa a gravação do capítulo se houver, senão a voz do aparelho.
 * Devolve uma função que interrompe a fala.
 */
export function speakNumber(value: number, clipUrl?: string): () => void {
  if (!clipUrl) return synthesize(value);

  const clip = new Audio(clipUrl);
  let stopFallback = () => {};
  let stopped = false;
  clip.play().catch(() => {
    if (!stopped) stopFallback = synthesize(value);
  });
  return () => {
    stopped = true;
    clip.pause();
    stopFallback();
  };
}
