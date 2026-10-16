/**
 * Vigia o relógio do jogo (tempo da música). Devolve true uma única vez quando o
 * tempo fica parado por `thresholdMs` de relógio de parede; rearma quando volta a andar.
 */
export function createStallDetector(thresholdMs: number): (mediaTime: number, wallMs: number) => boolean {
  let lastMediaTime = Number.NaN;
  let unchangedSince = 0;
  let hasWarned = false;

  return (mediaTime, wallMs) => {
    if (mediaTime !== lastMediaTime) {
      lastMediaTime = mediaTime;
      unchangedSince = wallMs;
      hasWarned = false;
      return false;
    }
    if (hasWarned || wallMs - unchangedSince < thresholdMs) return false;
    hasWarned = true;
    return true;
  };
}
