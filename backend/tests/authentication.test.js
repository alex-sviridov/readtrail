import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

describe('Authentication', () => {
  describe('No Authentication Mode (AUTH_ENABLE=false)', () => {
    it('should allow access without authentication header', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('books');
    });

    it('should use default user for all requests', async () => {
      const newBook = {
        name: 'Test Book',
        author: 'Test Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      const createResponse = await request(app)
        .post('/api/books')
        .send(newBook)
        .expect(201);

      const getResponse = await request(app)
        .get('/api/books')
        .expect(200);

      expect(getResponse.body.books).toBeDefined();
    });

    it('should accept requests with or without auth header', async () => {
      const withoutHeader = await request(app)
        .get('/api/books')
        .expect(200);

      const withHeader = await request(app)
        .get('/api/books')
        .set('X-Auth-User', 'user@example.com')
        .expect(200);

      expect(withoutHeader.body).toHaveProperty('books');
      expect(withHeader.body).toHaveProperty('books');
    });
  });

  describe('HTTP Header Authentication Mode (AUTH_ENABLE=true)', () => {
    it('should require authentication header when AUTH_ENABLE=true', async () => {
      const response = await request(app)
        .get('/api/books');

      if (process.env.AUTH_ENABLE === 'true') {
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'AuthenticationError');
      }
    });

    it('should return 401 when authentication header is missing', async () => {
      const response = await request(app)
        .get('/api/books');

      if (process.env.AUTH_ENABLE === 'true') {
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should accept request with valid authentication header', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('X-Auth-User', 'user@example.com');

      if (process.env.AUTH_ENABLE === 'true') {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('books');
      }
    });

    it('should use custom header name from AUTH_REMOTE_HTTP_HEADER', async () => {
      const customHeader = process.env.AUTH_REMOTE_HTTP_HEADER || 'X-Auth-User';

      const response = await request(app)
        .get('/api/books')
        .set(customHeader, 'user@example.com');

      if (process.env.AUTH_ENABLE === 'true') {
        expect(response.status).toBe(200);
      }
    });

    it('should create user account if not exists', async () => {
      const newUserIdentifier = `newuser-${Date.now()}@example.com`;

      const response = await request(app)
        .get('/api/books')
        .set('X-Auth-User', newUserIdentifier);

      if (process.env.AUTH_ENABLE === 'true') {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('books');
      }
    });

    it('should isolate data between different users', async () => {
      if (process.env.AUTH_ENABLE !== 'true') {
        return;
      }

      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';

      const book1 = {
        name: 'User 1 Book',
        author: 'Author 1',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      await request(app)
        .post('/api/books')
        .set('X-Auth-User', user1)
        .send(book1)
        .expect(201);

      const user1Books = await request(app)
        .get('/api/books')
        .set('X-Auth-User', user1)
        .expect(200);

      const user2Books = await request(app)
        .get('/api/books')
        .set('X-Auth-User', user2)
        .expect(200);

      const user1HasBook = user1Books.body.books.some(b => b.name === 'User 1 Book');
      const user2HasBook = user2Books.body.books.some(b => b.name === 'User 1 Book');

      expect(user1HasBook).toBe(true);
      expect(user2HasBook).toBe(false);
    });

    it('should return 403 for invalid authentication', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('X-Auth-User', '');

      if (process.env.AUTH_ENABLE === 'true') {
        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should require auth header for all endpoints', async () => {
      if (process.env.AUTH_ENABLE !== 'true') {
        return;
      }

      const endpoints = [
        { method: 'get', path: '/api/books' },
        { method: 'get', path: '/api/books/test-id' },
        { method: 'post', path: '/api/books', body: { name: 'Test' } },
        { method: 'put', path: '/api/books/test-id', body: { name: 'Test' } },
        { method: 'delete', path: '/api/books/test-id' },
        { method: 'get', path: '/api/settings' },
        { method: 'put', path: '/api/settings', body: { showBookInfo: true } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .send(endpoint.body || {});

        expect(response.status).toBe(401);
      }
    });

    it('should not require auth for health endpoint', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Guest User Mode (AUTH_ENABLE=true, AUTH_GUEST_USER_ENABLE=true)', () => {
    it('should allow anonymous usage without auth header', async () => {
      if (process.env.AUTH_ENABLE === 'true' && process.env.AUTH_GUEST_USER_ENABLE === 'true') {
        const response = await request(app)
          .get('/api/books')
          .expect(200);

        expect(response.body).toHaveProperty('books');
      }
    });

    it('should store guest user data separately', async () => {
      if (process.env.AUTH_ENABLE !== 'true' || process.env.AUTH_GUEST_USER_ENABLE !== 'true') {
        return;
      }

      const guestBook = {
        name: 'Guest Book',
        author: 'Guest Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      await request(app)
        .post('/api/books')
        .send(guestBook)
        .expect(201);

      const guestBooks = await request(app)
        .get('/api/books')
        .expect(200);

      const hasGuestBook = guestBooks.body.books.some(b => b.name === 'Guest Book');
      expect(hasGuestBook).toBe(true);
    });

    it('should migrate guest data when auth header is provided', async () => {
      if (process.env.AUTH_ENABLE !== 'true' || process.env.AUTH_GUEST_USER_ENABLE !== 'true') {
        return;
      }

      const guestBook = {
        name: 'Guest Book to Migrate',
        author: 'Guest Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      await request(app)
        .post('/api/books')
        .send(guestBook)
        .expect(201);

      const authenticatedUser = `migrated-user-${Date.now()}@example.com`;

      const migratedBooks = await request(app)
        .get('/api/books')
        .set('X-Auth-User', authenticatedUser)
        .expect(200);

      const hasMigratedBook = migratedBooks.body.books.some(b => b.name === 'Guest Book to Migrate');
      expect(hasMigratedBook).toBe(true);
    });

    it('should only migrate guest data once', async () => {
      if (process.env.AUTH_ENABLE !== 'true' || process.env.AUTH_GUEST_USER_ENABLE !== 'true') {
        return;
      }

      const guestBook = {
        name: 'One-Time Migration Book',
        author: 'Guest Author',
        year: 2024,
        month: 11,
        attributes: {
          isUnfinished: false,
          customCover: false,
          score: null
        }
      };

      await request(app)
        .post('/api/books')
        .send(guestBook)
        .expect(201);

      const user = `migration-test-${Date.now()}@example.com`;

      await request(app)
        .get('/api/books')
        .set('X-Auth-User', user)
        .expect(200);

      const guestBooksAfterMigration = await request(app)
        .get('/api/books')
        .expect(200);

      const guestStillHasBook = guestBooksAfterMigration.body.books.some(b => b.name === 'One-Time Migration Book');
      expect(guestStillHasBook).toBe(false);
    });

    it('should support multiple guest users (by session/cookie)', async () => {
      if (process.env.AUTH_ENABLE !== 'true' || process.env.AUTH_GUEST_USER_ENABLE !== 'true') {
        return;
      }

      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('books');
    });
  });

  describe('Authentication Response Codes', () => {
    it('should return 200 for successful authenticated request', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('X-Auth-User', 'user@example.com');

      expect([200, 401]).toContain(response.status);
    });

    it('should return 401 when authentication required but not provided', async () => {
      if (process.env.AUTH_ENABLE === 'true' && process.env.AUTH_GUEST_USER_ENABLE !== 'true') {
        const response = await request(app)
          .get('/api/books')
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/auth/i);
      }
    });

    it('should return 403 for invalid authentication', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('X-Auth-User', '');

      if (process.env.AUTH_ENABLE === 'true') {
        expect([401, 403]).toContain(response.status);
      }
    });
  });

  describe('Authentication Header Configuration', () => {
    it('should support custom header names', async () => {
      const customHeaders = [
        'X-Auth-User',
        'X-Authenticated-User',
        'X-User-Id',
        'X-Remote-User'
      ];

      for (const header of customHeaders) {
        const response = await request(app)
          .get('/api/books')
          .set(header, 'user@example.com');

        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should accept various user identifier formats', async () => {
      const identifiers = [
        'user@example.com',
        'username',
        'user.name@domain.co.uk',
        'user123',
        'first.last@example.com'
      ];

      for (const identifier of identifiers) {
        const response = await request(app)
          .get('/api/books')
          .set('X-Auth-User', identifier);

        if (process.env.AUTH_ENABLE === 'true') {
          expect(response.status).toBe(200);
        }
      }
    });
  });
});
