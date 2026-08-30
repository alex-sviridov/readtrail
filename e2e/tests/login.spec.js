import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, expectLoggedIn, userMenuButton } from './helpers/testUser.js';

test('can log in with a registered account', async ({ page }) => {
  const user = generateTestUser();

  // Register (which auto-logs-in), then log out so we can exercise login.
  await registerUser(page, user);
  await userMenuButton(page).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/library/);
  await expectLoggedIn(page);
});

test('shows an error for an incorrect password', async ({ page }) => {
  const user = generateTestUser();
  await registerUser(page, user);
  await userMenuButton(page).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // PocketBase returns 400 (not 401) for a failed auth attempt, so the app
  // surfaces its own message rather than the "Invalid email or password"
  // copy meant for a 401. Scope to the banner (a heading) since the same
  // text also appears in a toast.
  await expect(page.getByRole('heading', { name: 'Failed to authenticate.' })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
