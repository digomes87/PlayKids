import type { Outcome } from './types';

export interface TempoConfig {
  /** Velocidades em ordem crescente. */
  readonly levels: readonly number[];
  readonly initialIndex: number;
  /** Erros ou desafios sem resposta seguidos que reduzem um nível. */
  readonly missesToSlowDown: number;
  /** Acertos seguidos que sobem um nível. */
  readonly hitsToSpeedUp: number;
}

export const DEFAULT_TEMPO_CONFIG: TempoConfig = {
  levels: [0.75, 0.9, 1.0],
  initialIndex: 1,
  missesToSlowDown: 2,
  hitsToSpeedUp: 5,
};

export interface TempoState {
  readonly levelIndex: number;
  readonly hitStreak: number;
  readonly missStreak: number;
}

export function assertValidTempoConfig(config: TempoConfig): void {
  const { levels, initialIndex, missesToSlowDown, hitsToSpeedUp } = config;
  if (levels.length === 0) throw new Error('TempoConfig: levels não pode ser vazio.');
  if (levels.some((level) => !(level > 0))) throw new Error('TempoConfig: velocidades devem ser > 0.');
  if (levels.some((level, i) => i > 0 && level <= levels[i - 1])) {
    throw new Error('TempoConfig: levels deve estar em ordem crescente.');
  }
  if (!Number.isInteger(initialIndex) || initialIndex < 0 || initialIndex >= levels.length) {
    throw new Error('TempoConfig: initialIndex fora do intervalo.');
  }
  if (missesToSlowDown < 1 || hitsToSpeedUp < 1) {
    throw new Error('TempoConfig: limiares de sequência devem ser >= 1.');
  }
}

export function createTempoState(config: TempoConfig = DEFAULT_TEMPO_CONFIG): TempoState {
  return { levelIndex: config.initialIndex, hitStreak: 0, missStreak: 0 };
}

export function rateOf(state: TempoState, config: TempoConfig = DEFAULT_TEMPO_CONFIG): number {
  return config.levels[state.levelIndex];
}

/** Devolve o próximo estado; nunca altera o estado recebido. */
export function applyOutcome(
  state: TempoState,
  outcome: Outcome,
  config: TempoConfig = DEFAULT_TEMPO_CONFIG,
): TempoState {
  if (outcome === 'hit') {
    const hitStreak = state.hitStreak + 1;
    if (hitStreak < config.hitsToSpeedUp) return { ...state, hitStreak, missStreak: 0 };
    const levelIndex = Math.min(state.levelIndex + 1, config.levels.length - 1);
    return { levelIndex, hitStreak: 0, missStreak: 0 };
  }

  const missStreak = state.missStreak + 1;
  if (missStreak < config.missesToSlowDown) return { ...state, hitStreak: 0, missStreak };
  const levelIndex = Math.max(state.levelIndex - 1, 0);
  return { levelIndex, hitStreak: 0, missStreak: 0 };
}
