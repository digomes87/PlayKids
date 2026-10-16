import { expect, test, type Page } from '@playwright/test';
import { CHAPTER_ID, passParentalGate, useNumberAudioChapter } from './fixtures';

/** Joga o desafio de ouvir e devolve as gravações de voz que o app baixou. */
async function playNumberAudio(page: Page): Promise<string[]> {
  const voiceRequests: string[] = [];
  page.on('request', (request) => {
    const match = request.url().match(/voices\/.+\.m4a$/);
    if (match) voiceRequests.push(match[0]);
  });
  await page.goto(`./#/play/${CHAPTER_ID}`);
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await expect(page.locator('.game__dot').first()).toHaveClass(/game__dot--hit/);
  return voiceRequests;
}

async function chooseVoice(page: Page, label: string): Promise<void> {
  await page.goto('./#/parents');
  await passParentalGate(page);
  await page.getByRole('radio', { name: new RegExp(label) }).check();
  await expect(page.getByRole('status').filter({ hasText: `Voz salva: ${label}` })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await useNumberAudioChapter(page);
});

test('speaks numbers with the default recorded voice', async ({ page }) => {
  expect(await playNumberAudio(page)).toContain('voices/luciana/5.m4a');
});

test('uses the voice chosen in the parents area and remembers it', async ({ page }) => {
  await chooseVoice(page, 'Reed');
  await page.reload();
  await passParentalGate(page);
  await expect(page.getByRole('radio', { name: /Reed/ })).toBeChecked();

  const requests = await playNumberAudio(page);
  expect(requests).toContain('voices/reed/5.m4a');
  expect(requests.filter((path) => !path.startsWith('voices/reed/'))).toEqual([]);
});

test('downloads no recording when the device voice is chosen', async ({ page }) => {
  await chooseVoice(page, 'Voz do aparelho');
  expect(await playNumberAudio(page)).toEqual([]);
});
