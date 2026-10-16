import { describeError, logDiagnostic } from '../diagnostics';

/**
 * Toca gravações curtas pelo Web Audio. Diferente de um segundo <audio>, ele
 * mistura com a música em vez de disputar o áudio do aparelho (no iPad, a voz
 * sintetizada pausava a música e travava o relógio do jogo).
 */
let context: AudioContext | null = null;
const decoded = new Map<string, Promise<AudioBuffer>>();

function audioContext(): AudioContext {
  context ??= new AudioContext();
  return context;
}

/** Chame no toque do usuário ("Começar", "Ouvir"): o iOS só libera o som depois de um gesto. */
export function unlockClips(): void {
  audioContext()
    .resume()
    .catch((error: unknown) => logDiagnostic('clip_unlock_failed', { error: describeError(error) }));
}

async function decode(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Gravação indisponível (HTTP ${response.status}): ${url}`);
  return audioContext().decodeAudioData(await response.arrayBuffer());
}

/** Baixa e decodifica antes de precisar, para o número soar sem atraso. */
export function preloadClip(url: string): Promise<AudioBuffer> {
  const cached = decoded.get(url);
  if (cached) return cached;
  const pending = decode(url);
  decoded.set(url, pending);
  // Falhou? Esquece, para a próxima tentativa baixar de novo.
  pending.catch(() => decoded.delete(url));
  return pending;
}

/** Toca a gravação; devolve a função que interrompe. Rejeita se não conseguir tocar. */
export async function playClip(url: string): Promise<() => void> {
  const buffer = await preloadClip(url);
  const ctx = audioContext();
  if (ctx.state !== 'running') await ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return () => source.stop();
}
