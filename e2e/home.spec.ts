import { expect, test } from '@playwright/test';
import { publishedChapters } from './fixtures';

test('lists every published chapter on the home screen', async ({ page }) => {
  await page.goto('./');

  const chapters = page.getByRole('navigation', { name: 'Capítulos' }).getByRole('link');
  const titles = publishedChapters().map((chapter) => chapter.title);
  await expect(chapters).toHaveCount(titles.length);
  for (const title of titles) await expect(chapters.filter({ hasText: title })).toBeVisible();
});

test('opens the chapter intro from its card', async ({ page }) => {
  await page.goto('./');
  const [first] = publishedChapters();

  await page.getByRole('link', { name: new RegExp(first.title) }).click();

  await expect(page.getByRole('heading', { name: first.title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Começar' })).toBeEnabled();
});

test('asks to rotate the tablet in portrait', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('./');

  await expect(page.getByText('Gire o tablet para jogar!')).toBeVisible();
});
