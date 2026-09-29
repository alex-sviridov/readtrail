import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from './helpers/testUser.js';
import { mockOpenLibrarySearch } from './helpers/books.js';

const HEADER = 'Book Id,Title,Author,ISBN,My Rating,Date Read,Exclusive Shelf,My Review';

const SAMPLE_CSV = [
  HEADER,
  '1,The Housing Monster,prole.info,"=""160486530X""",0,,currently-reading,',
  '2,Pale Fire,Vladimir Nabokov,"=""0141185260""",0,,to-read,',
  '3,Never Use Futura,Doug Thomas,"=""1616895721""",4,,read,"Pretty good!, but ""quoted""\nand multi-line"',
  '4,Nixonland,Rick Perlstein,"=""1451606265""",5,2017/11/11,read,',
  '5,Bad Rated Book,Some Author,"=""""",1,2017/03/06,read,',
  '6,Kim,Rudyard Kipling,"=""""",0,,read,',
].join('\n');

async function writeTempFile(name, content) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-goodreads-'));
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, content);
  return filePath;
}

async function importGoodreadsCsv(page, name, content) {
  const filePath = await writeTempFile(name, content);
  await page.goto('/settings/data');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import Goodreads CSV' }).click(),
  ]);
  await fileChooser.setFiles(filePath);
}

async function exportedBooks(page) {
  await page.goto('/settings/data');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Books' }).click(),
  ]);
  const { books } = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  return Object.fromEntries(books.map((b) => [b.name, b]));
}

test.describe('goodreads import (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await mockOpenLibrarySearch(page);
    await registerUser(page, generateTestUser());
  });

  test('imports titles, authors, status, dates and ratings, and reports bad rows inline', async ({ page }) => {
    await importGoodreadsCsv(page, 'goodreads_library_export.csv', SAMPLE_CSV);

    await expect(page.getByText('Imported 5 books, skipped 0 already in your library.')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('1 row could not be imported.')).toBeVisible();
    await page.getByText('Show details').click();
    await expect(page.getByText("Row 6: Title 'Kim' is shorter than 4 characters")).toBeVisible();
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    const byName = await exportedBooks(page);
    expect(Object.keys(byName)).toHaveLength(5);
    expect(byName['The Housing Monster'].read_date).toBe('');
    expect(byName['Pale Fire'].read_date).toMatch(/^2100-01-01/);
    expect(byName['Never Use Futura'].read_date).toMatch(/^1910-01-01/);
    expect(byName['Never Use Futura'].attributes.score).toBeNull();
    expect(byName['Nixonland'].read_date).toMatch(/^2017-11-01/);
    expect(byName['Nixonland'].attributes.score).toBe(1);
    expect(byName['Nixonland'].author).toBe('Rick Perlstein');
    expect(byName['Bad Rated Book'].attributes.score).toBe(-1);

    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Nixonland', level: 3 })).toBeVisible();
  });

  test('re-importing skips books already in the library', async ({ page }) => {
    await importGoodreadsCsv(page, 'goodreads_library_export.csv', SAMPLE_CSV);
    await expect(page.getByText('Imported 5 books')).toBeVisible({ timeout: 60_000 });

    await importGoodreadsCsv(page, 'goodreads_library_export.csv', SAMPLE_CSV);

    await expect(page.getByText('Imported 0 books, skipped 5 already in your library.')).toBeVisible({ timeout: 60_000 });
    expect(Object.keys(await exportedBooks(page))).toHaveLength(5);
  });

  test('saves the cover found on Open Library', async ({ page }) => {
    await page.route('**/api/books/search**', (route) =>
      route.fulfill({ json: { docs: [{ cover_i: 8231856 }] } })
    );

    await importGoodreadsCsv(page, 'goodreads_library_export.csv', `${HEADER}\n1,Dune,Frank Herbert,,0,,read,`);

    await expect(page.getByText('Found covers for 1 of 1.')).toBeVisible({ timeout: 60_000 });
    const byName = await exportedBooks(page);
    expect(byName.Dune.cover_url).toBe('https://covers.openlibrary.org/b/id/8231856-M.jpg');
  });

  test('shows an inline error for a file that is not a Goodreads export', async ({ page }) => {
    await importGoodreadsCsv(page, 'notes.csv', 'foo,bar\n1,2\n');

    await expect(page.getByRole('alert')).toContainText('Not a Goodreads export');
  });

  test('rejects a non-csv file inline', async ({ page }) => {
    await importGoodreadsCsv(page, 'backup.json', '{}');

    await expect(page.getByRole('alert')).toContainText('.csv');
  });
});
