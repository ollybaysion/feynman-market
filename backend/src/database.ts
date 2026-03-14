import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { logger } from './utils/logger.js';

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  pool = new Pool({
    connectionString: config.database.url,
    max: 10,
    ssl: config.database.url.includes('railway') || config.database.url.includes('ssl')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  // Test connection
  const client = await pool.connect();
  try {
    await runMigrations(client);
    await seedStocks(client);
    logger.info('Database initialized (PostgreSQL)');
  } finally {
    client.release();
  }
}

async function runMigrations(client: pg.PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS stocks (
      ticker TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT,
      market TEXT NOT NULL CHECK(market IN ('KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ')),
      sector TEXT,
      updated_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER)
    );

    CREATE TABLE IF NOT EXISTS price_cache (
      ticker TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume INTEGER,
      cached_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER),
      PRIMARY KEY (ticker, date)
    );

    CREATE TABLE IF NOT EXISTS news_cache (
      id SERIAL PRIMARY KEY,
      ticker TEXT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT,
      published_at TEXT,
      description TEXT,
      market TEXT CHECK(market IN ('KR', 'US')),
      cached_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER)
    );

    CREATE INDEX IF NOT EXISTS idx_news_ticker ON news_cache(ticker);
    CREATE INDEX IF NOT EXISTS idx_news_cached_at ON news_cache(cached_at);

    CREATE TABLE IF NOT EXISTS ai_summaries (
      id SERIAL PRIMARY KEY,
      ticker TEXT NOT NULL,
      summary_date TEXT NOT NULL,
      summary_text TEXT NOT NULL,
      sentiment TEXT CHECK(sentiment IN ('bullish', 'bearish', 'neutral')),
      sentiment_score REAL,
      created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER),
      UNIQUE(ticker, summary_date)
    );

    CREATE TABLE IF NOT EXISTS market_indices (
      symbol TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      value REAL,
      change REAL,
      change_percent REAL,
      updated_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER)
    );

    CREATE TABLE IF NOT EXISTS market_reports (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      indices_snapshot TEXT,
      kr_analysis TEXT,
      us_analysis TEXT,
      sources TEXT,
      created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER),
      updated_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_date ON market_reports(date);

    CREATE TABLE IF NOT EXISTS issue_trackers (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      keywords TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER)
    );

    CREATE TABLE IF NOT EXISTS issue_entries (
      id SERIAL PRIMARY KEY,
      tracker_id INTEGER NOT NULL REFERENCES issue_trackers(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      summary TEXT NOT NULL,
      sentiment TEXT CHECK(sentiment IN ('bullish', 'bearish', 'neutral')),
      sentiment_score REAL,
      articles TEXT,
      created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER),
      UNIQUE(tracker_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_issue_entries_tracker ON issue_entries(tracker_id, date DESC);
  `);
}

async function seedStocks(client: pg.PoolClient) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const seedDir = path.join(__dirname, '../data/seeds');
  const files = ['kr-stocks.json', 'us-stocks.json'];

  let seedTotal = 0;
  for (const file of files) {
    const filePath = path.join(seedDir, file);
    if (!fs.existsSync(filePath)) continue;
    const stocks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    seedTotal += stocks.length;
  }

  const result = await client.query('SELECT COUNT(*)::INTEGER as cnt FROM stocks');
  const dbCount = result.rows[0].cnt;
  if (dbCount >= seedTotal && seedTotal > 0) return;

  try {
    await client.query('BEGIN');
    for (const file of files) {
      const filePath = path.join(seedDir, file);
      if (!fs.existsSync(filePath)) continue;
      const stocks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const s of stocks) {
        await client.query(
          `INSERT INTO stocks (ticker, name, name_en, market, sector, updated_at)
           VALUES ($1, $2, $3, $4, $5, EXTRACT(EPOCH FROM NOW())::INTEGER)
           ON CONFLICT (ticker) DO UPDATE SET
             name = EXCLUDED.name, name_en = EXCLUDED.name_en,
             market = EXCLUDED.market, sector = EXCLUDED.sector,
             updated_at = EXTRACT(EPOCH FROM NOW())::INTEGER`,
          [s.ticker, s.name, s.nameEn || null, s.market, s.sector || null]
        );
      }
    }
    await client.query('COMMIT');
    const newResult = await client.query('SELECT COUNT(*)::INTEGER as cnt FROM stocks');
    logger.info(`Seeded ${newResult.rows[0].cnt} stocks`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}
