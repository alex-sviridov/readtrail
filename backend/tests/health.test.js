import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

describe('Health Check API', () => {
  describe('GET /api/health', () => {
    it('should return 200 status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should return correct response structure', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return ISO 8601 timestamp', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(response.body.timestamp).toMatch(iso8601Regex);
    });

    it('should return current timestamp', async () => {
      const beforeRequest = new Date();

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const afterRequest = new Date();
      const responseTime = new Date(response.body.timestamp);

      expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime() - 1000);
      expect(responseTime.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 1000);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
    });

    it('should respond quickly', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/health')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should always return ok status when server is running', async () => {
      const responses = await Promise.all([
        request(app).get('/api/health'),
        request(app).get('/api/health'),
        request(app).get('/api/health')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });
    });
  });
});
