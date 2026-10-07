import type { Attempt, ChapterResult } from './types';

/** O domínio olha só para as tentativas mais recentes de cada skill. */
export const MASTERY_WINDOW = 20;
export const MIN_ATTEMPTS_TO_ASSESS = 3;
export const MIN_ATTEMPTS_FOR_MASTERY = 8;
export const MASTERY_ACCURACY = 0.8;

export const THREE_STAR_ACCURACY = 0.9;
export const TWO_STAR_ACCURACY = 0.6;

export type MasteryLevel = 'new' | 'practicing' | 'mastered';

export interface SkillMastery {
  readonly skill: string;
  readonly totalAttempts: number;
  /** Fração de acertos nas últimas MASTERY_WINDOW tentativas. */
  readonly recentAccuracy: number;
  readonly averageReactionMs: number | null;
  readonly level: MasteryLevel;
}

function levelFor(recentCount: number, recentAccuracy: number): MasteryLevel {
  if (recentCount < MIN_ATTEMPTS_TO_ASSESS) return 'new';
  if (recentCount >= MIN_ATTEMPTS_FOR_MASTERY && recentAccuracy >= MASTERY_ACCURACY) return 'mastered';
  return 'practicing';
}

function summarizeSkill(skill: string, attempts: readonly Attempt[]): SkillMastery {
  const recent = [...attempts].sort((a, b) => a.at.localeCompare(b.at)).slice(-MASTERY_WINDOW);
  const hits = recent.filter((attempt) => attempt.outcome === 'hit').length;
  const recentAccuracy = recent.length === 0 ? 0 : hits / recent.length;
  const reactions = recent.flatMap((attempt) => (attempt.reactionMs === null ? [] : [attempt.reactionMs]));

  return {
    skill,
    totalAttempts: attempts.length,
    recentAccuracy,
    averageReactionMs:
      reactions.length === 0 ? null : reactions.reduce((sum, value) => sum + value, 0) / reactions.length,
    level: levelFor(recent.length, recentAccuracy),
  };
}

export function computeSkillMastery(attempts: readonly Attempt[]): SkillMastery[] {
  const bySkill = attempts.reduce<Map<string, Attempt[]>>(
    (groups, attempt) => groups.set(attempt.skill, [...(groups.get(attempt.skill) ?? []), attempt]),
    new Map(),
  );
  return [...bySkill.entries()]
    .map(([skill, skillAttempts]) => summarizeSkill(skill, skillAttempts))
    .sort((a, b) => a.skill.localeCompare(b.skill));
}

export function starsFor(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= THREE_STAR_ACCURACY) return 3;
  if (accuracy >= TWO_STAR_ACCURACY) return 2;
  return 1;
}

export function mergeChapterResult(
  previous: ChapterResult | undefined,
  run: { chapterId: string; total: number; hits: number; completedAt: string },
): ChapterResult {
  const stars = starsFor(run.total === 0 ? 0 : run.hits / run.total);
  return {
    ...run,
    stars,
    bestStars: Math.max(stars, previous?.bestStars ?? 0),
    timesCompleted: (previous?.timesCompleted ?? 0) + 1,
  };
}
