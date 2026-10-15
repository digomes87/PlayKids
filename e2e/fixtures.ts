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

/** Resolve a conta do portão dos pais ("Quanto é 7 × 8?"). */
export async function passParentalGate(page: Page): Promise<void> {
  const label = await page.getByText(/Quanto é \d+ × \d+\?/).textContent();
  const [left, right] = (label ?? '').match(/\d+/g)?.map(Number) ?? [];
  await page.getByLabel(/Quanto é/).fill(String(left * right));
  await page.getByRole('button', { name: 'Entrar' }).click();
}
