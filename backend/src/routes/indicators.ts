import { Router } from 'express';
import { indicatorsService } from '../services/indicators.service.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/market.js';
import type { IndicatorQuote, IndicatorChart } from '../services/indicators.service.js';

const router = Router();

// In-memory cache for quotes (refreshes every 10 minutes)
let quotesCache: { data: IndicatorQuote[]; cachedAt: number } | null = null;
const QUOTES_TTL = 30 * 60 * 1000; // 30 minutes

// In-memory cache for charts (refreshes every 1 hour)
const chartCache = new Map<string, { data: IndicatorChart; cachedAt: number }>();
const CHART_TTL = 60 * 60 * 1000; // 1 hour

// GET /api/indicators - all indicator quotes
router.get('/', async (_req, res) => {
  try {
    if (quotesCache && Date.now() - quotesCache.cachedAt < QUOTES_TTL) {
      const response: ApiResponse<IndicatorQuote[]> = { success: true, data: quotesCache.data, cached: true };
      return res.json(response);
    }

    const quotes = await indicatorsService.getAllQuotes();
    quotesCache = { data: quotes, cachedAt: Date.now() };

    const response: ApiResponse<IndicatorQuote[]> = { success: true, data: quotes };
    res.json(response);
  } catch (err: any) {
    logger.error('Indicators quotes error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/indicators/chart?symbol=USD/KRW&days=90
router.get('/chart', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '');
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol query parameter is required' });
    }
    const days = parseInt(String(req.query.days || '90'), 10);
    const cacheKey = `${symbol}_${days}`;

    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CHART_TTL) {
      const response: ApiResponse<IndicatorChart> = { success: true, data: cached.data, cached: true };
      return res.json(response);
    }

    const chart = await indicatorsService.getChart(symbol, days);
    if (!chart) {
      return res.status(404).json({ success: false, error: 'Indicator not found' });
    }

    chartCache.set(cacheKey, { data: chart, cachedAt: Date.now() });

    const response: ApiResponse<IndicatorChart> = { success: true, data: chart };
    res.json(response);
  } catch (err: any) {
    logger.error('Indicator chart error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
