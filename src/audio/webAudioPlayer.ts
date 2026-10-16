import type { AudioPlayer } from '../engine';

const METADATA_TIMEOUT_MS = 3000;

/** Eventos do elemento de áudio que ajudam a explicar travamentos. */
const OBSERVED_MEDIA_EVENTS = ['play', 'playing', 'pause', 'waiting', 'stalled', 'ended', 'error'] as const;

export interface MediaEventReport {
  readonly type: (typeof OBSERVED_MEDIA_EVENTS)[number];
  readonly currentTime: number;
  /** Pausa que não veio do jogo: voz do aparelho, notificação, Siri, ligação. */
  readonly isExternalPause: boolean;
}

type PitchPreservingAudio = HTMLAudioElement & {
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

function preservePitch(audio: PitchPreservingAudio): void {
  audio.preservesPitch = true;
  audio.mozPreservesPitch = true;
  audio.webkitPreservesPitch = true;
}

/** Implementação web do player do motor, sobre HTMLAudioElement. */
export class WebAudioPlayer implements AudioPlayer {
  private readonly audio: HTMLAudioElement = new Audio();
  private objectUrl: string | null = null;
  private isPausingOnPurpose = false;

  constructor() {
    this.audio.preload = 'auto';
    preservePitch(this.audio);
  }

  /**
   * Baixa o arquivo inteiro antes de resolver. O iOS ignora `preload` até haver
   * um toque; com fetch + blob o áudio já está na memória (e no cache do service
   * worker) quando o botão "Começar" é liberado.
   */
  async load(src: string): Promise<void> {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Não foi possível carregar o áudio (HTTP ${response.status}).`);
    const blob = await response.blob();

    this.releaseObjectUrl();
    this.objectUrl = URL.createObjectURL(blob);
    await this.attach(this.objectUrl);
  }

  private attach(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const { audio } = this;
      const finish = (error?: Error) => {
        window.clearTimeout(timeout);
        audio.removeEventListener('loadedmetadata', onReady);
        audio.removeEventListener('error', onError);
        if (error) reject(error);
        else resolve();
      };
      const onReady = () => finish();
      const onError = () => finish(new Error('O navegador não conseguiu decodificar o áudio.'));
      // Os dados já são locais; se o Safari adiar os metadados até o toque, seguimos em frente.
      const timeout = window.setTimeout(onReady, METADATA_TIMEOUT_MS);

      audio.addEventListener('loadedmetadata', onReady);
      audio.addEventListener('error', onError);
      audio.src = url;
      audio.load();
    });
  }

  play(): Promise<void> {
    return this.audio.play();
  }

  pause(): void {
    this.isPausingOnPurpose = true;
    this.audio.pause();
  }

  isPaused(): boolean {
    return this.audio.paused;
  }

  /** Avisa cada evento do áudio; devolve a função que para de observar. */
  observe(listener: (report: MediaEventReport) => void): () => void {
    const handlers = OBSERVED_MEDIA_EVENTS.map((type) => {
      const handler = () => {
        const isExternalPause = type === 'pause' && !this.isPausingOnPurpose && !this.audio.ended;
        if (type === 'pause') this.isPausingOnPurpose = false;
        listener({ type, currentTime: this.audio.currentTime, isExternalPause });
      };
      this.audio.addEventListener(type, handler);
      return { type, handler };
    });
    return () => handlers.forEach(({ type, handler }) => this.audio.removeEventListener(type, handler));
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  setPlaybackRate(rate: number): void {
    this.audio.playbackRate = rate;
    // Alguns navegadores zeram a flag ao trocar a velocidade.
    preservePitch(this.audio);
  }

  hasEnded(): boolean {
    return this.audio.ended;
  }

  dispose(): void {
    this.isPausingOnPurpose = true;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.releaseObjectUrl();
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
