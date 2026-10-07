import { create } from 'zustand';
import type { Prompt } from '../content/schema';
import type { Challenge, ChallengeResult, EngineSummary, Outcome } from '../engine';
import { DEFAULT_TEMPO_CONFIG } from '../engine';

export type GamePhase = 'loading' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';

interface GameData {
  readonly phase: GamePhase;
  /** Desafio na tela; continua visível com o feedback até o próximo abrir. */
  readonly shown: Challenge<Prompt> | null;
  readonly result: ChallengeResult<Prompt> | null;
  readonly outcomes: readonly Outcome[];
  readonly rate: number;
  readonly summary: EngineSummary | null;
  readonly error: string | null;
  readonly hasSaveFailed: boolean;
}

interface GameState extends GameData {
  reset(): void;
  patch(patch: Partial<GameData>): void;
  addOutcome(result: ChallengeResult<Prompt>): void;
}

const INITIAL: GameData = {
  phase: 'loading',
  shown: null,
  result: null,
  outcomes: [],
  rate: DEFAULT_TEMPO_CONFIG.levels[DEFAULT_TEMPO_CONFIG.initialIndex],
  summary: null,
  error: null,
  hasSaveFailed: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...INITIAL,
  reset: () => set(INITIAL),
  patch: (patch) => set(patch),
  addOutcome: (result) => set((state) => ({ result, outcomes: [...state.outcomes, result.outcome] })),
}));
