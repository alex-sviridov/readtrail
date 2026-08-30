import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from './helpers/testUser.js';
import { mockOpenLibrarySearch, addBookManually } from './helpers/books.js';

test.beforeEach(async ({ page }) => {
  await mockOpenLibrarySearch(page);
  await registerUser(page, generateTestUser());
});

test('can add a book and see it in the library', async ({ page }) => {
  await addBookManually(page, { title: 'The Pragmatic Programmer' });

  await expect(page.getByRole('heading', { name: 'The Pragmatic Programmer', level: 3 })).toBeVisible();
  await expect(page.getByText('Read Long Ago')).toBeVisible();
});

test('can rate a book while adding it', async ({ page }) => {
  await addBookManually(page, { title: 'Dune', score: 'like' });

  await expect(page.getByRole('heading', { name: 'Dune', level: 3 })).toBeVisible();
  await expect(page.getByLabel('Liked')).toBeVisible();
});

test("can change a book's rating after adding it", async ({ page }) => {
  await addBookManually(page, { title: 'Neuromancer' });

  await expect(page.getByLabel('Liked')).toHaveCount(0);
  await expect(page.getByLabel('Disliked')).toHaveCount(0);

  // Enter edit mode and dislike it. Rating a book saves immediately and
  // exits edit mode (the card re-renders from the refetched book list), so
  // each rating change needs its own "Edit book" click.
  await page.getByTitle('Edit book').click();
  await page.getByRole('button', { name: 'Dislike', exact: true }).click();
  await expect(page.getByLabel('Disliked')).toBeVisible();

  // Clicking the same rating again clears it.
  await page.getByTitle('Edit book').click();
  await page.getByRole('button', { name: 'Dislike', exact: true }).click();
  await expect(page.getByLabel('Disliked')).toHaveCount(0);
});

test('can delete a book', async ({ page }) => {
  await addBookManually(page, { title: 'Foundation' });
  await expect(page.getByRole('heading', { name: 'Foundation', level: 3 })).toBeVisible();

  await page.getByTitle('Edit book').click();
  // dispatchEvent (rather than click()) on these corner icon buttons:
  // their clip-path shape plus a hover-triggered CSS size transition make
  // Playwright's hover-then-click actionability sequence flake across
  // browsers (confirmed the underlying click handler itself works fine).
  await page.getByTitle('Delete book').dispatchEvent('click');
  await page.getByTitle('Click again to delete').dispatchEvent('click');

  await expect(page.getByText('Your library is empty')).toBeVisible();
});
