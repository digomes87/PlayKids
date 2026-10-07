import type { EngineSummary } from '../engine';

export interface ShareData {
  readonly title: string;
  readonly text: string;
  readonly url: string;
}

/** O que o aparelho oferece para compartilhar; injetado para poder testar sem navegador. */
export interface ShareEnvironment {
  readonly share?: (data: ShareData) => Promise<void>;
  readonly copy?: (text: string) => Promise<void>;
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unsupported';

const APP_NAME = 'PlayKids';

/** Texto sem nenhum dado da criança: só capítulo, estrelas e placar. */
export function buildShareData(chapterTitle: string, summary: EngineSummary, stars: number, url: string): ShareData {
  return {
    title: `${APP_NAME} — Matemática no Ritmo`,
    text: `${'⭐'.repeat(stars)} ${summary.hits} de ${summary.total} em "${chapterTitle}" no ${APP_NAME}, o jogo de matemática no ritmo da música!`,
    url,
  };
}

/**
 * Usa a folha de compartilhamento nativa (Web Share API), sem SDK de rede social.
 * Onde ela não existe, copia o texto para a área de transferência.
 */
export async function shareResult(data: ShareData, environment: ShareEnvironment): Promise<ShareOutcome> {
  if (environment.share) {
    try {
      await environment.share(data);
      return 'shared';
    } catch (error) {
      // Fechar a folha de compartilhamento não é um erro.
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  if (environment.copy) {
    await environment.copy(`${data.text} ${data.url}`);
    return 'copied';
  }
  return 'unsupported';
}

export function browserShareEnvironment(): ShareEnvironment {
  return {
    share: typeof navigator.share === 'function' ? (data) => navigator.share(data) : undefined,
    copy: navigator.clipboard ? (text) => navigator.clipboard.writeText(text) : undefined,
  };
}

export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}
