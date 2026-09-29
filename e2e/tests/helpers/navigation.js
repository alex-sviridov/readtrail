import { expect } from '@playwright/test';

// In-app navigation (like a user clicking around) rather than page.goto: a
// full reload restores the query cache from localStorage, which can predate
// the change the test just made and would render stale books.

export async function gotoLibrary(page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Library' }).click();
  await expect(page).toHaveURL(/\/library/);
}

export async function gotoSettingsData(page) {
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/data/);
}
