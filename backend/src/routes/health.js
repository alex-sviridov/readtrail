import express from 'express';

const router = express.Router();

// GET /api/health - Health check
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default router;
