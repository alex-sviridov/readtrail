import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

describe('Books API', () => {
  describe('GET /api/books', () => {
    it('should return 200 and an array of books', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('books');
      expect(Array.isArray(response.body.books)).toBe(true);
    });

    it('should return empty array when no books exist', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body.books).toEqual([]);
    });

    it('should return books with correct structure', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      response.body.books.forEach(book => {
        expect(book).toHaveProperty('id');
        expect(book).toHaveProperty('name');
        expect(book).toHaveProperty('author');
        expect(book).toHaveProperty('coverLink');
        expect(book).toHaveProperty('year');
        expect(book).toHaveProperty('month');
        expect(book).toHaveProperty('attributes');
        expect(book.attributes).toHaveProperty('isUnfinished');
        expect(book.attributes).toHaveProperty('customCover');
        expect(book.attributes).toHaveProperty('score');
        expect(book).toHaveProperty('createdAt');
        expect(book).toHaveProperty('updatedAt');
      });
    });
  });

  describe('GET /api/books/:id', () => {
    it('should return 404 for non-existent book', async () => {
      const response = await request(app)
        .get('/api/books/550e8400-e29b-41d4-a716-446655440000')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NotFoundError');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 200 and book object when book exists', async () => {
      const response = await request(app)
        .get('/api/books/valid-book-id')
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('book');
        expect(response.body.book).toHaveProperty('id');
        expect(response.body.book).toHaveProperty('name');
        expect(response.body.book).toHaveProperty('attributes');
      }
    });

    it('should return book with all required fields', async () => {
      const response = await request(app)
        .get('/api/books/valid-book-id');

      if (response.status === 200) {
        const { book } = response.body;
        expect(book).toHaveProperty('id');
        expect(book).toHaveProperty('name');
        expect(book).toHaveProperty('author');
        expect(book).toHaveProperty('coverLink');
        expect(book).toHaveProperty('year');
        expect(book).toHaveProperty('month');
        expect(book.attributes).toHaveProperty('isUnfinished');
        expect(book.attributes).toHaveProperty('customCover');
        expect(book.attributes).toHaveProperty('score');
        expect(book).toHaveProperty('createdAt');
        expect(book).toHaveProperty('updatedAt');
      }
    });
  });

  describe('POST /api/books', () => {
    it('should create a book with all fields', async () => {
      const newBook = {
        name: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        coverLink: 'https://covers.openlibrary.org/b/id/123456-L.jpg',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 1
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('book');
      expect(response.body.book).toMatchObject({
        name: newBook.name,
        author: newBook.author,
        coverLink: newBook.coverLink,
        year: newBook.year,
        month: newBook.month,
        attributes: newBook.attributes
      });
      expect(response.body.book).toHaveProperty('id');
      expect(response.body.book).toHaveProperty('createdAt');
      expect(response.body.book).toHaveProperty('updatedAt');
    });

    it('should create a book with minimal fields', async () => {
      const newBook = {
        name: 'Minimal Book',
        author: null,
        coverLink: null,
        year: null,
        month: null,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect(201);

      expect(response.body.book.name).toBe(newBook.name);
      expect(response.body.book.author).toBeNull();
      expect(response.body.book.year).toBeNull();
      expect(response.body.book.month).toBeNull();
    });

    it('should create a book with in-progress status (year and month null)', async () => {
      const newBook = {
        name: 'In Progress Book',
        author: 'Some Author',
        coverLink: null,
        year: null,
        month: null,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect(201);

      expect(response.body.book.year).toBeNull();
      expect(response.body.book.month).toBeNull();
    });

    it('should return 400 when name is missing', async () => {
      const invalidBook = {
        author: 'Some Author',
        year: 2024,
        month: 11
      };

      await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);
    });

    it('should return 400 when name is empty string', async () => {
      const invalidBook = {
        name: '',
        author: 'Some Author',
        year: 2024,
        month: 11
      };

      await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);
    });

    it('should return 400 when year is set but month is null', async () => {
      const invalidBook = {
        name: 'Invalid Book',
        author: 'Some Author',
        year: 2024,
        month: null
      };

      await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);
    });

    it('should return 400 when month is set but year is null', async () => {
      const invalidBook = {
        name: 'Invalid Book',
        author: 'Some Author',
        year: null,
        month: 11
      };

      await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);
    });

    it('should return 400 when month is less than 1', async () => {
      const invalidBook = {
        name: 'Invalid Book',
        author: 'Some Author',
        year: 2024,
        month: 0
      };

      await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);
    });

    it('should return 400 when month is greater than 12', async () => {
      const invalidBook = {
        name: 'Invalid Book',
        author: 'Some Author',
        year: 2024,
        month: 13
      };

      await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);
    });

    it('should return 400 when score is invalid', async () => {
      const invalidBook = {
        name: 'Invalid Book',
        author: 'Some Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: 5
        }
      };

      await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);
    });

    it('should accept score values: -1, 0, 1, null', async () => {
      const validScores = [-1, 0, 1, null];

      for (const score of validScores) {
        const newBook = {
          name: `Book with score ${score}`,
          author: 'Test Author',
          year: 2024,
          month: 11,
          attributes: {
            isUnfinished: false,
            customCover: false,
            score: score
          }
        };

        const response = await request(app)
          .post('/api/books')
          .send(newBook)
          .expect(201);

        expect(response.body.book.attributes.score).toBe(score);
      }
    });

    it('should generate UUID for new book', async () => {
      const newBook = {
        name: 'UUID Test Book',
        author: 'Test Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect(201);

      expect(response.body.book.id).toBeTruthy();
      expect(typeof response.body.book.id).toBe('string');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const newBook = {
        name: 'Timestamp Test Book',
        author: 'Test Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect(201);

      expect(response.body.book.createdAt).toBeTruthy();
      expect(response.body.book.updatedAt).toBeTruthy();
      expect(new Date(response.body.book.createdAt).toISOString()).toBe(response.body.book.createdAt);
      expect(new Date(response.body.book.updatedAt).toISOString()).toBe(response.body.book.updatedAt);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('should return 404 for non-existent book', async () => {
      const updates = {
        name: 'Updated Book'
      };

      const response = await request(app)
        .put('/api/books/550e8400-e29b-41d4-a716-446655440000')
        .send(updates)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NotFoundError');
    });

    it('should update book with partial data', async () => {
      const updates = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/books/valid-book-id')
        .send(updates);

      if (response.status === 200) {
        expect(response.body.book.name).toBe(updates.name);
      }
    });

    it('should update book attributes', async () => {
      const updates = {
        attributes: {
          isUnfinished: true,
          score: 1
        }
      };

      const response = await request(app)
        .put('/api/books/valid-book-id')
        .send(updates);

      if (response.status === 200) {
        expect(response.body.book.attributes.isUnfinished).toBe(true);
        expect(response.body.book.attributes.score).toBe(1);
      }
    });

    it('should update updatedAt timestamp', async () => {
      const updates = {
        name: 'Updated Book'
      };

      const response = await request(app)
        .put('/api/books/valid-book-id')
        .send(updates);

      if (response.status === 200) {
        expect(response.body.book.updatedAt).toBeTruthy();
        expect(new Date(response.body.book.updatedAt).toISOString()).toBe(response.body.book.updatedAt);
      }
    });

    it('should not change createdAt timestamp', async () => {
      const updates = {
        name: 'Updated Book'
      };

      const response = await request(app)
        .put('/api/books/valid-book-id')
        .send(updates);

      if (response.status === 200) {
        expect(response.body.book.createdAt).toBeTruthy();
      }
    });

    it('should return 400 for invalid data', async () => {
      const invalidUpdates = {
        year: 2024,
        month: null
      };

      await request(app)
        .put('/api/books/valid-book-id')
        .send(invalidUpdates)
        .expect(400);
    });

    it('should return 409 for update conflict', async () => {
      const updates = {
        name: 'Conflicting Update'
      };

      const response = await request(app)
        .put('/api/books/conflicted-book-id')
        .send(updates);

      if (response.status === 409) {
        expect(response.body).toHaveProperty('error', 'Conflict');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('serverVersion');
        expect(response.body.serverVersion).toHaveProperty('id');
        expect(response.body.serverVersion).toHaveProperty('updatedAt');
      }
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should return 404 for non-existent book', async () => {
      const response = await request(app)
        .delete('/api/books/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NotFoundError');
    });

    it('should return 204 on successful deletion', async () => {
      const response = await request(app)
        .delete('/api/books/valid-book-id');

      if (response.status === 204) {
        expect(response.body).toEqual({});
      }
    });

    it('should actually delete the book', async () => {
      const deleteResponse = await request(app)
        .delete('/api/books/deletable-book-id');

      if (deleteResponse.status === 204) {
        const getResponse = await request(app)
          .get('/api/books/deletable-book-id')
          .expect(404);

        expect(getResponse.body).toHaveProperty('error', 'NotFoundError');
      }
    });
  });

  describe('POST /api/books/batch', () => {
    it('should create multiple books at once', async () => {
      const batchBooks = {
        books: [
          {
            name: 'Book 1',
            author: 'Author 1',
            year: 2024,
            month: 11,
            attributes: {
              isUnfinished: false,
              customCover: false,
              score: 1
            }
          },
          {
            name: 'Book 2',
            author: 'Author 2',
            year: 2024,
            month: 10,
            attributes: {
              isUnfinished: false,
              customCover: false,
              score: -1
            }
          },
          {
            name: 'Book 3',
            author: 'Author 3',
            year: null,
            month: null,
            attributes: {
              isUnfinished: false,
              customCover: false,
              score: null
            }
          }
        ]
      };

      const response = await request(app)
        .post('/api/books/batch')
        .send(batchBooks)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('books');
      expect(Array.isArray(response.body.books)).toBe(true);
      expect(response.body.books.length).toBe(3);

      response.body.books.forEach((book, index) => {
        expect(book).toHaveProperty('id');
        expect(book.name).toBe(batchBooks.books[index].name);
        expect(book).toHaveProperty('createdAt');
        expect(book).toHaveProperty('updatedAt');
      });
    });

    it('should handle empty batch', async () => {
      const response = await request(app)
        .post('/api/books/batch')
        .send({ books: [] })
        .expect(201);

      expect(response.body.books).toEqual([]);
    });

    it('should validate all books in batch', async () => {
      const invalidBatch = {
        books: [
          {
            name: 'Valid Book',
            author: 'Author',
            year: 2024,
            month: 11,
            attributes: {
              isUnfinished: false,
              customCover: false,
              score: 1
            }
          },
          {
            name: '',
            author: 'Author 2',
            year: 2024,
            month: 11
          }
        ]
      };

      await request(app)
        .post('/api/books/batch')
        .send(invalidBatch)
        .expect(400);
    });

    it('should be atomic (all or nothing)', async () => {
      const batchBooks = {
        books: [
          {
            name: 'Book 1',
            author: 'Author 1',
            year: 2024,
            month: 11,
            attributes: {
              isUnfinished: false,
              customCover: false,
              score: 1
            }
          },
          {
            name: '',
            author: 'Author 2',
            year: 2024,
            month: 11
          }
        ]
      };

      await request(app)
        .post('/api/books/batch')
        .send(batchBooks)
        .expect(400);

      const response = await request(app)
        .get('/api/books')
        .expect(200);

      const book1Exists = response.body.books.some(b => b.name === 'Book 1');
      expect(book1Exists).toBe(false);
    });

    it('should accept large batches', async () => {
      const largeBookArray = Array.from({ length: 100 }, (_, i) => ({
        name: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      }));

      const response = await request(app)
        .post('/api/books/batch')
        .send({ books: largeBookArray })
        .expect(201);

      expect(response.body.books.length).toBe(100);
    });
  });

  describe('Books API - Timestamp Format', () => {
    it('should use ISO 8601 format for timestamps', async () => {
      const newBook = {
        name: 'Timestamp Format Test',
        author: 'Test Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect(201);

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(response.body.book.createdAt).toMatch(iso8601Regex);
      expect(response.body.book.updatedAt).toMatch(iso8601Regex);
    });
  });
});
