import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, registerUserApi, userMenuButton } from './helpers/testUser.js';
import { mockOpenLibrarySearch, addBookManually } from './helpers/books.js';

/** Writes `content` to a fresh temp file and returns its path. */
async function writeTempFile(content) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-import-'));
  const filePath = path.join(dir, 'payload.json');
  await fs.writeFile(filePath, content);
  return filePath;
}

async function exportBooks(page) {
  await page.goto('/settings/account');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Books' }).click(),
  ]);
  return download.path();
}

async function importFile(page, filePath) {
  await page.goto('/settings/account');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import Books' }).click(),
  ]);
  await fileChooser.setFiles(filePath);
}

test.describe('books export/import (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await mockOpenLibrarySearch(page);
    await registerUser(page, generateTestUser());
  });

  test('exporting, deleting, then importing restores the library', async ({ page }) => {
    await addBookManually(page, { title: 'Dune' });
    await addBookManually(page, { title: 'Neuromancer' });

    const exportPath = await exportBooks(page);

    // Delete both books, confirming the library is empty before importing.
    // Each card is scoped from its heading (rather than using `.first()`)
    // so deleting one title can't accidentally hit the other book's card.
    await page.goto('/library');
    for (const title of ['Dune', 'Neuromancer']) {
      const card = page
        .getByRole('heading', { name: title, level: 3 })
        .locator('xpath=ancestor::div[contains(@class, "group")][1]');
      await card.getByTitle('Edit book').click();
      await card.getByTitle('Delete book').dispatchEvent('click');
      await card.getByTitle('Click again to delete').dispatchEvent('click');
    }
    await expect(page.getByText('Your library is empty')).toBeVisible();

    await importFile(page, exportPath);
    await expect(page.getByText(/Imported 2 book\(s\)/)).toBeVisible();

    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Dune', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Neuromancer', level: 3 })).toBeVisible();
  });

  test('re-importing the same export skips books already in the library', async ({ page }) => {
    await addBookManually(page, { title: 'Dune' });
    await addBookManually(page, { title: 'Neuromancer' });

    const exportPath = await exportBooks(page);

    await importFile(page, exportPath);
    await expect(page.getByText('Imported 0 book(s), skipped 2 already in your library')).toBeVisible();

    // No duplicates: each title still appears exactly once.
    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Dune', level: 3 })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Neuromancer', level: 3 })).toHaveCount(1);
  });

  test('imports a file exported from a different account', async ({ page }) => {
    await addBookManually(page, { title: 'Dune' });
    const exportPath = await exportBooks(page);

    // Switch accounts: log the first user out, register a second.
    await userMenuButton(page).click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
    await registerUser(page, generateTestUser());

    await expect(page.getByText('Your library is empty')).toBeVisible();
    await importFile(page, exportPath);
    await expect(page.getByText(/Imported 1 book\(s\)/)).toBeVisible();

    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Dune', level: 3 })).toBeVisible();
  });

  test('reports entries that fail to import without failing the whole batch', async ({ page }) => {
    const payload = JSON.stringify({
      version: 1,
      books: [{ name: 'Valid Book', author: 'Someone' }, { author: 'No Name Here' }],
    });
    const filePath = await writeTempFile(payload);

    await importFile(page, filePath);
    await expect(page.getByText(/Imported 1 book\(s\)/)).toBeVisible();
    await expect(page.getByText('1 entry could not be imported')).toBeVisible();

    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Valid Book', level: 3 })).toBeVisible();
  });

  test('rejects a file that is not valid JSON without contacting the backend', async ({ page }) => {
    const filePath = await writeTempFile('this is not json');

    let importRequested = false;
    await page.route('**/api/books/import', (route) => {
      importRequested = true;
      return route.continue();
    });

    await importFile(page, filePath);
    await expect(page.getByText('That file is not valid JSON.')).toBeVisible();
    expect(importRequested).toBe(false);
  });
});

test.describe('books export/import (API, page-size limits)', () => {
  // PocketBase's list API defaults to a 30-record page size. These endpoints
  // use $app.findRecordsByFilter directly rather than that paginated list
  // API, so both should return/accept every record regardless of count --
  // this seeds more than 30 books to confirm neither silently truncates.
  const BOOK_COUNT = 35;

  test('export returns every book, not just a 30-record page', async ({ request }) => {
    const { token, userId } = await registerUserApi(request, generateTestUser());

    await Promise.all(
      Array.from({ length: BOOK_COUNT }, (_, i) =>
        request.post('/api/collections/books/records', {
          headers: { Authorization: token },
          data: { owner: userId, name: `Book ${i}`, author: 'Author' },
        })
      )
    );

    const response = await request.get('/api/books/export', {
      headers: { Authorization: token },
    });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.books).toHaveLength(BOOK_COUNT);
  });

  test('import creates every book from a batch larger than a 30-record page', async ({ request }) => {
    const seedUser = await registerUserApi(request, generateTestUser());
    await Promise.all(
      Array.from({ length: BOOK_COUNT }, (_, i) =>
        request.post('/api/collections/books/records', {
          headers: { Authorization: seedUser.token },
          data: { owner: seedUser.userId, name: `Book ${i}`, author: 'Author' },
        })
      )
    );
    const exportResponse = await request.get('/api/books/export', {
      headers: { Authorization: seedUser.token },
    });
    const exportData = await exportResponse.json();
    expect(exportData.books).toHaveLength(BOOK_COUNT);

    const importUser = await registerUserApi(request, generateTestUser());
    const importResponse = await request.post('/api/books/import', {
      headers: { Authorization: importUser.token },
      data: exportData,
    });
    expect(importResponse.ok()).toBe(true);
    const importResult = await importResponse.json();
    expect(importResult.imported).toBe(BOOK_COUNT);
    expect(importResult.skipped).toBe(0);
    expect(importResult.errors).toHaveLength(0);

    const reExportResponse = await request.get('/api/books/export', {
      headers: { Authorization: importUser.token },
    });
    const reExportData = await reExportResponse.json();
    expect(reExportData.books).toHaveLength(BOOK_COUNT);
  });
});
