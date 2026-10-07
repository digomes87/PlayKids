/**
 * Contratos do motor. Nada aqui depende de React nem do DOM: o áudio entra por
 * uma interface injetada, o que permite testar com um player falso e reaproveitar
 * o motor em React Native.
 */

/** Player de áudio injetado. Todos os tempos são tempo de MÍDIA, em segundos. */
export interface AudioPlayer {
  load(src: string): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  getCurrentTime(): number;
  setPlaybackRate(rate: number): void;
  hasEnded(): boolean;
  dispose(): void;
}

/**
 * Um desafio agendado. Tempos definidos em 1.0x; como o relógio do jogo é o
 * tempo da mídia, mudar o playbackRate não exige conversão nenhuma.
 */
export interface Challenge<TPrompt = unknown> {
  readonly id: string;
  readonly skill: string;
  /** Quando o prompt aparece. */
  readonly showAt: number;
  /** Batida em que a resposta é esperada. */
  readonly targetAt: number;
  /** Fim da janela de acerto. */
  readonly closeAt: number;
  readonly prompt: TPrompt;
  readonly options: readonly number[];
  readonly answer: number;
}

export type Outcome = 'hit' | 'miss' | 'timeout';

export interface ChallengeResult<TPrompt = unknown> {
  readonly challenge: Challenge<TPrompt>;
  readonly outcome: Outcome;
  readonly selected: number | null;
  /** Resposta relativa a targetAt, em tempo de mídia e já compensada pela latência. */
  readonly timingErrorSec: number | null;
  /** Tempo real (relógio de parede) entre o prompt aparecer e a resposta. */
  readonly reactionSec: number | null;
  /** Velocidade em vigor durante o desafio. */
  readonly playbackRate: number;
}

export interface EngineSummary {
  readonly total: number;
  readonly hits: number;
  readonly misses: number;
  readonly timeouts: number;
  readonly accuracy: number;
}

export type EngineStatus = 'idle' | 'running' | 'paused' | 'finished';

export type EngineEvent<TPrompt = unknown> =
  | { readonly type: 'started' }
  | { readonly type: 'paused' }
  | { readonly type: 'resumed' }
  | { readonly type: 'challenge_opened'; readonly challenge: Challenge<TPrompt> }
  | { readonly type: 'challenge_resolved'; readonly result: ChallengeResult<TPrompt> }
  | { readonly type: 'tempo_changed'; readonly from: number; readonly to: number }
  | { readonly type: 'finished'; readonly summary: EngineSummary };

export type EngineListener<TPrompt = unknown> = (event: EngineEvent<TPrompt>) => void;
