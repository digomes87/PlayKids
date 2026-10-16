import 'fake-indexeddb/auto';
import { describe, expect, test } from 'vitest';
import { createIdbProgressRepository } from './idbRepository';
import { computeSkillMastery, mergeChapterResult, starsFor } from './mastery';
import { DEFAULT_SETTINGS, progressExportSchema, type Attempt } from './types';

let sequence = 0;

function attempt(patch: Partial<Attempt> = {}): Attempt {
  sequence += 1;
  return {
    chapterId: 'chapter-01',
    challengeId: `c${sequence}`,
    skill: 'counting',
    promptType: 'image_count',
    outcome: 'hit',
    selected: 3,
    answer: 3,
    reactionMs: 1200,
    timingErrorMs: -50,
    playbackRate: 0.9,
    at: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)).toISOString(),
    ...patch,
  };
}

const many = (count: number, patch: Partial<Attempt> = {}) => Array.from({ length: count }, () => attempt(patch));

describe('domínio por skill', () => {
  test('poucas tentativas ainda não são avaliadas', () => {
    expect(computeSkillMastery(many(2))[0].level).toBe('new');
  });

  test('acertos consistentes viram domínio', () => {
    const [skill] = computeSkillMastery(many(10));
    expect(skill).toMatchObject({ skill: 'counting', totalAttempts: 10, recentAccuracy: 1, level: 'mastered' });
  });

  test('acurácia baixa fica em prática', () => {
    const [skill] = computeSkillMastery([...many(5), ...many(5, { outcome: 'miss' })]);
    expect(skill.recentAccuracy).toBe(0.5);
    expect(skill.level).toBe('practicing');
  });

  test('só as tentativas recentes contam', () => {
    const [skill] = computeSkillMastery([...many(30, { outcome: 'timeout', reactionMs: null }), ...many(20)]);
    expect(skill.totalAttempts).toBe(50);
    expect(skill.recentAccuracy).toBe(1);
    expect(skill.level).toBe('mastered');
  });

  test('agrupa por skill e ignora timeouts na média de reação', () => {
    const result = computeSkillMastery([
      attempt({ skill: 'addition', reactionMs: 1000 }),
      attempt({ skill: 'addition', reactionMs: 2000 }),
      attempt({ skill: 'addition', outcome: 'timeout', reactionMs: null }),
      attempt(),
    ]);
    expect(result.map((entry) => entry.skill)).toEqual(['addition', 'counting']);
    expect(result[0].averageReactionMs).toBe(1500);
  });

  test('estrelas e melhor resultado do capítulo', () => {
    expect([starsFor(0.95), starsFor(0.7), starsFor(0.2)]).toEqual([3, 2, 1]);
    const first = mergeChapterResult(undefined, { chapterId: 'a', total: 10, hits: 10, completedAt: 'x' });
    const second = mergeChapterResult(first, { chapterId: 'a', total: 10, hits: 3, completedAt: 'y' });
    expect(second).toMatchObject({ stars: 1, bestStars: 3, timesCompleted: 2 });
  });
});

describe('repositório IndexedDB', () => {
  const freshRepository = () => createIdbProgressRepository(`test-${Math.random()}`);

  test('guarda tentativas, resultados e configurações', async () => {
    const repository = freshRepository();
    expect(await repository.getSettings()).toEqual(DEFAULT_SETTINGS);

    const first = attempt();
    await repository.recordAttempt(first);
    await repository.recordAttempt(attempt({ outcome: 'miss' }));
    await repository.saveSettings({ latencyOffsetMs: 80 });
    const result = mergeChapterResult(undefined, { chapterId: 'chapter-01', total: 2, hits: 1, completedAt: 'now' });
    await repository.saveChapterResult(result);

    expect(await repository.listAttempts()).toHaveLength(2);
    expect((await repository.listAttempts())[0]).toEqual(first);
    expect(await repository.listChapterResults()).toEqual([result]);
    expect(await repository.getSettings()).toEqual({ latencyOffsetMs: 80 });
  });

  test('exporta em formato validável e importa substituindo o que havia', async () => {
    const source = freshRepository();
    await source.recordAttempt(attempt());
    await source.saveSettings({ latencyOffsetMs: 120 });
    const exported = progressExportSchema.parse(JSON.parse(JSON.stringify(await source.exportAll())));

    const target = freshRepository();
    await target.recordAttempt(attempt({ skill: 'old' }));
    await target.recordAttempt(attempt({ skill: 'old' }));
    await target.importAll(exported);

    expect(await target.listAttempts()).toEqual(exported.attempts);
    expect(await target.getSettings()).toEqual({ latencyOffsetMs: 120 });
  });

  test('clear apaga tudo', async () => {
    const repository = freshRepository();
    await repository.recordAttempt(attempt());
    await repository.saveSettings({ latencyOffsetMs: 10 });
    await repository.clear();
    expect(await repository.listAttempts()).toEqual([]);
    expect(await repository.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  test('schema de exportação recusa arquivo de outro formato', () => {
    expect(progressExportSchema.safeParse({ format: 'outro', version: 1 }).success).toBe(false);
  });
});
