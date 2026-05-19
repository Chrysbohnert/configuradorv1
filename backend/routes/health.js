const { Router } = require('express');
const { query } = require('../db/pool');

const router = Router();

router.get('/', async (_req, res) => {
  const start = Date.now();
  try {
    await query('SELECT 1');
    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime_s: Math.floor(process.uptime()),
      database: { status: 'connected', latency_ms: Date.now() - start },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'error',
      database: { status: 'disconnected', error: err.message },
    });
  }
});

module.exports = router;
