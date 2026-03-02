/**
 * Market index data service using:
 * - Stooq (https://stooq.com) for US indices — free, no API key
 * - Naver Finance for Korean indices — free, no API key
 * - Stooq for US stock chart data as fallback
 */
import axios from 'axios';
import { logger } from '../utils/logger.js';
import type { MarketIndex, OHLCV } from '../types/stock.js';

const stooq = axios.create({ baseURL: 'https://stooq.com', timeout: 8000 });
const naver = axios.create({ baseURL: 'https://m.stock.naver.com', timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0' } });

// Stooq symbol map for US indices
const US_INDICES = [
  { stooq: '^spx', name: 'S&P 500',          key: 'S&P500' },
  { stooq: '^ndq', name: 'NASDAQ Composite',  key: 'NASDAQ' },
];

// Naver Finance index codes for Korean indices
const KR_INDICES = [
  { naver: 'KOSPI',  name: '코스피', key: 'KOSPI'  },
  { naver: 'KOSDAQ', name: '코스닥', key: 'KOSDAQ' },
];

async function fetchStooqQuote(symbol: string): Promise<{ close: number; open: number; change: number; changePercent: number }> {
  const res = await stooq.get('/q/l/', { params: { s: symbol, f: 'sd2t2ohlcvn', h: '', e: 'json' } });
  const sym = res.data?.symbols?.[0];
  if (!sym?.close) throw new Error(`No Stooq data for ${symbol}`);
  const change = (sym.close ?? 0) - (sym.open ?? sym.close);
  const changePercent = sym.open ? (change / sym.open) * 100 : 0;
  return { close: sym.close, open: sym.open ?? sym.close, change, changePercent };
}

async function fetchNaverIndex(code: string): Promise<{ value: number; change: number; changePercent: number }> {
  const res = await naver.get(`/api/index/${code}/basic`);
  const d = res.data;
  const value = parseFloat(String(d.closePrice).replace(/,/g, ''));
  const change = parseFloat(String(d.compareToPreviousClosePrice || '0').replace(/,/g, ''));
  const changePercent = parseFloat(String(d.fluctuationsRatio || '0').replace(/,/g, ''));
  return { value, change, changePercent };
}

export const yahooFinanceService = {
  async getMarketIndices(): Promise<MarketIndex[]> {
    const results: MarketIndex[] = [];
    const now = new Date().toISOString();

    // Korean indices from Naver Finance
    for (const idx of KR_INDICES) {
      try {
        const data = await fetchNaverIndex(idx.naver);
        results.push({ symbol: idx.key, name: idx.name, ...data, updatedAt: now });
      } catch (err: any) {
        logger.warn(`Naver Finance: failed to fetch ${idx.naver}: ${err?.message}`);
      }
    }

    // US indices from Stooq
    for (const idx of US_INDICES) {
      try {
        const data = await fetchStooqQuote(idx.stooq);
        results.push({
          symbol: idx.key, name: idx.name,
          value: data.close, change: data.change, changePercent: data.changePercent,
          updatedAt: now,
        });
      } catch (err: any) {
        logger.warn(`Stooq: failed to fetch ${idx.stooq}: ${err?.message}`);
      }
    }

    return results;
  },

  // Stooq daily chart for US stocks (fallback when Finnhub/Twelve Data unavailable)
  async getDailyChart(ticker: string, days = 30): Promise<OHLCV[]> {
    const to = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const from = new Date(Date.now() - (days + 10) * 86400_000).toISOString().split('T')[0].replace(/-/g, '');

    const res = await stooq.get('/q/d/l/', {
      params: { s: ticker.toLowerCase(), d1: from, d2: to, i: 'd' },
      responseType: 'text',
    });

    const lines: string[] = res.data.trim().split('\n');
    if (lines.length < 2) return [];

    // CSV: Date,Open,High,Low,Close,Volume
    return lines
      .slice(1)
      .filter(l => l.trim())
      .map(l => {
        const [date, open, high, low, close, volume] = l.split(',');
        return {
          date: date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
          open: parseFloat(open), high: parseFloat(high),
          low: parseFloat(low), close: parseFloat(close),
          volume: parseInt(volume || '0', 10),
        };
      })
      .filter(d => !isNaN(d.close))
      .slice(-days);
  },
};
