import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, expectLoggedIn, userMenuButton } from './helpers/testUser.js';

test('can register a new account and land in the library, logged in', async ({ page }) => {
  const user = generateTestUser();

  await registerUser(page, user);

  await expectLoggedIn(page);
});

test('cannot submit registration with a weak or mismatched password', async ({ page }) => {
  const user = generateTestUser();

  await page.goto('/register');
  await page.getByLabel('Email address').fill(user.email);

  const submitButton = page.getByRole('button', { name: 'Create Account' });

  // Weak password (no uppercase/number): submit stays disabled.
  await page.getByLabel('Password', { exact: true }).fill('weakpass');
  await page.getByLabel('Confirm password').fill('weakpass');
  await expect(submitButton).toBeDisabled();

  // Strong password but mismatched confirmation: submit stays disabled.
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(`${user.password}x`);
  await expect(page.getByText('Passwords do not match')).toBeVisible();
  await expect(submitButton).toBeDisabled();
});

test('shows an error when registering with an already-used email', async ({ page }) => {
  const user = generateTestUser();
  await registerUser(page, user);

  // Log out, then try registering the same email again.
  await userMenuButton(page).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/register');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.getByRole('button', { name: 'Create Account' }).click();

  // The message is shown both in the inline banner and a toast; scope to
  // the banner (a heading) to avoid a strict-mode ambiguity.
  await expect(page.getByRole('heading', { name: /already registered/i })).toBeVisible();
});
