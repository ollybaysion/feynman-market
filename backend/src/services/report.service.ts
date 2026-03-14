import { getPool } from '../database.js';
import { claudeService } from './claude.service.js';
import { naverNewsService } from './naver-news.service.js';
import { finnhubService } from './finnhub.service.js';
import { logger } from '../utils/logger.js';
import type { MarketReport, MarketReportListItem } from '../types/news.js';

function parseRow(row: any): MarketReport {
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
}

export const reportService = {
  async getReports(page = 1, limit = 20): Promise<{ reports: MarketReportListItem[]; total: number }> {
    const pool = getPool();
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::INTEGER as cnt FROM market_reports');
    const total = countResult.rows[0].cnt;

    const { rows } = await pool.query(
      `SELECT id, date, title,
        kr_analysis::json->>'sentiment' AS "krSentiment",
        us_analysis::json->>'sentiment' AS "usSentiment",
        (kr_analysis::json->>'sentimentScore')::REAL AS "krSentimentScore",
        (us_analysis::json->>'sentimentScore')::REAL AS "usSentimentScore",
        created_at AS "createdAt"
      FROM market_reports
      ORDER BY date DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return { reports: rows, total };
  },

  async getReport(id: number): Promise<MarketReport | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, date, title, indices_snapshot, kr_analysis, us_analysis, sources,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM market_reports WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return null;
    return parseRow(rows[0]);
  },

  async getReportByDate(date: string): Promise<MarketReport | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, date, title, indices_snapshot, kr_analysis, us_analysis, sources,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM market_reports WHERE date = $1`,
      [date]
    );
    if (rows.length === 0) return null;
    return parseRow(rows[0]);
  },

  async generateReport(): Promise<MarketReport> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.getReportByDate(today);
    if (existing) return existing;

    const [krResult, usResult] = await Promise.allSettled([
      naverNewsService.getMarketNews(),
      finnhubService.getMarketNews(),
    ]);
    const krArticles = krResult.status === 'fulfilled' ? krResult.value : [];
    const usArticles = usResult.status === 'fulfilled' ? usResult.value : [];

    if (krArticles.length === 0 && usArticles.length === 0) {
      throw new Error('분석할 뉴스를 가져올 수 없습니다.');
    }

    const brief = await claudeService.generateMarketBrief(krArticles, usArticles);
    const title = await claudeService.generateReportTitle(brief.kr, brief.us);

    const pool = getPool();
    const indicesResult = await pool.query(
      'SELECT symbol, name, value, change, change_percent AS "changePercent" FROM market_indices'
    );
    const indices = indicesResult.rows;

    const sources = [
      ...krArticles.slice(0, 10).map(a => ({ title: a.title, url: a.url, source: a.source || '', market: 'KR' as const })),
      ...usArticles.slice(0, 10).map(a => ({ title: a.title, url: a.url, source: a.source || '', market: 'US' as const })),
    ];

    const ts = Math.floor(Date.now() / 1000);
    const { rows } = await pool.query(
      `INSERT INTO market_reports (date, title, indices_snapshot, kr_analysis, us_analysis, sources, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       RETURNING id`,
      [today, title, JSON.stringify(indices), JSON.stringify(brief.kr), JSON.stringify(brief.us), JSON.stringify(sources), ts]
    );

    logger.info(`Market report generated for ${today}: ${title}`);

    return {
      id: rows[0].id,
      date: today,
      title,
      indicesSnapshot: indices,
      krAnalysis: brief.kr,
      usAnalysis: brief.us,
      sources,
    };
  },

  async getTrend(days = 30): Promise<{ date: string; krScore: number; usScore: number }[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT date,
        (kr_analysis::json->>'sentimentScore')::REAL AS "krScore",
        (us_analysis::json->>'sentimentScore')::REAL AS "usScore"
      FROM market_reports
      ORDER BY date DESC
      LIMIT $1`,
      [days]
    );
    return rows;
  },
};
