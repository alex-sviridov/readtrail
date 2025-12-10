import express from 'express';
import { settingsOps } from '../db-memory.js';
import { validateSettings } from '../utils/validation.js';

const router = express.Router();

// GET /api/settings - Get settings
router.get('/', (req, res, next) => {
  try {
    const settings = settingsOps.get(req.userId);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Update settings
router.put('/', (req, res, next) => {
  try {
    const updates = req.body;

    // Validate settings
    validateSettings(updates);

    // Update settings
    const settings = settingsOps.update(req.userId, updates);

    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;
