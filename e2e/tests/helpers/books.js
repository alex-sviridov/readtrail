import { expect } from '@playwright/test';

/**
 * Stubs the OpenLibrary search API so add-book tests don't depend on a
 * third-party service's uptime or content; the app always falls through
 * to its own "Add ... Manually" path.
 */
export async function mockOpenLibrarySearch(page) {
  await page.route('https://openlibrary.org/**', (route) =>
    route.fulfill({ json: { docs: [] } })
  );
}

/**
 * Adds a book via the "Add ... Manually" path (search results are mocked
 * empty above), optionally rating it during the add flow, and finalizes
 * with "Read Long Ago" so the flow completes deterministically without
 * needing to navigate the month grid or deal with future-month limits.
 */
export async function addBookManually(page, { title, score } = {}) {
  await page.getByRole('button', { name: 'Add Book' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Enter book title...').fill(title);
  await dialog.getByRole('button', { name: `Add "${title}" Manually` }).click();

  if (score === 'like') {
    await dialog.getByRole('button', { name: 'Like', exact: true }).click();
  } else if (score === 'dislike') {
    await dialog.getByRole('button', { name: 'Dislike', exact: true }).click();
  }

  await dialog.getByRole('button', { name: 'Mark as read long ago' }).click();
  await expect(page.getByRole('heading', { name: title, level: 3 })).toBeVisible();
  await expect(dialog).toBeHidden();
}
