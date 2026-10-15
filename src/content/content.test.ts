import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { assertValidSchedule } from '../engine';
import { generateChallenges, parseTimestamps } from './generateChallenges';
import { challengeSchema, chapterSchema, contentIndexSchema, expectedAnswer } from './schema';

const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const validChallenge = {
  id: 'c01',
  skill: 'counting',
  showAt: 4,
  targetAt: 6,
  closeAt: 7,
  prompt: { type: 'image_count', image: 'images/star.svg', count: 3 },
  options: [2, 3, 4],
  answer: 3,
};

describe('schema do capítulo', () => {
  test('aceita um desafio válido', () => {
    expect(challengeSchema.safeParse(validChallenge).success).toBe(true);
  });

  test.each([
    ['resposta fora das opções', { options: [1, 2, 4] }],
    ['resposta que não bate com o prompt', { answer: 4 }],
    ['janela fora de ordem', { targetAt: 3 }],
    ['opções repetidas', { options: [3, 3, 4] }],
    ['prompt.type desconhecido', { prompt: { type: 'hologram' } }],
    ['comparação entre números iguais', { prompt: { type: 'compare', left: 3, right: 3 }, options: [3, 2] }],
    ['sequência com passo zero', { prompt: { type: 'sequence', start: 3, step: 0, shown: 3 } }],
    ['sequência que desce abaixo de zero', { prompt: { type: 'sequence', start: 1, step: -1, shown: 3 } }],
    ['asset em URL externa', { prompt: { type: 'image_count', image: 'https://cdn.example/x.svg', count: 3 } }],
  ])('rejeita %s', (_name, patch) => {
    expect(challengeSchema.safeParse({ ...validChallenge, ...patch }).success).toBe(false);
  });

  test('expectedAnswer resolve cada tipo de prompt', () => {
    expect(expectedAnswer({ type: 'equation', left: 2, operator: '+', right: 3 })).toBe(5);
    expect(expectedAnswer({ type: 'equation', left: 5, operator: '-', right: 3 })).toBe(2);
    expect(expectedAnswer({ type: 'number_audio', value: 4 })).toBe(4);
    expect(expectedAnswer({ type: 'compare', left: 2, right: 5 })).toBe(5);
    expect(expectedAnswer({ type: 'compare', left: 6, right: 1 })).toBe(6);
    expect(expectedAnswer({ type: 'sequence', start: 2, step: 1, shown: 3 })).toBe(5);
    expect(expectedAnswer({ type: 'sequence', start: 2, step: 2, shown: 3 })).toBe(8);
    expect(expectedAnswer({ type: 'sequence', start: 9, step: -1, shown: 3 })).toBe(6);
  });

  test('aceita comparação só com os dois números como opções', () => {
    const compare = { ...validChallenge, skill: 'comparison', prompt: { type: 'compare', left: 2, right: 5 }, answer: 5 };
    expect(challengeSchema.safeParse({ ...compare, options: [2, 5] }).success).toBe(true);
    expect(challengeSchema.safeParse({ ...compare, options: [2, 5, 6] }).success).toBe(false);
    expect(challengeSchema.safeParse({ ...compare, options: [4, 5] }).success).toBe(false);
  });

  test('o conteúdo publicado é válido e agendável pelo motor', () => {
    const index = contentIndexSchema.parse(readJson('../../public/content/index.json'));
    index.chapters.forEach((entry) => {
      const chapter = chapterSchema.parse(readJson(`../../public/content/${entry.file}`));
      expect(chapter.id).toBe(entry.id);
      expect(() => assertValidSchedule(chapter.challenges)).not.toThrow();
    });
  });
});

describe('gerador de desafios', () => {
  const entries = parseTimestamps('7.333\n11.333 equation\n15.333 number_audio\n19.333 equation subtraction\n');

  test('lê timestamps com tipo e skill opcionais, ignorando comentários', () => {
    expect(parseTimestamps('# intro\n\n4.5 equation addition # refrão\n8')).toEqual([
      { time: 4.5, type: 'equation', skill: 'addition' },
      { time: 8, type: undefined, skill: undefined },
    ]);
    expect(parseTimestamps('9 sequence')).toEqual([{ time: 9, type: 'sequence', skill: undefined }]);
    expect(parseTimestamps('9 compare')).toEqual([{ time: 9, type: 'compare', skill: undefined }]);
    expect(() => parseTimestamps('abc')).toThrow();
    expect(() => parseTimestamps('3 hologram')).toThrow();
  });

  test('gera desafios válidos pelo schema, com janelas em torno do timestamp', () => {
    const challenges = generateChallenges(entries);
    expect(challenges).toHaveLength(4);
    challenges.forEach((challenge) => expect(challengeSchema.safeParse(challenge).success).toBe(true));
    expect(challenges[0]).toMatchObject({ id: 'c01', showAt: 5.333, targetAt: 7.333, closeAt: 8.666 });
    expect(challenges.map((challenge) => challenge.skill)).toEqual([
      'counting',
      'addition',
      'number_recognition',
      'subtraction',
    ]);
  });

  test('é determinístico para o mesmo seed', () => {
    expect(generateChallenges(entries, { seed: 7 })).toEqual(generateChallenges(entries, { seed: 7 }));
  });

  test('respeita maxValue e nunca gera subtração negativa', () => {
    const many = Array.from({ length: 60 }, (_, index) => ({
      time: 4 + index * 4,
      type: 'equation' as const,
      skill: index % 2 === 0 ? 'addition' : 'subtraction',
    }));
    generateChallenges(many, { maxValue: 6, seed: 3 }).forEach((challenge) => {
      expect(challenge.answer).toBeGreaterThanOrEqual(0);
      expect(challenge.answer).toBeLessThanOrEqual(6);
      expect(new Set(challenge.options).size).toBe(3);
    });
  });

  test('gera comparações com números distintos, na ordem em que aparecem', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({ time: 4 + index * 4, type: 'compare' as const }));
    generateChallenges(many, { maxValue: 6, seed: 5 }).forEach((challenge) => {
      expect(challenge.skill).toBe('comparison');
      if (challenge.prompt.type !== 'compare') throw new Error('esperado compare');
      const { left, right } = challenge.prompt;
      expect(left).not.toBe(right);
      expect(Math.max(left, right)).toBeLessThanOrEqual(6);
      expect(challenge.options).toEqual([left, right]);
      expect(challengeSchema.safeParse(challenge).success).toBe(true);
    });
  });

  test('gera sequências que cabem em maxValue, sem números negativos', () => {
    const many = Array.from({ length: 60 }, (_, index) => ({ time: 4 + index * 4, type: 'sequence' as const }));
    const challenges = generateChallenges(many, { maxValue: 10, seed: 9 });
    challenges.forEach((challenge) => {
      expect(challenge.skill).toBe('sequence');
      if (challenge.prompt.type !== 'sequence') throw new Error('esperado sequence');
      const { start, step, shown } = challenge.prompt;
      const values = Array.from({ length: shown + 1 }, (_, index) => start + step * index);
      values.forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
      expect(challenge.answer).toBeLessThanOrEqual(10);
      expect(challengeSchema.safeParse(challenge).success).toBe(true);
    });
    const steps = new Set(challenges.map((challenge) => (challenge.prompt.type === 'sequence' ? challenge.prompt.step : 0)));
    expect([...steps].sort()).toEqual([-1, 1, 2]);
  });

  test('recusa timestamps próximos demais ou cedo demais', () => {
    expect(() => generateChallenges([{ time: 5 }, { time: 6 }])).toThrow(/sobrepõem/);
    expect(() => generateChallenges([{ time: 1 }])).toThrow(/cedo demais/);
  });
});
