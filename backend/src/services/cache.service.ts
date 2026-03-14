import { getPool } from '../database.js';
import type { OHLCV } from '../types/stock.js';
import type { NewsArticle, AISummary, MarketBrief } from '../types/news.js';

const TTL = {
  price: 60,           // 1 minute during market hours
  priceOff: 86400,     // 24 hours when market closed
  news: 21600,         // 6 hours
  aiSummary: 86400,    // 24 hours
  marketBrief: 86400,  // 24 hours
};

function now() {
  return Math.floor(Date.now() / 1000);
}

export const cacheService = {
  // --- Price Cache ---
  async getPriceCache(ticker: string, days: number): Promise<OHLCV[] | null> {
    const pool = getPool();
    const cutoff = now() - TTL.price;
    const { rows } = await pool.query(
      `SELECT date, open, high, low, close, volume
       FROM price_cache
       WHERE ticker = $1 AND cached_at > $2
       ORDER BY date ASC
       LIMIT $3`,
      [ticker, cutoff, days]
    );
    return rows.length > 0 ? rows : null;
  },

  async setPriceCache(ticker: string, data: OHLCV[]): Promise<void> {
    const pool = getPool();
    const ts = now();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const d of data) {
        await client.query(
          `INSERT INTO price_cache (ticker, date, open, high, low, close, volume, cached_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (ticker, date) DO UPDATE SET
             open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
             close = EXCLUDED.close, volume = EXCLUDED.volume, cached_at = EXCLUDED.cached_at`,
          [ticker, d.date, d.open, d.high, d.low, d.close, d.volume, ts]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // --- News Cache ---
  async getNewsCache(ticker: string, _days: number): Promise<NewsArticle[] | null> {
    const pool = getPool();
    const cutoff = now() - TTL.news;
    const { rows } = await pool.query(
      `SELECT id, ticker, title, url, source, published_at AS "publishedAt", description, market
       FROM news_cache
       WHERE ticker = $1 AND cached_at > $2
       ORDER BY published_at DESC
       LIMIT 100`,
      [ticker, cutoff]
    );
    return rows.length > 0 ? rows : null;
  },

  async setNewsCache(ticker: string, articles: NewsArticle[]): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM news_cache WHERE ticker = $1', [ticker]);
      const ts = now();
      for (const a of articles) {
        await client.query(
          `INSERT INTO news_cache (ticker, title, url, source, published_at, description, market, cached_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [ticker, a.title, a.url, a.source || null, a.publishedAt, a.description || null, a.market, ts]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getLatestNewsCache(market: string, limit: number): Promise<NewsArticle[] | null> {
    const pool = getPool();
    const cutoff = now() - TTL.news;
    const { rows } = await pool.query(
      `SELECT id, ticker, title, url, source, published_at AS "publishedAt", description, market
       FROM news_cache
       WHERE market = $1 AND cached_at > $2
       ORDER BY published_at DESC
       LIMIT $3`,
      [market, cutoff, limit]
    );
    return rows.length > 0 ? rows : null;
  },

  // --- AI Summary Cache ---
  async getAISummary(ticker: string): Promise<AISummary | null> {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      `SELECT id, ticker, summary_date AS "summaryDate", summary_text AS "summaryText",
              sentiment, sentiment_score AS "sentimentScore", created_at AS "createdAt"
       FROM ai_summaries
       WHERE ticker = $1 AND summary_date = $2`,
      [ticker, today]
    );
    return rows[0] || null;
  },

  async setAISummary(summary: AISummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO ai_summaries (ticker, summary_date, summary_text, sentiment, sentiment_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ticker, summary_date) DO UPDATE SET
         summary_text = EXCLUDED.summary_text, sentiment = EXCLUDED.sentiment,
         sentiment_score = EXCLUDED.sentiment_score, created_at = EXCLUDED.created_at`,
      [summary.ticker, summary.summaryDate, summary.summaryText, summary.sentiment, summary.sentimentScore, now()]
    );
  },

  // --- Market Brief Cache ---
  async getMarketBrief(): Promise<MarketBrief | null> {
    const pool = getPool();
    const cutoff = now() - TTL.marketBrief;
    const { rows } = await pool.query(
      `SELECT summary_text AS "summaryText", created_at AS "createdAt"
       FROM ai_summaries
       WHERE ticker = '__MARKET_BRIEF__' AND created_at > $1
       ORDER BY created_at DESC LIMIT 1`,
      [cutoff]
    );
    if (rows.length === 0) return null;
    try {
      return JSON.parse(rows[0].summaryText) as MarketBrief;
    } catch {
      return null;
    }
  },

  async setMarketBrief(brief: MarketBrief): Promise<void> {
    const pool = getPool();
    const json = JSON.stringify(brief);
    await pool.query(
      `INSERT INTO ai_summaries (ticker, summary_date, summary_text, sentiment, sentiment_score, created_at)
       VALUES ('__MARKET_BRIEF__', $1, $2, 'neutral', 50, $3)
       ON CONFLICT (ticker, summary_date) DO UPDATE SET
         summary_text = EXCLUDED.summary_text, created_at = EXCLUDED.created_at`,
      [brief.date, json, now()]
    );
  },

  // --- Stock Master ---
  async getStocks(market?: string): Promise<{ ticker: string; name: string; nameEn: string; market: string }[]> {
    const pool = getPool();
    if (market) {
      const { rows } = await pool.query(
        'SELECT ticker, name, name_en AS "nameEn", market FROM stocks WHERE market IN ($1, $2)',
        [market === 'KR' ? 'KOSPI' : 'NYSE', market === 'KR' ? 'KOSDAQ' : 'NASDAQ']
      );
      return rows;
    }
    const { rows } = await pool.query('SELECT ticker, name, name_en AS "nameEn", market FROM stocks');
    return rows;
  },

  async searchStocks(query: string, market?: string) {
    const pool = getPool();
    const likeQuery = `%${query}%`;
    if (market) {
      const markets = market === 'KR' ? ['KOSPI', 'KOSDAQ'] : ['NYSE', 'NASDAQ'];
      const { rows } = await pool.query(
        `SELECT ticker, name, name_en AS "nameEn", market FROM stocks
         WHERE (ticker ILIKE $1 OR name ILIKE $1 OR name_en ILIKE $1)
         AND market IN ($2, $3)
         LIMIT 20`,
        [likeQuery, markets[0], markets[1]]
      );
      return rows;
    }
    const { rows } = await pool.query(
      `SELECT ticker, name, name_en AS "nameEn", market FROM stocks
       WHERE ticker ILIKE $1 OR name ILIKE $1 OR name_en ILIKE $1
       LIMIT 20`,
      [likeQuery]
    );
    return rows;
  },

  async upsertStock(stock: { ticker: string; name: string; nameEn?: string; market: string; sector?: string }): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO stocks (ticker, name, name_en, market, sector, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ticker) DO UPDATE SET
         name = EXCLUDED.name, name_en = EXCLUDED.name_en,
         market = EXCLUDED.market, sector = EXCLUDED.sector, updated_at = EXCLUDED.updated_at`,
      [stock.ticker, stock.name, stock.nameEn || null, stock.market, stock.sector || null, now()]
    );
  },
};
