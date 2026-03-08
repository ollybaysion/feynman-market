import { getDb } from '../database.js';
import { claudeService } from './claude.service.js';
import { naverNewsService } from './naver-news.service.js';
import { logger } from '../utils/logger.js';
import type { NewsArticle, IssueTracker, IssueEntry, IssueTrackerDetail } from '../types/news.js';

export const issueTrackerService = {
  // Create a new tracker
  create(title: string, keywords: string[], description = ''): IssueTracker {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO issue_trackers (title, keywords, description, status, created_at)
      VALUES (?, ?, ?, 'active', unixepoch())
    `).run(title, JSON.stringify(keywords), description);

    return {
      id: Number(result.lastInsertRowid),
      title,
      keywords,
      description,
      status: 'active',
      createdAt: Math.floor(Date.now() / 1000),
    };
  },

  // List all trackers
  list(status?: 'active' | 'archived'): (IssueTracker & { latestEntry?: string; entryCount: number })[] {
    const db = getDb();
    const where = status ? 'WHERE t.status = ?' : '';
    const params = status ? [status] : [];
    const rows = db.prepare(`
      SELECT t.id, t.title, t.keywords, t.description, t.status, t.created_at as createdAt,
        COUNT(e.id) as entryCount,
        MAX(e.date) as latestEntry
      FROM issue_trackers t
      LEFT JOIN issue_entries e ON e.tracker_id = t.id
      ${where}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all(...params) as any[];

    return rows.map(r => ({
      ...r,
      keywords: JSON.parse(r.keywords),
    }));
  },

  // Get tracker with entries
  getDetail(id: number, page = 1, limit = 20): IssueTrackerDetail | null {
    const db = getDb();
    const tracker = db.prepare(`
      SELECT id, title, keywords, description, status, created_at as createdAt
      FROM issue_trackers WHERE id = ?
    `).get(id) as any;
    if (!tracker) return null;

    const totalEntries = (db.prepare(
      'SELECT COUNT(*) as cnt FROM issue_entries WHERE tracker_id = ?'
    ).get(id) as any).cnt;

    const offset = (page - 1) * limit;
    const entries = db.prepare(`
      SELECT id, tracker_id as trackerId, date, summary, sentiment, sentiment_score as sentimentScore,
        articles, created_at as createdAt
      FROM issue_entries WHERE tracker_id = ?
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `).all(id, limit, offset) as any[];

    return {
      id: tracker.id,
      title: tracker.title,
      keywords: JSON.parse(tracker.keywords),
      description: tracker.description,
      status: tracker.status,
      createdAt: tracker.createdAt,
      entries: entries.map(e => ({
        ...e,
        articles: JSON.parse(e.articles || '[]'),
      })),
      totalEntries,
    };
  },

  // Update tracker status
  updateStatus(id: number, status: 'active' | 'archived'): boolean {
    const db = getDb();
    const result = db.prepare('UPDATE issue_trackers SET status = ? WHERE id = ?').run(status, id);
    return result.changes > 0;
  },

  // Delete tracker
  delete(id: number): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM issue_trackers WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // Fetch news and generate a new entry for a tracker
  async track(id: number): Promise<IssueEntry> {
    const db = getDb();
    const tracker = db.prepare(
      'SELECT id, title, keywords, description FROM issue_trackers WHERE id = ?'
    ).get(id) as any;
    if (!tracker) throw new Error('Tracker not found');

    const keywords: string[] = JSON.parse(tracker.keywords);
    const today = new Date().toISOString().split('T')[0];

    // Check if already tracked today
    const existing = db.prepare(
      'SELECT id FROM issue_entries WHERE tracker_id = ? AND date = ?'
    ).get(id, today) as any;
    if (existing) throw new Error('이미 오늘의 분석이 존재합니다.');

    // Get previous entry for context
    const prevEntry = db.prepare(
      'SELECT summary FROM issue_entries WHERE tracker_id = ? ORDER BY date DESC LIMIT 1'
    ).get(id) as any;

    // Search news using keywords
    const searchQueries = keywords.map(k => naverNewsService.searchNews(k, 15));
    const results = await Promise.allSettled(searchQueries);

    const allArticles = results
      .filter((r): r is PromiseFulfilledResult<NewsArticle[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueArticles = allArticles.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    if (uniqueArticles.length === 0) {
      throw new Error('관련 뉴스를 찾을 수 없습니다.');
    }

    // AI analysis
    const analysis = await claudeService.analyzeIssue(
      tracker.title,
      keywords,
      uniqueArticles,
      prevEntry?.summary,
    );

    // Save entry
    const sourcesJson = JSON.stringify(
      uniqueArticles.slice(0, 10).map(a => ({
        title: a.title,
        url: a.url,
        source: a.source || '',
        publishedAt: a.publishedAt,
      }))
    );

    const result = db.prepare(`
      INSERT INTO issue_entries (tracker_id, date, summary, sentiment, sentiment_score, articles, created_at)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch())
    `).run(id, today, analysis.summary, analysis.sentiment, analysis.sentimentScore, sourcesJson);

    logger.info(`Issue tracked: [${tracker.title}] ${today} - ${analysis.sentiment}`);

    return {
      id: Number(result.lastInsertRowid),
      trackerId: id,
      date: today,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      articles: JSON.parse(sourcesJson),
      createdAt: Math.floor(Date.now() / 1000),
    };
  },
};
