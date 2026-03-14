import { Router } from 'express';
import { reportService } from '../services/report.service.js';
import { aiLimiter } from '../middleware/rate-limiter.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/market.js';
import type { MarketReport, MarketReportListItem } from '../types/news.js';

const router = Router();

// Get sentiment trend (must be before /:id to avoid matching "trend" as an id)
router.get('/trend/sentiment', async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days || '30'), 10)));
    const trend = await reportService.getTrend(days);
    const response: ApiResponse<typeof trend> = { success: true, data: trend };
    res.json(response);
  } catch (err: any) {
    logger.error('Trend error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List reports with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const result = await reportService.getReports(page, limit);
    const response: ApiResponse<{ reports: MarketReportListItem[]; total: number; page: number; limit: number }> = {
      success: true,
      data: { ...result, page, limit },
    };
    res.json(response);
  } catch (err: any) {
    logger.error('Reports list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate new report (rate limited)
router.post('/generate', aiLimiter, async (_req, res) => {
  try {
    const report = await reportService.generateReport();
    const response: ApiResponse<MarketReport> = { success: true, data: report };
    res.status(201).json(response);
  } catch (err: any) {
    logger.error('Report generation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single report (after specific routes to avoid conflicts)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const report = await reportService.getReport(id);
    if (!report) {
      return res.status(404).json({ success: false, error: '리포트를 찾을 수 없습니다.' });
    }
    const response: ApiResponse<MarketReport> = { success: true, data: report };
    res.json(response);
  } catch (err: any) {
    logger.error('Report detail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
