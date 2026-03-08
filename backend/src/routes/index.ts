import { Router } from 'express';
import stocksRouter from './stocks.js';
import newsRouter from './news.js';
import marketRouter from './market.js';
import aiRouter from './ai.js';
import sseRouter from './sse.js';
import reportsRouter from './reports.js';
import issueTrackersRouter from './issue-trackers.js';

const router = Router();

router.use('/stocks', stocksRouter);
router.use('/news', newsRouter);
router.use('/market', marketRouter);
router.use('/ai', aiRouter);
router.use('/sse', sseRouter);
router.use('/reports', reportsRouter);
router.use('/issues', issueTrackersRouter);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
