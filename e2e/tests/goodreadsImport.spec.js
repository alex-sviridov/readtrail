import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, registerUserApi } from './helpers/testUser.js';

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

// Cover lookups hit the real Open Library, so tests default to skipping them.
async function importCsv(request, token, data, { covers = false } = {}) {
  return request.post(`/api/books/import/goodreads${covers ? '' : '?covers=false'}`, {
    headers: { Authorization: token, 'Content-Type': 'text/csv' },
    data,
  });
}

async function listBooks(request, token) {
  const response = await request.get('/api/books/export', { headers: { Authorization: token } });
  return (await response.json()).books;
}

test.describe('goodreads import (API)', () => {
  test('imports titles, authors, status, dates and ratings', async ({ request }) => {
    const { token } = await registerUserApi(request, generateTestUser());

    const response = await importCsv(request, token, SAMPLE_CSV);
    expect(response.ok()).toBe(true);
    const result = await response.json();
    expect(result.imported).toBe(5);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([{ index: 5, reason: "Title 'Kim' is shorter than 4 characters" }]);

    const byName = Object.fromEntries((await listBooks(request, token)).map((b) => [b.name, b]));
    expect(byName['The Housing Monster'].read_date).toBe('');
    expect(byName['Pale Fire'].read_date).toMatch(/^2100-01-01/);
    expect(byName['Never Use Futura'].read_date).toMatch(/^1910-01-01/);
    expect(byName['Never Use Futura'].attributes.score).toBeNull();
    expect(byName['Nixonland'].read_date).toMatch(/^2017-11-01/);
    expect(byName['Nixonland'].attributes.score).toBe(1);
    expect(byName['Nixonland'].author).toBe('Rick Perlstein');
    expect(byName['Bad Rated Book'].attributes.score).toBe(-1);
  });

  test('re-importing skips books already in the library', async ({ request }) => {
    const { token } = await registerUserApi(request, generateTestUser());
    await importCsv(request, token, SAMPLE_CSV);

    const result = await (await importCsv(request, token, SAMPLE_CSV)).json();
    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(5);
    expect(await listBooks(request, token)).toHaveLength(5);
  });

  test('looks up covers on Open Library for new books unless disabled', async ({ request }) => {
    const { token } = await registerUserApi(request, generateTestUser());
    const csv = `${HEADER}\n1,Dune,Frank Herbert,,0,,read,`;

    const result = await (await importCsv(request, token, csv, { covers: true })).json();
    expect(result.imported).toBe(1);
    // Open Library is a live third-party service, so a miss is tolerated;
    // what matters is that the lookup ran, was accounted for, and never
    // failed the import.
    expect(result.covers.found + result.covers.notFound + result.covers.skipped).toBe(1);
    if (result.covers.found === 1) {
      const [book] = await listBooks(request, token);
      expect(book.cover_url).toMatch(/^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-M\.jpg$/);
    }

    const skippedResult = await (await importCsv(request, token, `${HEADER}\n2,Neuromancer,William Gibson,,0,,read,`)).json();
    expect(skippedResult.covers).toEqual({ found: 0, notFound: 0, skipped: 0 });
  });

  test('requires authentication', async ({ request }) => {
    const response = await request.post('/api/books/import/goodreads', {
      headers: { 'Content-Type': 'text/csv' },
      data: SAMPLE_CSV,
    });
    expect(response.status()).toBe(401);
  });

  test('rejects input that is not a Goodreads CSV', async ({ request }) => {
    const { token } = await registerUserApi(request, generateTestUser());

    for (const body of ['', '{"version":1,"books":[]}', 'foo,bar\n1,2', 'Title,Author\n"unterminated,x']) {
      const response = await importCsv(request, token, body);
      expect(response.status(), `body: ${body}`).toBe(400);
    }
  });

  test('rejects files over the size limit', async ({ request }) => {
    const { token } = await registerUserApi(request, generateTestUser());
    const huge = `${HEADER}\n1,${'x'.repeat(11 * 1024 * 1024)},Some Author,,0,,read,`;

    const response = await importCsv(request, token, huge);
    expect(response.status()).toBe(413);
  });
});

async function writeTempFile(name, content) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-goodreads-'));
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, content);
  return filePath;
}

async function chooseGoodreadsFile(page, filePath) {
  await page.goto('/settings/data');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import Goodreads CSV' }).click(),
  ]);
  await fileChooser.setFiles(filePath);
}

test.describe('goodreads import (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, generateTestUser());
  });

  test('shows the import result inline on the page, without a modal', async ({ page }) => {
    const csv = `${HEADER}\n1,Dune,Frank Herbert,,5,2017/11/11,read,\n2,Pale Fire,Vladimir Nabokov,,0,,to-read,\n3,Kim,Rudyard Kipling,,0,,read,`;
    await chooseGoodreadsFile(page, await writeTempFile('goodreads_library_export.csv', csv));

    await expect(page.getByText('Imported 2 books, skipped 0 already in your library.')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('1 row could not be imported.')).toBeVisible();
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    await page.goto('/library');
    await expect(page.getByRole('heading', { name: 'Dune', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pale Fire', level: 3 })).toBeVisible();
  });

  test('shows an inline error for a file that is not a Goodreads export', async ({ page }) => {
    await chooseGoodreadsFile(page, await writeTempFile('notes.csv', 'foo,bar\n1,2\n'));

    await expect(page.getByRole('alert')).toContainText('Not a Goodreads export');
  });

  test('rejects a non-csv file inline', async ({ page }) => {
    await chooseGoodreadsFile(page, await writeTempFile('backup.json', '{}'));

    await expect(page.getByRole('alert')).toContainText('.csv');
  });
});
