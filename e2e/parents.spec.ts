import { expect, test } from '@playwright/test';
import { passParentalGate } from './fixtures';

test('keeps children out of the parents area with a multiplication gate', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Área dos pais' }).click();

  await page.getByLabel(/Quanto é/).fill('0');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Resposta errada' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Área dos pais' })).toBeHidden();

  await passParentalGate(page);
  await expect(page.getByRole('heading', { name: 'Área dos pais' })).toBeVisible();
});
