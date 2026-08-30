import { expect } from '@playwright/test';

/**
 * Generates a unique email/password pair for a test run, so repeated
 * runs (and parallel tests) never collide on an already-registered email.
 */
export function generateTestUser() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return {
    email: `e2e-${unique}@example.com`,
    password: 'Passw0rd!123',
  };
}

/**
 * Fills and submits the registration form, and waits for the redirect
 * to the library that follows a successful registration.
 */
export async function registerUser(page, { email, password }) {
  await page.goto('/register');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/library/);
}

/**
 * Locates the user menu trigger in the app header (its accessible name is
 * the user's initials + display name, e.g. "E2 e2e-171...").
 */
export function userMenuButton(page) {
  return page.locator('header').locator('button[aria-haspopup="true"]');
}

/**
 * Asserts the header shows the authenticated user menu rather than the
 * "Login" link.
 */
export async function expectLoggedIn(page) {
  await expect(userMenuButton(page)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login' })).toHaveCount(0);
}
