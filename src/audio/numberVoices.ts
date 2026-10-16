/** Vozes gravadas por scripts/generate-number-voices.mjs (mantenha as duas listas iguais). */
export const RECORDED_VOICES = ['luciana', 'flo', 'reed'] as const;

/** 'device' usa a síntese de voz do aparelho, como antes das gravações. */
export const NUMBER_VOICES = [...RECORDED_VOICES, 'device'] as const;

export type NumberVoice = (typeof NUMBER_VOICES)[number];

export const DEFAULT_NUMBER_VOICE: NumberVoice = 'luciana';

const LOWEST_RECORDED_NUMBER = 0;
const HIGHEST_RECORDED_NUMBER = 10;

/** Caminho da gravação (relativo a public/content/), ou null quando não há gravação. */
export function recordedNumberPath(voice: NumberVoice, value: number): string | null {
  if (voice === 'device') return null;
  if (value < LOWEST_RECORDED_NUMBER || value > HIGHEST_RECORDED_NUMBER) return null;
  return `voices/${voice}/${value}.m4a`;
}

/** Gravação do próprio capítulo (`prompt.audio`), se houver; senão a da voz escolhida pelos pais. */
export function numberClipPath(prompt: { readonly value: number; readonly audio?: string }, voice: NumberVoice): string | null {
  return prompt.audio ?? recordedNumberPath(voice, prompt.value);
}
