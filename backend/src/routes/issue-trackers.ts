import { Router } from 'express';
import { issueTrackerService } from '../services/issue-tracker.service.js';
import { aiLimiter } from '../middleware/rate-limiter.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/market.js';

const router = Router();

// List all trackers
router.get('/', async (req, res) => {
  try {
    const status = req.query.status as 'active' | 'archived' | undefined;
    const trackers = await issueTrackerService.list(status);
    const response: ApiResponse<typeof trackers> = { success: true, data: trackers };
    res.json(response);
  } catch (err: any) {
    logger.error('Issue trackers list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create tracker
router.post('/', async (req, res) => {
  try {
    const { title, keywords, description } = req.body;
    if (!title || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ success: false, error: '제목과 키워드를 입력해주세요.' });
    }
    const tracker = await issueTrackerService.create(title, keywords, description || '');
    const response: ApiResponse<typeof tracker> = { success: true, data: tracker };
    res.status(201).json(response);
  } catch (err: any) {
    logger.error('Issue tracker create error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get tracker detail with entries
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const detail = await issueTrackerService.getDetail(id, page);
    if (!detail) {
      return res.status(404).json({ success: false, error: '이슈 트래커를 찾을 수 없습니다.' });
    }
    const response: ApiResponse<typeof detail> = { success: true, data: detail };
    res.json(response);
  } catch (err: any) {
    logger.error('Issue tracker detail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Track (generate new entry)
router.post('/:id/track', aiLimiter, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const entry = await issueTrackerService.track(id);
    const response: ApiResponse<typeof entry> = { success: true, data: entry };
    res.status(201).json(response);
  } catch (err: any) {
    logger.error('Issue track error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update status (archive/activate)
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body;
    if (!['active', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const ok = await issueTrackerService.updateStatus(id, status);
    if (!ok) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Issue tracker status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete tracker
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const ok = await issueTrackerService.delete(id);
    if (!ok) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Issue tracker delete error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
