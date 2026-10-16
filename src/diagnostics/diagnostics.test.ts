import { describe, expect, test } from 'vitest';
import { appendEntry, type DiagnosticEntry } from './entries';
import { createStallDetector } from './stallDetector';

const entry = (event: string): DiagnosticEntry => ({ at: '2026-10-16T10:00:00.000Z', event });

describe('registro de diagnóstico', () => {
  test('acrescenta no fim sem alterar a lista original', () => {
    const original = [entry('a')];
    const next = appendEntry(original, entry('b'), 10);
    expect(next.map((item) => item.event)).toEqual(['a', 'b']);
    expect(original).toHaveLength(1);
  });

  test('descarta os mais antigos ao passar do limite', () => {
    const full = ['a', 'b', 'c'].map(entry);
    expect(appendEntry(full, entry('d'), 3).map((item) => item.event)).toEqual(['b', 'c', 'd']);
  });
});

describe('detector de relógio parado', () => {
  test('avisa uma vez quando o tempo da música não anda pelo limite', () => {
    const isStalled = createStallDetector(2000);
    expect(isStalled(5, 0)).toBe(false);
    expect(isStalled(5, 1999)).toBe(false);
    expect(isStalled(5, 2000)).toBe(true);
    expect(isStalled(5, 3000)).toBe(false);
  });

  test('volta a vigiar quando o tempo anda de novo', () => {
    const isStalled = createStallDetector(2000);
    isStalled(5, 0);
    isStalled(5, 2000);
    expect(isStalled(5.1, 2100)).toBe(false);
    expect(isStalled(5.1, 4100)).toBe(true);
  });

  test('não avisa enquanto a música anda normalmente', () => {
    const isStalled = createStallDetector(2000);
    const stalls = Array.from({ length: 100 }, (_, frame) => isStalled(frame * 0.016, frame * 16));
    expect(stalls.some(Boolean)).toBe(false);
  });
});
