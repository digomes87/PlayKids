import { expect, test } from '@playwright/test';
import { CHAPTER_ID, passParentalGate, useShortChapter } from './fixtures';

test.beforeEach(async ({ page }) => {
  await useShortChapter(page);
  await page.goto(`./#/play/${CHAPTER_ID}`);
  await page.getByRole('button', { name: 'Começar' }).click();
});

test('plays a chapter to the reward screen and records progress', async ({ page }) => {
  const dots = page.locator('.game__dot');

  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(dots.nth(0)).toHaveClass(/game__dot--hit/);

  await page.getByRole('button', { name: '5', exact: true }).click();
  await expect(dots.nth(1)).toHaveClass(/game__dot--miss/);

  await expect(page.getByRole('button', { name: 'Jogar de novo' })).toBeVisible({ timeout: 15_000 });

  await page.goto('./#/parents');
  await passParentalGate(page);
  const report = page.getByRole('region', { name: 'Relatório' });
  await expect(report.getByRole('row', { name: /Contagem/ })).toBeVisible();
  await expect(report.getByRole('row', { name: /Adição/ })).toBeVisible();
});

test('marks a challenge as missed when time runs out', async ({ page }) => {
  await expect(page.locator('.game__dot').nth(0)).toHaveClass(/game__dot--timeout/, { timeout: 10_000 });
});

test('pauses and resumes the music', async ({ page }) => {
  await page.getByRole('button', { name: 'Pausar' }).click();
  const pauseDialog = page.getByRole('dialog', { name: 'Jogo pausado' });
  await expect(pauseDialog).toBeVisible();
  // Mais tempo do que a janela do 1º desafio (fecha em 3 s): se o relógio
  // continuasse andando, ele expiraria durante a pausa.
  await page.waitForTimeout(4_000);

  await pauseDialog.getByRole('button', { name: 'Continuar' }).click();

  await expect(pauseDialog).toBeHidden();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(page.locator('.game__dot').nth(0)).toHaveClass(/game__dot--hit/);
});
