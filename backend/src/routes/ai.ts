import { Router } from 'express';
import { claudeService } from '../services/claude.service.js';
import { cacheService } from '../services/cache.service.js';
import { naverNewsService } from '../services/naver-news.service.js';
import { finnhubService } from '../services/finnhub.service.js';
import { aiLimiter } from '../middleware/rate-limiter.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/market.js';
import type { AISummary, MarketBrief } from '../types/news.js';

const router = Router();

// Get AI summary for a stock
router.get('/summary/:ticker', aiLimiter, async (req, res) => {
  try {
    const ticker = String(req.params.ticker);
    const market = String(req.query.market || '') || (/^\d{6}$/.test(ticker) ? 'KR' : 'US');
    const stockName = String(req.query.name || '') || ticker;

    // Check cache first
    const cached = await cacheService.getAISummary(ticker);
    if (cached) {
      const response: ApiResponse<AISummary> = { success: true, data: cached, cached: true };
      return res.json(response);
    }

    // Fetch recent news for analysis
    let articles;
    if (market === 'KR') {
      articles = await naverNewsService.getStockNews(stockName, ticker, 7);
    } else {
      articles = await finnhubService.getCompanyNews(ticker, 7);
    }

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        error: '분석할 뉴스가 충분하지 않습니다.',
      });
    }

    // Generate AI summary
    const summary = await claudeService.summarizeNews(ticker, stockName, articles);

    // Cache result
    await cacheService.setAISummary(summary);

    const response: ApiResponse<AISummary> = { success: true, data: summary };
    res.json(response);
  } catch (err: any) {
    logger.error('AI summary error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get AI market brief (KR + US key issues summary)
router.get('/market-brief', aiLimiter, async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';

    // Check cache (24-hour TTL) unless force refresh
    if (!forceRefresh) {
      const cached = await cacheService.getMarketBrief();
      if (cached) {
        const response: ApiResponse<MarketBrief> = { success: true, data: cached, cached: true };
        return res.json(response);
      }
    }

    // Fetch market news from both regions in parallel
    const [krArticles, usArticles] = await Promise.allSettled([
      naverNewsService.getMarketNews(),
      finnhubService.getMarketNews(),
    ]);

    const kr = krArticles.status === 'fulfilled' ? krArticles.value : [];
    const us = usArticles.status === 'fulfilled' ? usArticles.value : [];

    if (kr.length === 0 && us.length === 0) {
      return res.status(404).json({ success: false, error: '분석할 뉴스를 가져올 수 없습니다.' });
    }

    const brief = await claudeService.generateMarketBrief(kr, us);
    await cacheService.setMarketBrief(brief);

    const response: ApiResponse<MarketBrief> = { success: true, data: brief };
    res.json(response);
  } catch (err: any) {
    logger.error('Market brief error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
