import { describe, expect, test } from 'vitest';
import { REQUIRED_TAPS, computeLatencyOffsetMs, tapOffsetMs } from './latency';

const BEAT = 60 / 90;
const tapsWithDelay = (delaySec: number, count = REQUIRED_TAPS) =>
  Array.from({ length: count }, (_, index) => (index + 2) * BEAT + delaySec);

describe('calibração de latência', () => {
  test('mede o desvio até a batida mais próxima, com sinal', () => {
    expect(tapOffsetMs(3 * BEAT + 0.08, BEAT)).toBeCloseTo(80);
    expect(tapOffsetMs(3 * BEAT - 0.05, BEAT)).toBeCloseTo(-50);
  });

  test('exige o número mínimo de toques', () => {
    expect(computeLatencyOffsetMs(tapsWithDelay(0.1, REQUIRED_TAPS - 1), BEAT)).toBeNull();
  });

  test('devolve a latência constante dos toques', () => {
    expect(computeLatencyOffsetMs(tapsWithDelay(0.12), BEAT)).toBe(120);
  });

  test('descarta o aquecimento e resiste a um toque fora do ritmo', () => {
    const taps = tapsWithDelay(0.1);
    const noisy = [taps[0] + 0.3, taps[1] - 0.25, ...taps.slice(2, -1), taps[taps.length - 1] + 0.3];
    expect(computeLatencyOffsetMs(noisy, BEAT)).toBe(100);
  });

  test('limita valores absurdos', () => {
    expect(computeLatencyOffsetMs(tapsWithDelay(-0.3), BEAT)).toBe(-150);
  });
});
