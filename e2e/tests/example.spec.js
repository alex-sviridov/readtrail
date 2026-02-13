import { test, expect } from '@playwright/test';

test('can open add book modal', async ({ page }) => {
  await page.goto('/');

  // Check title contains "ReadTrail"
  await expect(page).toHaveTitle(/ReadTrail/);

  // Find and click the button
  const addButton = page.getByRole('button', { name: 'Add Your First Book' });
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Check modal appears with correct heading
  const modal = page.locator('div[role="dialog"]'); // or just 'div.modal' depending on your markup
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: 'Add Book' })).toBeVisible();
});