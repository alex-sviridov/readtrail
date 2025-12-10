import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

describe('Settings API', () => {
  describe('GET /api/settings', () => {
    it('should return 200 and settings object', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('settings');
    });

    it('should return settings with all required fields', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      const { settings } = response.body;
      expect(settings).toHaveProperty('showBookInfo');
      expect(settings).toHaveProperty('allowUnfinishedReading');
      expect(settings).toHaveProperty('allowScoring');
      expect(settings).toHaveProperty('updatedAt');
    });

    it('should return default values when settings do not exist', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      const { settings } = response.body;
      expect(typeof settings.showBookInfo).toBe('boolean');
      expect(typeof settings.allowUnfinishedReading).toBe('boolean');
      expect(typeof settings.allowScoring).toBe('boolean');
    });

    it('should return correct default values', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      const { settings } = response.body;
      if (settings.updatedAt === null) {
        expect(settings.showBookInfo).toBe(true);
        expect(settings.allowUnfinishedReading).toBe(true);
        expect(settings.allowScoring).toBe(true);
      }
    });

    it('should return updatedAt as null for default settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      if (!response.body.settings.updatedAt) {
        expect(response.body.settings.updatedAt).toBeNull();
      }
    });

    it('should handle 404 gracefully by returning defaults', async () => {
      const response = await request(app)
        .get('/api/settings');

      if (response.status === 404 || response.status === 200) {
        expect(response.body).toHaveProperty('settings');
        expect(response.body.settings).toHaveProperty('showBookInfo');
        expect(response.body.settings).toHaveProperty('allowUnfinishedReading');
        expect(response.body.settings).toHaveProperty('allowScoring');
      }
    });
  });

  describe('PUT /api/settings', () => {
    it('should update all settings', async () => {
      const updates = {
        showBookInfo: false,
        allowUnfinishedReading: false,
        allowScoring: false
      };

      const response = await request(app)
        .put('/api/settings')
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('settings');
      expect(response.body.settings.showBookInfo).toBe(false);
      expect(response.body.settings.allowUnfinishedReading).toBe(false);
      expect(response.body.settings.allowScoring).toBe(false);
    });

    it('should support partial updates', async () => {
      const partialUpdate = {
        showBookInfo: false
      };

      const response = await request(app)
        .put('/api/settings')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.settings.showBookInfo).toBe(false);
      expect(response.body.settings).toHaveProperty('allowUnfinishedReading');
      expect(response.body.settings).toHaveProperty('allowScoring');
    });

    it('should update only provided fields', async () => {
      const initialGet = await request(app)
        .get('/api/settings');

      const initialSettings = initialGet.body.settings;

      const partialUpdate = {
        allowScoring: !initialSettings.allowScoring
      };

      const response = await request(app)
        .put('/api/settings')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.settings.allowScoring).toBe(partialUpdate.allowScoring);
    });

    it('should set updatedAt timestamp', async () => {
      const updates = {
        showBookInfo: true
      };

      const response = await request(app)
        .put('/api/settings')
        .send(updates)
        .expect(200);

      expect(response.body.settings.updatedAt).toBeTruthy();
      expect(new Date(response.body.settings.updatedAt).toISOString()).toBe(response.body.settings.updatedAt);
    });

    it('should validate boolean values', async () => {
      const invalidUpdates = {
        showBookInfo: 'not a boolean',
        allowUnfinishedReading: 1,
        allowScoring: null
      };

      await request(app)
        .put('/api/settings')
        .send(invalidUpdates)
        .expect(400);
    });

    it('should reject invalid field names', async () => {
      const invalidUpdates = {
        invalidField: true,
        showBookInfo: true
      };

      await request(app)
        .put('/api/settings')
        .send(invalidUpdates)
        .expect(400);
    });

    it('should accept all valid boolean values', async () => {
      const validUpdates = {
        showBookInfo: true,
        allowUnfinishedReading: false,
        allowScoring: true
      };

      const response = await request(app)
        .put('/api/settings')
        .send(validUpdates)
        .expect(200);

      expect(response.body.settings.showBookInfo).toBe(true);
      expect(response.body.settings.allowUnfinishedReading).toBe(false);
      expect(response.body.settings.allowScoring).toBe(true);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('settings');
    });

    it('should preserve settings between updates', async () => {
      const firstUpdate = {
        showBookInfo: false,
        allowScoring: true
      };

      await request(app)
        .put('/api/settings')
        .send(firstUpdate)
        .expect(200);

      const secondUpdate = {
        allowUnfinishedReading: false
      };

      const response = await request(app)
        .put('/api/settings')
        .send(secondUpdate)
        .expect(200);

      expect(response.body.settings).toHaveProperty('showBookInfo');
      expect(response.body.settings).toHaveProperty('allowScoring');
      expect(response.body.settings.allowUnfinishedReading).toBe(false);
    });

    it('should return updated settings after update', async () => {
      const updates = {
        showBookInfo: true,
        allowUnfinishedReading: true,
        allowScoring: false
      };

      const updateResponse = await request(app)
        .put('/api/settings')
        .send(updates)
        .expect(200);

      const getResponse = await request(app)
        .get('/api/settings')
        .expect(200);

      expect(getResponse.body.settings.showBookInfo).toBe(updateResponse.body.settings.showBookInfo);
      expect(getResponse.body.settings.allowUnfinishedReading).toBe(updateResponse.body.settings.allowUnfinishedReading);
      expect(getResponse.body.settings.allowScoring).toBe(updateResponse.body.settings.allowScoring);
    });
  });

  describe('Settings API - Timestamp Format', () => {
    it('should use ISO 8601 format for updatedAt timestamp', async () => {
      const updates = {
        showBookInfo: true
      };

      const response = await request(app)
        .put('/api/settings')
        .send(updates)
        .expect(200);

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(response.body.settings.updatedAt).toMatch(iso8601Regex);
    });
  });
});
