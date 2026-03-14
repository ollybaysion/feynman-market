import { Router } from 'express';
import { naverNewsService } from '../services/naver-news.service.js';
import { finnhubService } from '../services/finnhub.service.js';
import { cacheService } from '../services/cache.service.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/market.js';
import type { NewsArticle } from '../types/news.js';

const router = Router();

// Get latest market news
router.get('/latest', async (req, res) => {
  try {
    const market = String(req.query.market || 'KR');
    const limit = parseInt(String(req.query.limit || '20'), 10);

    // Check cache
    const cached = await cacheService.getLatestNewsCache(market, limit);
    if (cached) {
      const response: ApiResponse<NewsArticle[]> = { success: true, data: cached, cached: true };
      return res.json(response);
    }

    let articles: NewsArticle[];
    if (market === 'KR') {
      articles = await naverNewsService.getMarketNews();
    } else {
      articles = await finnhubService.getMarketNews();
    }

    const limited = articles.slice(0, limit);

    const response: ApiResponse<NewsArticle[]> = { success: true, data: limited };
    res.json(response);
  } catch (err: any) {
    logger.error('Latest news error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get news for specific stock
router.get('/stock/:ticker', async (req, res) => {
  try {
    const ticker = String(req.params.ticker);
    const days = parseInt(String(req.query.days || '30'), 10);
    const market = String(req.query.market || '') || (/^\d{6}$/.test(ticker) ? 'KR' : 'US');

    // Check cache
    const cached = await cacheService.getNewsCache(ticker, days);
    if (cached) {
      const response: ApiResponse<NewsArticle[]> = { success: true, data: cached, cached: true };
      return res.json(response);
    }

    let articles: NewsArticle[];
    if (market === 'KR') {
      // For Korean stocks, we need the stock name to search news
      const stockName = String(req.query.name || '') || ticker;
      articles = await naverNewsService.getStockNews(stockName, ticker, days);
    } else {
      articles = await finnhubService.getCompanyNews(ticker, days);
    }

    // Cache results
    if (articles.length > 0) {
      await cacheService.setNewsCache(ticker, articles);
    }

    const response: ApiResponse<NewsArticle[]> = { success: true, data: articles };
    res.json(response);
  } catch (err: any) {
    logger.error('Stock news error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
