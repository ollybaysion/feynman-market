import { getDb } from '../database.js';
import type { OHLCV } from '../types/stock.js';
import type { NewsArticle, AISummary, MarketBrief } from '../types/news.js';

const TTL = {
  price: 60,           // 1 minute during market hours
  priceOff: 86400,     // 24 hours when market closed
  news: 21600,         // 6 hours
  aiSummary: 86400,    // 24 hours
  marketBrief: 10800,  // 3 hours
};

function now() {
  return Math.floor(Date.now() / 1000);
}

export const cacheService = {
  // --- Price Cache ---
  getPriceCache(ticker: string, days: number): OHLCV[] | null {
    const db = getDb();
    const cutoff = now() - TTL.price;
    const rows = db.prepare(`
      SELECT date, open, high, low, close, volume
      FROM price_cache
      WHERE ticker = ? AND cached_at > ?
      ORDER BY date ASC
      LIMIT ?
    `).all(ticker, cutoff, days) as OHLCV[];

    return rows.length > 0 ? rows : null;
  },

  setPriceCache(ticker: string, data: OHLCV[]) {
    const db = getDb();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO price_cache (ticker, date, open, high, low, close, volume, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction(() => {
      const ts = now();
      for (const d of data) {
        insert.run(ticker, d.date, d.open, d.high, d.low, d.close, d.volume, ts);
      }
    });
    tx();
  },

  // --- News Cache ---
  getNewsCache(ticker: string, days: number): NewsArticle[] | null {
    const db = getDb();
    const cutoff = now() - TTL.news;
    const rows = db.prepare(`
      SELECT id, ticker, title, url, source, published_at as publishedAt, description, market
      FROM news_cache
      WHERE ticker = ? AND cached_at > ?
      ORDER BY published_at DESC
      LIMIT 100
    `).all(ticker, cutoff) as NewsArticle[];

    return rows.length > 0 ? rows : null;
  },

  setNewsCache(ticker: string, articles: NewsArticle[]) {
    const db = getDb();
    // Clear old entries for this ticker
    db.prepare('DELETE FROM news_cache WHERE ticker = ?').run(ticker);

    const insert = db.prepare(`
      INSERT INTO news_cache (ticker, title, url, source, published_at, description, market, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction(() => {
      const ts = now();
      for (const a of articles) {
        insert.run(ticker, a.title, a.url, a.source || null, a.publishedAt, a.description || null, a.market, ts);
      }
    });
    tx();
  },

  getLatestNewsCache(market: string, limit: number): NewsArticle[] | null {
    const db = getDb();
    const cutoff = now() - TTL.news;
    const rows = db.prepare(`
      SELECT id, ticker, title, url, source, published_at as publishedAt, description, market
      FROM news_cache
      WHERE market = ? AND cached_at > ?
      ORDER BY published_at DESC
      LIMIT ?
    `).all(market, cutoff, limit) as NewsArticle[];

    return rows.length > 0 ? rows : null;
  },

  // --- AI Summary Cache ---
  getAISummary(ticker: string): AISummary | null {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare(`
      SELECT id, ticker, summary_date as summaryDate, summary_text as summaryText,
             sentiment, sentiment_score as sentimentScore, created_at as createdAt
      FROM ai_summaries
      WHERE ticker = ? AND summary_date = ?
    `).get(ticker, today) as AISummary | undefined;

    return row || null;
  },

  setAISummary(summary: AISummary) {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO ai_summaries (ticker, summary_date, summary_text, sentiment, sentiment_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(summary.ticker, summary.summaryDate, summary.summaryText, summary.sentiment, summary.sentimentScore, now());
  },

  // --- Market Brief Cache ---
  getMarketBrief(): MarketBrief | null {
    const db = getDb();
    const cutoff = now() - TTL.marketBrief;
    const row = db.prepare(`
      SELECT summary_text as summaryText, created_at as createdAt
      FROM ai_summaries
      WHERE ticker = '__MARKET_BRIEF__' AND created_at > ?
      ORDER BY created_at DESC LIMIT 1
    `).get(cutoff) as { summaryText: string; createdAt: number } | undefined;

    if (!row) return null;
    try {
      return JSON.parse(row.summaryText) as MarketBrief;
    } catch {
      return null;
    }
  },

  setMarketBrief(brief: MarketBrief) {
    const db = getDb();
    const json = JSON.stringify(brief);
    db.prepare(`
      INSERT OR REPLACE INTO ai_summaries (ticker, summary_date, summary_text, sentiment, sentiment_score, created_at)
      VALUES ('__MARKET_BRIEF__', ?, ?, 'neutral', 50, ?)
    `).run(brief.date, json, now());
  },

  // --- Stock Master ---
  getStocks(market?: string): { ticker: string; name: string; nameEn: string; market: string }[] {
    const db = getDb();
    if (market) {
      return db.prepare('SELECT ticker, name, name_en as nameEn, market FROM stocks WHERE market IN (?, ?)').all(
        market === 'KR' ? 'KOSPI' : 'NYSE',
        market === 'KR' ? 'KOSDAQ' : 'NASDAQ'
      ) as any[];
    }
    return db.prepare('SELECT ticker, name, name_en as nameEn, market FROM stocks').all() as any[];
  },

  searchStocks(query: string, market?: string) {
    const db = getDb();
    const likeQuery = `%${query}%`;
    if (market) {
      const markets = market === 'KR' ? ['KOSPI', 'KOSDAQ'] : ['NYSE', 'NASDAQ'];
      return db.prepare(`
        SELECT ticker, name, name_en as nameEn, market FROM stocks
        WHERE (ticker LIKE ? OR name LIKE ? OR name_en LIKE ?)
        AND market IN (?, ?)
        LIMIT 20
      `).all(likeQuery, likeQuery, likeQuery, markets[0], markets[1]) as any[];
    }
    return db.prepare(`
      SELECT ticker, name, name_en as nameEn, market FROM stocks
      WHERE ticker LIKE ? OR name LIKE ? OR name_en LIKE ?
      LIMIT 20
    `).all(likeQuery, likeQuery, likeQuery) as any[];
  },

  upsertStock(stock: { ticker: string; name: string; nameEn?: string; market: string; sector?: string }) {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO stocks (ticker, name, name_en, market, sector, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(stock.ticker, stock.name, stock.nameEn || null, stock.market, stock.sector || null, now());
  },
};
