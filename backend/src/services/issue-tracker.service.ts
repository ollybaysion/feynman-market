import { getPool } from '../database.js';
import { claudeService } from './claude.service.js';
import { naverNewsService } from './naver-news.service.js';
import { logger } from '../utils/logger.js';
import type { NewsArticle, IssueTracker, IssueEntry, IssueTrackerDetail } from '../types/news.js';

export const issueTrackerService = {
  async create(title: string, keywords: string[], description = ''): Promise<IssueTracker> {
    const pool = getPool();
    const ts = Math.floor(Date.now() / 1000);
    const { rows } = await pool.query(
      `INSERT INTO issue_trackers (title, keywords, description, status, created_at)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING id`,
      [title, JSON.stringify(keywords), description, ts]
    );
    return {
      id: rows[0].id,
      title,
      keywords,
      description,
      status: 'active',
      createdAt: ts,
    };
  },

  async list(status?: 'active' | 'archived'): Promise<(IssueTracker & { latestEntry?: string; entryCount: number })[]> {
    const pool = getPool();
    let query = `
      SELECT t.id, t.title, t.keywords, t.description, t.status, t.created_at AS "createdAt",
        COUNT(e.id)::INTEGER AS "entryCount",
        MAX(e.date) AS "latestEntry"
      FROM issue_trackers t
      LEFT JOIN issue_entries e ON e.tracker_id = t.id
    `;
    const params: any[] = [];
    if (status) {
      query += ' WHERE t.status = $1';
      params.push(status);
    }
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    const { rows } = await pool.query(query, params);
    return rows.map((r: any) => ({
      ...r,
      keywords: JSON.parse(r.keywords),
    }));
  },

  async getDetail(id: number, page = 1, limit = 20): Promise<IssueTrackerDetail | null> {
    const pool = getPool();
    const trackerResult = await pool.query(
      `SELECT id, title, keywords, description, status, created_at AS "createdAt"
       FROM issue_trackers WHERE id = $1`,
      [id]
    );
    if (trackerResult.rows.length === 0) return null;
    const tracker = trackerResult.rows[0];

    const countResult = await pool.query(
      'SELECT COUNT(*)::INTEGER AS cnt FROM issue_entries WHERE tracker_id = $1',
      [id]
    );
    const totalEntries = countResult.rows[0].cnt;

    const offset = (page - 1) * limit;
    const entriesResult = await pool.query(
      `SELECT id, tracker_id AS "trackerId", date, summary, sentiment,
              sentiment_score AS "sentimentScore", articles, created_at AS "createdAt"
       FROM issue_entries WHERE tracker_id = $1
       ORDER BY date DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    return {
      id: tracker.id,
      title: tracker.title,
      keywords: JSON.parse(tracker.keywords),
      description: tracker.description,
      status: tracker.status,
      createdAt: tracker.createdAt,
      entries: entriesResult.rows.map((e: any) => ({
        ...e,
        articles: JSON.parse(e.articles || '[]'),
      })),
      totalEntries,
    };
  },

  async updateStatus(id: number, status: 'active' | 'archived'): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('UPDATE issue_trackers SET status = $1 WHERE id = $2', [status, id]);
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM issue_trackers WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async track(id: number): Promise<IssueEntry> {
    const pool = getPool();
    const trackerResult = await pool.query(
      'SELECT id, title, keywords, description FROM issue_trackers WHERE id = $1',
      [id]
    );
    if (trackerResult.rows.length === 0) throw new Error('Tracker not found');
    const tracker = trackerResult.rows[0];

    const keywords: string[] = JSON.parse(tracker.keywords);
    const today = new Date().toISOString().split('T')[0];

    // Check if already tracked today
    const existingResult = await pool.query(
      'SELECT id FROM issue_entries WHERE tracker_id = $1 AND date = $2',
      [id, today]
    );
    if (existingResult.rows.length > 0) throw new Error('이미 오늘의 분석이 존재합니다.');

    // Get previous entry for context
    const prevResult = await pool.query(
      'SELECT summary FROM issue_entries WHERE tracker_id = $1 ORDER BY date DESC LIMIT 1',
      [id]
    );
    const prevEntry = prevResult.rows[0];

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

    const ts = Math.floor(Date.now() / 1000);
    const { rows } = await pool.query(
      `INSERT INTO issue_entries (tracker_id, date, summary, sentiment, sentiment_score, articles, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [id, today, analysis.summary, analysis.sentiment, analysis.sentimentScore, sourcesJson, ts]
    );

    logger.info(`Issue tracked: [${tracker.title}] ${today} - ${analysis.sentiment}`);

    return {
      id: rows[0].id,
      trackerId: id,
      date: today,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      articles: JSON.parse(sourcesJson),
      createdAt: ts,
    };
  },
};
