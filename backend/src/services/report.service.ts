import { getDb } from '../database.js';
import { claudeService } from './claude.service.js';
import { naverNewsService } from './naver-news.service.js';
import { finnhubService } from './finnhub.service.js';
import { logger } from '../utils/logger.js';
import type { MarketReport, MarketReportListItem } from '../types/news.js';

export const reportService = {
  // Get list of reports with pagination
  getReports(page = 1, limit = 20): { reports: MarketReportListItem[]; total: number } {
    const db = getDb();
    const offset = (page - 1) * limit;
    const total = (db.prepare('SELECT COUNT(*) as cnt FROM market_reports').get() as any).cnt;
    const rows = db.prepare(`
      SELECT id, date, title,
        json_extract(kr_analysis, '$.sentiment') as krSentiment,
        json_extract(us_analysis, '$.sentiment') as usSentiment,
        json_extract(kr_analysis, '$.sentimentScore') as krSentimentScore,
        json_extract(us_analysis, '$.sentimentScore') as usSentimentScore,
        created_at as createdAt
      FROM market_reports
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as MarketReportListItem[];
    return { reports: rows, total };
  },

  // Get single report by ID
  getReport(id: number): MarketReport | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT id, date, title, indices_snapshot, kr_analysis, us_analysis, sources, created_at as createdAt, updated_at as updatedAt
      FROM market_reports WHERE id = ?
    `).get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      date: row.date,
      title: row.title,
      indicesSnapshot: JSON.parse(row.indices_snapshot || '[]'),
      krAnalysis: JSON.parse(row.kr_analysis || '{}'),
      usAnalysis: JSON.parse(row.us_analysis || '{}'),
      sources: JSON.parse(row.sources || '[]'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  // Get report by date
  getReportByDate(date: string): MarketReport | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT id, date, title, indices_snapshot, kr_analysis, us_analysis, sources, created_at as createdAt, updated_at as updatedAt
      FROM market_reports WHERE date = ?
    `).get(date) as any;
    if (!row) return null;
    return {
      id: row.id,
      date: row.date,
      title: row.title,
      indicesSnapshot: JSON.parse(row.indices_snapshot || '[]'),
      krAnalysis: JSON.parse(row.kr_analysis || '{}'),
      usAnalysis: JSON.parse(row.us_analysis || '{}'),
      sources: JSON.parse(row.sources || '[]'),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  // Generate and save a new report
  async generateReport(): Promise<MarketReport> {
    const today = new Date().toISOString().split('T')[0];

    // Check if report already exists for today
    const existing = this.getReportByDate(today);
    if (existing) return existing;

    // Fetch news
    const [krResult, usResult] = await Promise.allSettled([
      naverNewsService.getMarketNews(),
      finnhubService.getMarketNews(),
    ]);
    const krArticles = krResult.status === 'fulfilled' ? krResult.value : [];
    const usArticles = usResult.status === 'fulfilled' ? usResult.value : [];

    if (krArticles.length === 0 && usArticles.length === 0) {
      throw new Error('분석할 뉴스를 가져올 수 없습니다.');
    }

    // Generate AI analysis
    const brief = await claudeService.generateMarketBrief(krArticles, usArticles);

    // Generate title
    const title = await claudeService.generateReportTitle(brief.kr, brief.us);

    // Get current market indices snapshot
    const db = getDb();
    const indices = db.prepare(`
      SELECT symbol, name, value, change, change_percent as changePercent FROM market_indices
    `).all() as any[];

    // Collect source articles
    const sources = [
      ...krArticles.slice(0, 10).map(a => ({ title: a.title, url: a.url, source: a.source || '', market: 'KR' as const })),
      ...usArticles.slice(0, 10).map(a => ({ title: a.title, url: a.url, source: a.source || '', market: 'US' as const })),
    ];

    // Save to DB
    const result = db.prepare(`
      INSERT INTO market_reports (date, title, indices_snapshot, kr_analysis, us_analysis, sources, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `).run(
      today,
      title,
      JSON.stringify(indices),
      JSON.stringify(brief.kr),
      JSON.stringify(brief.us),
      JSON.stringify(sources),
    );

    logger.info(`Market report generated for ${today}: ${title}`);

    return {
      id: Number(result.lastInsertRowid),
      date: today,
      title,
      indicesSnapshot: indices,
      krAnalysis: brief.kr,
      usAnalysis: brief.us,
      sources,
    };
  },

  // Get sentiment trend data
  getTrend(days = 30): { date: string; krScore: number; usScore: number }[] {
    const db = getDb();
    return db.prepare(`
      SELECT date,
        json_extract(kr_analysis, '$.sentimentScore') as krScore,
        json_extract(us_analysis, '$.sentimentScore') as usScore
      FROM market_reports
      ORDER BY date DESC
      LIMIT ?
    `).all(days) as any[];
  },
};
