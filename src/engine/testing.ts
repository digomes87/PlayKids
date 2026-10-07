import type { AudioPlayer, Challenge } from './types';

/** Player falso para testes: o tempo da mídia só anda quando o teste manda. */
export class FakeAudioPlayer implements AudioPlayer {
  time = 0;
  rate = 1;
  playing = false;
  ended = false;
  readonly rateHistory: number[] = [];

  async load(): Promise<void> {}

  async play(): Promise<void> {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  getCurrentTime(): number {
    return this.time;
  }

  setPlaybackRate(rate: number): void {
    this.rate = rate;
    this.rateHistory.push(rate);
  }

  hasEnded(): boolean {
    return this.ended;
  }

  dispose(): void {}
}

/** Desafios de 4 s (prompt em 10·n+10, alvo +2 s, fecha +3 s), resposta sempre 3. */
export function makeChallenges(count: number): Challenge<{ type: string }>[] {
  return Array.from({ length: count }, (_, index) => {
    const showAt = 10 * (index + 1);
    return {
      id: `c${index + 1}`,
      skill: 'counting',
      showAt,
      targetAt: showAt + 2,
      closeAt: showAt + 3,
      prompt: { type: 'test' },
      options: [2, 3, 4],
      answer: 3,
    };
  });
}
