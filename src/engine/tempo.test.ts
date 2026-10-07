import { describe, expect, test } from 'vitest';
import { DEFAULT_TEMPO_CONFIG, applyOutcome, assertValidTempoConfig, createTempoState, rateOf } from './tempo';
import type { Outcome } from './types';

const run = (outcomes: Outcome[], start = createTempoState()) =>
  outcomes.reduce((state, outcome) => applyOutcome(state, outcome), start);

describe('tempo adaptativo', () => {
  test('começa em 0.9', () => {
    expect(rateOf(createTempoState())).toBe(0.9);
  });

  test('dois erros seguidos reduzem um nível', () => {
    expect(rateOf(run(['miss', 'miss']))).toBe(0.75);
  });

  test('erro seguido de desafio sem resposta também reduz', () => {
    expect(rateOf(run(['miss', 'timeout']))).toBe(0.75);
  });

  test('um acerto no meio zera a sequência de erros', () => {
    expect(rateOf(run(['miss', 'hit', 'miss']))).toBe(0.9);
  });

  test('cinco acertos seguidos sobem um nível', () => {
    expect(rateOf(run(['hit', 'hit', 'hit', 'hit']))).toBe(0.9);
    expect(rateOf(run(['hit', 'hit', 'hit', 'hit', 'hit']))).toBe(1.0);
  });

  test('um erro no meio zera a sequência de acertos', () => {
    expect(rateOf(run(['hit', 'hit', 'hit', 'hit', 'miss', 'hit']))).toBe(0.9);
  });

  test('não passa do nível mais rápido nem do mais lento', () => {
    expect(rateOf(run(Array<Outcome>(15).fill('hit')))).toBe(1.0);
    expect(rateOf(run(Array<Outcome>(10).fill('timeout')))).toBe(0.75);
  });

  test('a sequência recomeça do zero depois de trocar de nível', () => {
    const slowed = run(['miss', 'miss']);
    expect(slowed).toEqual({ levelIndex: 0, hitStreak: 0, missStreak: 0 });
  });

  test('não altera o estado recebido', () => {
    const state = Object.freeze(createTempoState());
    expect(() => applyOutcome(state, 'miss')).not.toThrow();
    expect(state.missStreak).toBe(0);
  });

  test('rejeita configuração inválida', () => {
    expect(() => assertValidTempoConfig({ ...DEFAULT_TEMPO_CONFIG, levels: [] })).toThrow();
    expect(() => assertValidTempoConfig({ ...DEFAULT_TEMPO_CONFIG, levels: [1, 0.9] })).toThrow();
    expect(() => assertValidTempoConfig({ ...DEFAULT_TEMPO_CONFIG, initialIndex: 3 })).toThrow();
  });
});
