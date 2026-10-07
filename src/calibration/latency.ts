/** Trilha de cliques usada na calibração (gerada por scripts/generate-placeholder-audio.mjs). */
export const CALIBRATION_TRACK = { src: 'audio/click-90.wav', bpm: 90 } as const;

export const WARMUP_TAPS = 4;
export const MEASURED_TAPS = 8;
export const REQUIRED_TAPS = WARMUP_TAPS + MEASURED_TAPS;

export const MIN_OFFSET_MS = -150;
export const MAX_OFFSET_MS = 400;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Distância (em ms, com sinal) de cada toque até a batida mais próxima. */
export function tapOffsetMs(tapTimeSec: number, beatSec: number): number {
  const nearestBeat = Math.round(tapTimeSec / beatSec) * beatSec;
  return (tapTimeSec - nearestBeat) * 1000;
}

/**
 * Latência = mediana dos desvios, descartando os primeiros toques (a criança
 * ainda está pegando o ritmo). Devolve null se faltarem toques.
 */
export function computeLatencyOffsetMs(tapTimesSec: readonly number[], beatSec: number): number | null {
  if (tapTimesSec.length < REQUIRED_TAPS) return null;
  const measured = tapTimesSec.slice(WARMUP_TAPS).map((time) => tapOffsetMs(time, beatSec));
  const clamped = Math.min(MAX_OFFSET_MS, Math.max(MIN_OFFSET_MS, median(measured)));
  return Math.round(clamped);
}
