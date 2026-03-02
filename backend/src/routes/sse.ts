import { Router } from 'express';
import { yahooFinanceService } from '../services/yahoo-finance.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// SSE endpoint for real-time market index updates
router.get('/market', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write('data: {"type":"connected"}\n\n');

  const fetchAndSend = async () => {
    try {
      const indices = await yahooFinanceService.getMarketIndices();
      if (indices.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'indices', data: indices })}\n\n`);
      }
    } catch (err) {
      logger.warn('SSE fetch error:', err);
    }
  };

  fetchAndSend();
  const interval = setInterval(fetchAndSend, 15_000);

  req.on('close', () => {
    clearInterval(interval);
    logger.debug('SSE client disconnected');
  });
});

export default router;
