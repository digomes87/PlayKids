import type { AudioPlayer } from '../engine';

const METADATA_TIMEOUT_MS = 3000;

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
    this.audio.pause();
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
