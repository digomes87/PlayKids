import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

export const CHAPTER_ID = 'chapter-01';

interface IndexEntry {
  readonly id: string;
  readonly title: string;
}

export function publishedChapters(): readonly IndexEntry[] {
  const index = JSON.parse(readFileSync(new URL('../public/content/index.json', import.meta.url), 'utf8'));
  return index.chapters;
}

/**
 * Troca os desafios do capítulo 1 por dois curtos, para a partida terminar em
 * ~7 s em vez de 48 s. O áudio continua o de verdade: o relógio do jogo é ele.
 */
export async function useShortChapter(page: Page): Promise<void> {
  await page.route(`**/chapters/${CHAPTER_ID}.json`, async (route) => {
    const response = await route.fetch();
    const chapter = await response.json();
    const challenges = [
      {
        id: 'e2e-1',
        skill: 'counting',
        showAt: 0.5,
        targetAt: 2,
        closeAt: 3,
        prompt: { type: 'image_count', image: 'images/star.svg', count: 3 },
        options: [2, 3, 4],
        answer: 3,
      },
      {
        id: 'e2e-2',
        skill: 'addition',
        showAt: 3.5,
        targetAt: 5,
        closeAt: 6,
        prompt: { type: 'equation', left: 2, operator: '+', right: 2 },
        options: [3, 4, 5],
        answer: 4,
      },
    ];
    await route.fulfill({ response, json: { ...chapter, challenges } });
  });
}

/** Um desafio de cada prompt.type, em sequência rápida (janelas de ~1 s). */
const EVERY_PROMPT_TYPE = [
  { skill: 'counting', prompt: { type: 'image_count', image: 'images/star.svg', count: 2 }, options: [1, 2, 3], answer: 2 },
  { skill: 'addition', prompt: { type: 'equation', left: 1, operator: '+', right: 3 }, options: [3, 4, 5], answer: 4 },
  { skill: 'number_recognition', prompt: { type: 'number_audio', value: 5 }, options: [4, 5, 6], answer: 5 },
  { skill: 'comparison', prompt: { type: 'compare', left: 2, right: 7 }, options: [2, 7], answer: 7 },
  { skill: 'sequence', prompt: { type: 'sequence', start: 6, step: 1, shown: 3 }, options: [8, 9, 10], answer: 9 },
] as const;

export const PROMPT_TYPE_ANSWERS = EVERY_PROMPT_TYPE.map((challenge) => challenge.answer);

export async function useEveryPromptTypeChapter(page: Page): Promise<void> {
  await page.route(`**/chapters/${CHAPTER_ID}.json`, async (route) => {
    const response = await route.fetch();
    const chapter = await response.json();
    const challenges = EVERY_PROMPT_TYPE.map((challenge, index) => ({
      ...challenge,
      id: `e2e-type-${index + 1}`,
      showAt: 0.3 + index * 1.2,
      targetAt: 0.8 + index * 1.2,
      closeAt: 1.3 + index * 1.2,
    }));
    await route.fulfill({ response, json: { ...chapter, challenges } });
  });
}

/** Capítulo com um único desafio de ouvir o número 5. */
export async function useNumberAudioChapter(page: Page): Promise<void> {
  await page.route(`**/chapters/${CHAPTER_ID}.json`, async (route) => {
    const response = await route.fetch();
    const chapter = await response.json();
    const challenge = {
      id: 'e2e-voice',
      skill: 'number_recognition',
      showAt: 0.5,
      targetAt: 1.5,
      closeAt: 2.5,
      prompt: { type: 'number_audio', value: 5 },
      options: [4, 5, 6],
      answer: 5,
    };
    await route.fulfill({ response, json: { ...chapter, challenges: [challenge] } });
  });
}

/** Resolve a conta do portão dos pais ("Quanto é 7 × 8?"). */
export async function passParentalGate(page: Page): Promise<void> {
  const label = await page.getByText(/Quanto é \d+ × \d+\?/).textContent();
  const [left, right] = (label ?? '').match(/\d+/g)?.map(Number) ?? [];
  await page.getByLabel(/Quanto é/).fill(String(left * right));
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Guarda cada `new Audio()` em window.__audios, para o teste mexer na música como o aparelho faria. */
export async function trackAudioElements(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const tracked: HTMLAudioElement[] = [];
    Object.assign(window, { __audios: tracked });
    window.Audio = new Proxy(NativeAudio, {
      construct(target, args: [string?]) {
        const element = new target(...args);
        tracked.push(element);
        return element;
      },
    });
  });
}

/** Pausa a música sem passar pelo jogo, como faz a voz do aparelho ou uma notificação. */
export async function pauseMusicExternally(page: Page): Promise<number> {
  return page.evaluate(() => {
    const [music] = (window as unknown as { __audios: HTMLAudioElement[] }).__audios;
    music.pause();
    return music.currentTime;
  });
}

export async function musicTime(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __audios: HTMLAudioElement[] }).__audios[0].currentTime);
}
