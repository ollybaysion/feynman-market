import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { logger } from './utils/logger.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): Database.Database {
  const dbDir = path.dirname(config.database.path);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.database.path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  seedStocks(db);
  logger.info('Database initialized at ' + config.database.path);
  return db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      ticker TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT,
      market TEXT NOT NULL CHECK(market IN ('KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ')),
      sector TEXT,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS price_cache (
      ticker TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume INTEGER,
      cached_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (ticker, date)
    );

    CREATE TABLE IF NOT EXISTS news_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT,
      published_at TEXT,
      description TEXT,
      market TEXT CHECK(market IN ('KR', 'US')),
      cached_at INTEGER DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_news_ticker ON news_cache(ticker);
    CREATE INDEX IF NOT EXISTS idx_news_cached_at ON news_cache(cached_at);

    CREATE TABLE IF NOT EXISTS ai_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      summary_date TEXT NOT NULL,
      summary_text TEXT NOT NULL,
      sentiment TEXT CHECK(sentiment IN ('bullish', 'bearish', 'neutral')),
      sentiment_score REAL,
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(ticker, summary_date)
    );

    CREATE TABLE IF NOT EXISTS market_indices (
      symbol TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      value REAL,
      change REAL,
      change_percent REAL,
      updated_at INTEGER DEFAULT (unixepoch())
    );
  `);
}

function seedStocks(db: Database.Database) {
  const seedDir = path.join(path.dirname(config.database.path), 'seeds');
  const files = ['kr-stocks.json', 'us-stocks.json'];

  let seedTotal = 0;
  for (const file of files) {
    const filePath = path.join(seedDir, file);
    if (!fs.existsSync(filePath)) continue;
    const stocks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    seedTotal += stocks.length;
  }

  const dbCount = (db.prepare('SELECT COUNT(*) as cnt FROM stocks').get() as any).cnt;
  if (dbCount >= seedTotal && seedTotal > 0) return;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO stocks (ticker, name, name_en, market, sector, updated_at)
    VALUES (?, ?, ?, ?, ?, unixepoch())
  `);

  const tx = db.transaction(() => {
    for (const file of files) {
      const filePath = path.join(seedDir, file);
      if (!fs.existsSync(filePath)) continue;
      const stocks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const s of stocks) {
        insert.run(s.ticker, s.name, s.nameEn || null, s.market, s.sector || null);
      }
    }
  });

  tx();
  const newCount = (db.prepare('SELECT COUNT(*) as cnt FROM stocks').get() as any).cnt;
  logger.info(`Seeded ${newCount} stocks`);
}

export function closeDatabase() {
  if (db) {
    db.close();
    logger.info('Database connection closed');
  }
}
