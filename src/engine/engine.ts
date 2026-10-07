import {
  DEFAULT_TEMPO_CONFIG,
  applyOutcome,
  assertValidTempoConfig,
  createTempoState,
  rateOf,
  type TempoConfig,
  type TempoState,
} from './tempo';
import type {
  AudioPlayer,
  Challenge,
  ChallengeResult,
  EngineEvent,
  EngineListener,
  EngineStatus,
  EngineSummary,
  Outcome,
} from './types';

export interface EngineOptions<TPrompt> {
  readonly player: AudioPlayer;
  readonly challenges: readonly Challenge<TPrompt>[];
  readonly tempo?: TempoConfig;
  /** Latência medida na calibração, em segundos de relógio de parede. */
  readonly latencyOffsetSec?: number;
}

export function assertValidSchedule(challenges: readonly Challenge[]): void {
  challenges.forEach((challenge, index) => {
    const { id, showAt, targetAt, closeAt, options, answer } = challenge;
    if (!(showAt >= 0 && showAt < targetAt && targetAt <= closeAt)) {
      throw new Error(`Desafio "${id}": esperado 0 <= showAt < targetAt <= closeAt.`);
    }
    if (!options.includes(answer)) {
      throw new Error(`Desafio "${id}": a resposta não está entre as opções.`);
    }
    const previous = challenges[index - 1];
    if (previous && showAt < previous.closeAt) {
      throw new Error(`Desafio "${id}" começa antes de "${previous.id}" fechar.`);
    }
  });
}

export function summarize(results: readonly ChallengeResult[], total: number): EngineSummary {
  const count = (outcome: Outcome) => results.filter((result) => result.outcome === outcome).length;
  const hits = count('hit');
  return {
    total,
    hits,
    misses: count('miss'),
    timeouts: count('timeout'),
    accuracy: total === 0 ? 0 : hits / total,
  };
}

/**
 * Motor do jogo. O hospedeiro chama `tick()` a cada quadro (rAF na web) e
 * `answer()` quando a criança toca numa opção; o motor lê o tempo da mídia,
 * abre e fecha desafios, ajusta a velocidade e emite eventos.
 */
export class GameEngine<TPrompt = unknown> {
  private readonly player: AudioPlayer;
  private readonly challenges: readonly Challenge<TPrompt>[];
  private readonly tempoConfig: TempoConfig;
  private readonly latencyOffsetSec: number;
  private readonly finishAt: number;
  private readonly listeners = new Set<EngineListener<TPrompt>>();

  private status: EngineStatus = 'idle';
  private tempo: TempoState;
  private nextIndex = 0;
  private active: Challenge<TPrompt> | null = null;
  private results: readonly ChallengeResult<TPrompt>[] = [];

  constructor(options: EngineOptions<TPrompt>) {
    const tempoConfig = options.tempo ?? DEFAULT_TEMPO_CONFIG;
    assertValidTempoConfig(tempoConfig);
    assertValidSchedule(options.challenges);

    this.player = options.player;
    this.challenges = options.challenges;
    this.tempoConfig = tempoConfig;
    this.latencyOffsetSec = options.latencyOffsetSec ?? 0;
    this.tempo = createTempoState(tempoConfig);
    this.finishAt = this.challenges.reduce((latest, challenge) => Math.max(latest, challenge.closeAt), 0);
  }

  subscribe(listener: EngineListener<TPrompt>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  getPlaybackRate(): number {
    return rateOf(this.tempo, this.tempoConfig);
  }

  getActiveChallenge(): Challenge<TPrompt> | null {
    return this.active;
  }

  getResults(): readonly ChallengeResult<TPrompt>[] {
    return this.results;
  }

  /** Fração (0..1) da janela do desafio ativo já percorrida; null sem desafio ativo. */
  getActiveProgress(): number | null {
    if (!this.active) return null;
    const { showAt, closeAt } = this.active;
    const fraction = (this.player.getCurrentTime() - showAt) / (closeAt - showAt);
    return Math.min(1, Math.max(0, fraction));
  }

  /** Deve ser chamado direto de um gesto do usuário: iOS/Safari bloqueia áudio sem interação. */
  async start(): Promise<void> {
    if (this.status !== 'idle') throw new Error(`Motor não pode iniciar no estado "${this.status}".`);
    this.player.setPlaybackRate(this.getPlaybackRate());
    await this.player.play();
    this.status = 'running';
    this.emit({ type: 'started' });
  }

  pause(): void {
    if (this.status !== 'running') return;
    this.player.pause();
    this.status = 'paused';
    this.emit({ type: 'paused' });
  }

  async resume(): Promise<void> {
    if (this.status !== 'paused') return;
    await this.player.play();
    this.status = 'running';
    this.emit({ type: 'resumed' });
  }

  /** Registra a resposta da criança. Devolve false se não havia desafio aberto. */
  answer(value: number): boolean {
    if (this.status !== 'running' || !this.active) return false;
    const outcome: Outcome = value === this.active.answer ? 'hit' : 'miss';
    this.resolve(this.active, outcome, value);
    return true;
  }

  tick(): void {
    if (this.status !== 'running') return;
    const now = this.player.getCurrentTime();
    const ended = this.player.hasEnded();

    for (;;) {
      if (this.active) {
        // A latência também estende o fechamento, senão toques no limite seriam perdidos.
        const closesAt = this.active.closeAt + this.latencyInMediaTime();
        if (now < closesAt && !ended) break;
        this.resolve(this.active, 'timeout', null);
        continue;
      }
      const next = this.challenges[this.nextIndex];
      if (!next || (now < next.showAt && !ended)) break;
      this.nextIndex += 1;
      this.active = next;
      this.emit({ type: 'challenge_opened', challenge: next });
    }

    const allResolved = !this.active && this.nextIndex >= this.challenges.length;
    if (allResolved && (ended || now >= this.finishAt)) this.finish();
  }

  private latencyInMediaTime(): number {
    return this.latencyOffsetSec * this.getPlaybackRate();
  }

  private resolve(challenge: Challenge<TPrompt>, outcome: Outcome, selected: number | null): void {
    const playbackRate = this.getPlaybackRate();
    const answered = selected !== null;
    const responseAt = this.player.getCurrentTime() - this.latencyInMediaTime();

    const result: ChallengeResult<TPrompt> = {
      challenge,
      outcome,
      selected,
      timingErrorSec: answered ? responseAt - challenge.targetAt : null,
      reactionSec: answered ? Math.max(0, responseAt - challenge.showAt) / playbackRate : null,
      playbackRate,
    };

    this.active = null;
    this.results = [...this.results, result];
    this.emit({ type: 'challenge_resolved', result });

    this.tempo = applyOutcome(this.tempo, outcome, this.tempoConfig);
    const nextRate = this.getPlaybackRate();
    if (nextRate !== playbackRate) {
      this.player.setPlaybackRate(nextRate);
      this.emit({ type: 'tempo_changed', from: playbackRate, to: nextRate });
    }
  }

  private finish(): void {
    this.status = 'finished';
    this.player.pause();
    this.emit({ type: 'finished', summary: summarize(this.results, this.challenges.length) });
  }

  private emit(event: EngineEvent<TPrompt>): void {
    [...this.listeners].forEach((listener) => listener(event));
  }
}
