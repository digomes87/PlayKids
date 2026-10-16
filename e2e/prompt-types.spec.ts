import { expect, test } from '@playwright/test';
import { CHAPTER_ID, PROMPT_TYPE_ANSWERS, useEveryPromptTypeChapter } from './fixtures';

// O travamento do number_audio passou porque a partida de teste só tinha contagem e conta.
test('plays one challenge of every prompt type to the end', async ({ page }) => {
  await useEveryPromptTypeChapter(page);
  await page.goto(`./#/play/${CHAPTER_ID}`);
  await page.getByRole('button', { name: 'Começar' }).click();

  const dots = page.locator('.game__dot');
  for (const [index, answer] of PROMPT_TYPE_ANSWERS.entries()) {
    await page.getByRole('button', { name: String(answer), exact: true }).click();
    await expect(dots.nth(index)).toHaveClass(/game__dot--hit/);
  }
  await expect(page.getByRole('button', { name: 'Jogar de novo' })).toBeVisible({ timeout: 15_000 });
});
