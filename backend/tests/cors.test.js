import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

describe('CORS Configuration', () => {
  describe('CORS Headers', () => {
    it('should include Access-Control-Allow-Origin header', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should allow frontend origin', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should include allowed methods in OPTIONS response', async () => {
      const response = await request(app)
        .options('/api/books')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
      const methods = response.headers['access-control-allow-methods'];
      expect(methods).toMatch(/GET/);
      expect(methods).toMatch(/POST/);
      expect(methods).toMatch(/PUT/);
      expect(methods).toMatch(/DELETE/);
    });

    it('should include Access-Control-Allow-Headers', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, X-Auth-User')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should allow Content-Type header', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      const headers = response.headers['access-control-allow-headers'];
      expect(headers).toMatch(/content-type/i);
    });

    it('should allow X-Auth-User header', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Headers', 'X-Auth-User')
        .expect(204);

      const headers = response.headers['access-control-allow-headers'];
      expect(headers).toMatch(/x-auth-user/i);
    });

    it('should include Access-Control-Max-Age header', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:5173')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-max-age');
    });

    it('should set max age to 86400 (24 hours)', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:5173')
        .expect(204);

      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });

  describe('Preflight Requests', () => {
    it('should handle OPTIONS requests for POST', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toMatch(/POST/);
    });

    it('should handle OPTIONS requests for PUT', async () => {
      const response = await request(app)
        .options('/api/books/test-id')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toMatch(/PUT/);
    });

    it('should handle OPTIONS requests for DELETE', async () => {
      const response = await request(app)
        .options('/api/books/test-id')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'DELETE')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toMatch(/DELETE/);
    });

    it('should return 204 No Content for OPTIONS', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:5173')
        .expect(204);

      expect(response.body).toEqual({});
    });
  });

  describe('Cross-Origin Requests', () => {
    it('should allow GET requests from allowed origin', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should allow POST requests from allowed origin', async () => {
      const newBook = {
        name: 'CORS Test Book',
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
        .set('Origin', 'http://localhost:5173')
        .send(newBook)
        .expect(201);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should allow PUT requests from allowed origin', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('Origin', 'http://localhost:5173')
        .send({ showBookInfo: true });

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should allow DELETE requests from allowed origin', async () => {
      const response = await request(app)
        .delete('/api/books/test-id')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });

  describe('CORS Security', () => {
    it('should handle requests without Origin header', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should allow configured origin', async () => {
      const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

      const response = await request(app)
        .get('/api/health')
        .set('Origin', allowedOrigin)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });
});
