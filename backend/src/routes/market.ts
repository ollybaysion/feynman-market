import { Router } from 'express';
import { yahooFinanceService } from '../services/yahoo-finance.service.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/market.js';
import type { MarketIndex } from '../types/stock.js';

const router = Router();

// Get market indices (KOSPI, KOSDAQ, S&P500, NASDAQ)
router.get('/indices', async (_req, res) => {
  try {
    const indices = await yahooFinanceService.getMarketIndices();
    const response: ApiResponse<MarketIndex[]> = { success: true, data: indices };
    res.json(response);
  } catch (err: any) {
    logger.error('Market indices error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
