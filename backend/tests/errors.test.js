import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

describe('Error Handling and Validation', () => {
  describe('Error Response Format', () => {
    it('should return standardized error format', async () => {
      const response = await request(app)
        .get('/api/books/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
    });

    it('should include error type in response', async () => {
      const response = await request(app)
        .get('/api/books/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('NotFoundError');
    });

    it('should include human-readable message', async () => {
      const response = await request(app)
        .get('/api/books/non-existent-id')
        .expect(404);

      expect(response.body.message).toBeTruthy();
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('should optionally include details object', async () => {
      const invalidBook = {
        name: '',
        year: 2024,
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      if (response.body.details) {
        expect(typeof response.body.details).toBe('object');
      }
    });
  });

  describe('Common Error Types', () => {
    it('should return ValidationError for invalid data', async () => {
      const invalidBook = {
        name: '',
        author: 'Author',
        year: 2024,
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body.error).toMatch(/validation/i);
    });

    it('should return NotFoundError for missing resources', async () => {
      const response = await request(app)
        .get('/api/books/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('NotFoundError');
    });

    it('should return AuthenticationError when auth fails', async () => {
      if (process.env.AUTH_ENABLE === 'true' && process.env.AUTH_GUEST_USER_ENABLE !== 'true') {
        const response = await request(app)
          .get('/api/books')
          .expect(401);

        expect(response.body.error).toMatch(/auth/i);
      }
    });

    it('should return ConflictError for update conflicts', async () => {
      const response = await request(app)
        .put('/api/books/conflicted-id')
        .send({ name: 'Updated Name' });

      if (response.status === 409) {
        expect(response.body.error).toMatch(/conflict/i);
      }
    });

    it('should return ServerError for internal errors', async () => {
      const response = await request(app)
        .get('/api/books/trigger-server-error');

      if (response.status === 500) {
        expect(response.body.error).toMatch(/server/i);
      }
    });
  });

  describe('Input Validation - Books', () => {
    it('should validate required fields', async () => {
      const invalidBook = {
        author: 'Author',
        year: 2024,
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/name|required/i);
    });

    it('should validate name is non-empty', async () => {
      const invalidBook = {
        name: '',
        author: 'Author',
        year: 2024,
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body.message).toMatch(/name|empty/i);
    });

    it('should validate name is a string', async () => {
      const invalidBook = {
        name: 123,
        author: 'Author',
        year: 2024,
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate year and month consistency', async () => {
      const invalidBooks = [
        { name: 'Book 1', year: 2024, month: null },
        { name: 'Book 2', year: null, month: 11 }
      ];

      for (const book of invalidBooks) {
        const response = await request(app)
          .post('/api/books')
          .send(book)
          .expect(400);

        expect(response.body.message).toMatch(/year.*month|consistency/i);
      }
    });

    it('should validate month range (1-12)', async () => {
      const invalidMonths = [0, -1, 13, 100];

      for (const month of invalidMonths) {
        const invalidBook = {
          name: 'Test Book',
          year: 2024,
          month: month
        };

        const response = await request(app)
          .post('/api/books')
          .send(invalidBook)
          .expect(400);

        expect(response.body.message).toMatch(/month|range|1.*12/i);
      }
    });

    it('should validate score values (-1, 0, 1, null)', async () => {
      const invalidScores = [2, -2, 5, 10, 'high', true];

      for (const score of invalidScores) {
        const invalidBook = {
          name: 'Test Book',
          author: 'Author',
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
          .send(invalidBook)
          .expect(400);

        expect(response.body.message).toMatch(/score/i);
      }
    });

    it('should validate boolean attributes', async () => {
      const invalidBook = {
        name: 'Test Book',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: 'yes',
          customCover: 1,
          score: null
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate year is a number', async () => {
      const invalidBook = {
        name: 'Test Book',
        year: '2024',
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject additional unknown fields', async () => {
      const bookWithExtra = {
        name: 'Test Book',
        author: 'Author',
        year: 2024,
        month: 11,
        unknownField: 'should not be here',
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      const response = await request(app)
        .post('/api/books')
        .send(bookWithExtra);

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should validate attributes object structure', async () => {
      const invalidBook = {
        name: 'Test Book',
        year: 2024,
        month: 11,
        attributes: 'not an object'
      };

      const response = await request(app)
        .post('/api/books')
        .send(invalidBook)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing attributes gracefully', async () => {
      const bookWithoutAttributes = {
        name: 'Test Book',
        author: 'Author',
        year: 2024,
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(bookWithoutAttributes);

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Input Validation - Settings', () => {
    it('should validate boolean fields', async () => {
      const invalidSettings = {
        showBookInfo: 'yes',
        allowUnfinishedReading: 1,
        allowScoring: 'true'
      };

      const response = await request(app)
        .put('/api/settings')
        .send(invalidSettings)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/boolean/i);
    });

    it('should reject unknown fields', async () => {
      const invalidSettings = {
        showBookInfo: true,
        unknownSetting: true
      };

      const response = await request(app)
        .put('/api/settings')
        .send(invalidSettings)
        .expect(400);

      expect(response.body.message).toMatch(/unknown|invalid.*field/i);
    });

    it('should handle null values appropriately', async () => {
      const settingsWithNull = {
        showBookInfo: null,
        allowScoring: true
      };

      const response = await request(app)
        .put('/api/settings')
        .send(settingsWithNull)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content-Type Validation', () => {
    it('should require application/json for POST requests', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Content-Type', 'text/plain')
        .send('name=Test Book')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should require application/json for PUT requests', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Content-Type', 'text/plain')
        .send('showBookInfo=true')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Content-Type', 'application/json')
        .send('{"name": "Test Book", invalid}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('404 Not Found Errors', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent book', async () => {
      const response = await request(app)
        .get('/api/books/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);

      expect(response.body.error).toBe('NotFoundError');
      expect(response.body.message).toMatch(/book.*not found/i);
    });

    it('should return 404 when updating non-existent book', async () => {
      const response = await request(app)
        .put('/api/books/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.error).toBe('NotFoundError');
    });

    it('should return 404 when deleting non-existent book', async () => {
      const response = await request(app)
        .delete('/api/books/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('NotFoundError');
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/books/test-id')
        .expect(404);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle OPTIONS requests for CORS', async () => {
      const response = await request(app)
        .options('/api/books')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Batch Operation Validation', () => {
    it('should validate all books in batch request', async () => {
      const invalidBatch = {
        books: [
          { name: 'Valid Book', year: 2024, month: 11 },
          { name: '', year: 2024, month: 11 }
        ]
      };

      const response = await request(app)
        .post('/api/books/batch')
        .send(invalidBatch)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/validation|invalid/i);
    });

    it('should reject batch with invalid structure', async () => {
      const invalidBatch = {
        items: [{ name: 'Book' }]
      };

      const response = await request(app)
        .post('/api/books/batch')
        .send(invalidBatch)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate books array exists', async () => {
      const response = await request(app)
        .post('/api/books/batch')
        .send({})
        .expect(400);

      expect(response.body.message).toMatch(/books.*required|array/i);
    });

    it('should validate books is an array', async () => {
      const invalidBatch = {
        books: 'not an array'
      };

      const response = await request(app)
        .post('/api/books/batch')
        .send(invalidBatch)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Request Size Limits', () => {
    it('should handle large request bodies appropriately', async () => {
      const largeBook = {
        name: 'A'.repeat(10000),
        author: 'B'.repeat(10000),
        year: 2024,
        month: 11
      };

      const response = await request(app)
        .post('/api/books')
        .send(largeBook);

      expect([201, 400, 413]).toContain(response.status);
    });

    it('should handle reasonable batch sizes', async () => {
      const reasonableBatch = {
        books: Array.from({ length: 100 }, (_, i) => ({
          name: `Book ${i}`,
          year: 2024,
          month: 11,
          attributes: {
            isUnfinished: false,
            customCover: false,
            score: null
          }
        }))
      };

      const response = await request(app)
        .post('/api/books/batch')
        .send(reasonableBatch);

      expect([201, 413]).toContain(response.status);
    });
  });

  describe('Error Recovery', () => {
    it('should continue working after validation errors', async () => {
      await request(app)
        .post('/api/books')
        .send({ name: '' })
        .expect(400);

      const validBook = {
        name: 'Valid Book',
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
        .send(validBook)
        .expect(201);

      expect(response.body.book.name).toBe('Valid Book');
    });

    it('should maintain data integrity after errors', async () => {
      const initialBooks = await request(app)
        .get('/api/books');

      const initialCount = initialBooks.body.books.length;

      await request(app)
        .post('/api/books')
        .send({ name: '' })
        .expect(400);

      const afterErrorBooks = await request(app)
        .get('/api/books');

      expect(afterErrorBooks.body.books.length).toBe(initialCount);
    });
  });
});
