import { Router } from 'express';
import { config } from '../config.js';
import { kisService } from '../services/kis.service.js';
import { finnhubService } from '../services/finnhub.service.js';
import { twelveDataService } from '../services/twelvedata.service.js';
import { yahooFinanceService } from '../services/yahoo-finance.service.js';
import { cacheService } from '../services/cache.service.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/market.js';
import type { StockQuote, OHLCV } from '../types/stock.js';

const router = Router();

function detectMarket(ticker: string, marketParam?: string): 'KR' | 'US' {
  if (marketParam === 'KR' || marketParam === 'US') return marketParam;
  return /^\d{6}$/.test(ticker) ? 'KR' : 'US';
}

// Search stocks
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const market = req.query.market ? String(req.query.market) : undefined;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    // Search local DB first
    let results = cacheService.searchStocks(q, market);

    // If no local results for US stocks, try Finnhub
    if (results.length === 0 && (!market || market === 'US')) {
      try {
        const finnhubResults = await finnhubService.searchSymbols(q);
        results = finnhubResults;
      } catch {
        logger.warn('Finnhub search failed for query:', q);
      }
    }

    const response: ApiResponse<typeof results> = { success: true, data: results };
    res.json(response);
  } catch (err: any) {
    logger.error('Stock search error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get stock quote
router.get('/:ticker/quote', async (req, res) => {
  try {
    const ticker = String(req.params.ticker);
    const market = detectMarket(ticker, req.query.market ? String(req.query.market) : undefined);

    let quote: StockQuote;
    if (market === 'KR') {
      quote = await kisService.getQuote(ticker);
    } else {
      quote = await finnhubService.getQuote(ticker);
    }

    const response: ApiResponse<StockQuote> = { success: true, data: quote };
    res.json(response);
  } catch (err: any) {
    logger.error('Quote error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get chart data
router.get('/:ticker/chart', async (req, res) => {
  try {
    const ticker = String(req.params.ticker);
    const market = detectMarket(ticker, req.query.market ? String(req.query.market) : undefined);
    const days = parseInt(String(req.query.days || '30'), 10);

    // Check cache
    const cached = cacheService.getPriceCache(ticker, days);
    if (cached) {
      const response: ApiResponse<OHLCV[]> = { success: true, data: cached, cached: true };
      return res.json(response);
    }

    let chart: OHLCV[];
    if (market === 'KR') {
      chart = await kisService.getDailyChart(ticker, days);
    } else {
      try {
        chart = await finnhubService.getDailyChart(ticker, days);
        // Finnhub returns empty array (not 403) for free tier candle limitations
        if (chart.length === 0) throw new Error('No data from Finnhub');
      } catch (finnhubErr: any) {
        const status = finnhubErr?.response?.status;
        if (status === 403 || status === 429 || chart!.length === 0) {
          // Fallback 1: Twelve Data
          if (config.twelveData.apiKey) {
            try {
              logger.warn(`Finnhub chart failed (${status}), trying Twelve Data for ${ticker}`);
              const tdChart = await twelveDataService.getDailyChart(ticker, days);
              if (tdChart.length > 0) { chart = tdChart; return; }
            } catch { /* continue to next fallback */ }
          }
          // Fallback 2: Yahoo Finance (no API key needed)
          logger.warn(`Falling back to Yahoo Finance for ${ticker}`);
          chart = await yahooFinanceService.getDailyChart(ticker, days);
        } else {
          throw finnhubErr;
        }
      }
    }

    // Store in cache
    if (chart.length > 0) {
      cacheService.setPriceCache(ticker, chart);
    }

    const response: ApiResponse<OHLCV[]> = { success: true, data: chart };
    res.json(response);
  } catch (err: any) {
    logger.error('Chart error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
