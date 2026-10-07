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
    ['asset em URL externa', { prompt: { type: 'image_count', image: 'https://cdn.example/x.svg', count: 3 } }],
  ])('rejeita %s', (_name, patch) => {
    expect(challengeSchema.safeParse({ ...validChallenge, ...patch }).success).toBe(false);
  });

  test('expectedAnswer resolve cada tipo de prompt', () => {
    expect(expectedAnswer({ type: 'equation', left: 2, operator: '+', right: 3 })).toBe(5);
    expect(expectedAnswer({ type: 'equation', left: 5, operator: '-', right: 3 })).toBe(2);
    expect(expectedAnswer({ type: 'number_audio', value: 4 })).toBe(4);
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

  test('recusa timestamps próximos demais ou cedo demais', () => {
    expect(() => generateChallenges([{ time: 5 }, { time: 6 }])).toThrow(/sobrepõem/);
    expect(() => generateChallenges([{ time: 1 }])).toThrow(/cedo demais/);
  });
});
