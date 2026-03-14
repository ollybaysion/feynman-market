import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export interface IndicatorQuote {
  symbol: string;
  name: string;
  category: 'forex' | 'commodity' | 'bond' | 'volatility' | 'crypto';
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}

export interface IndicatorOHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface IndicatorChart {
  symbol: string;
  name: string;
  category: string;
  data: IndicatorOHLCV[];
}

// Twelve Data symbols mapping
const INDICATORS = {
  forex: [
    { symbol: 'USD/KRW', name: '달러/원' },
    { symbol: 'EUR/KRW', name: '유로/원' },
    { symbol: 'JPY/KRW', name: '엔/원' },
    { symbol: 'EUR/USD', name: '유로/달러' },
    { symbol: 'USD/JPY', name: '달러/엔' },
  ],
  commodity: [
    { symbol: 'XAU/USD', name: '금' },
    { symbol: 'XAG/USD', name: '은' },
    { symbol: 'WT', name: 'WTI 원유' },
    { symbol: 'BRN', name: '브렌트유' },
    { symbol: 'NG', name: '천연가스' },
    { symbol: 'HG', name: '구리' },
  ],
  bond: [
    { symbol: 'TNXS', name: '미국 10년 국채' },
  ],
  volatility: [
    { symbol: 'VIX', name: 'VIX 변동성' },
  ],
  crypto: [
    { symbol: 'BTC/USD', name: '비트코인' },
    { symbol: 'ETH/USD', name: '이더리움' },
  ],
} as const;

const BASE_URL = 'https://api.twelvedata.com';

async function fetchQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const res = await axios.get(`${BASE_URL}/quote`, {
      params: { symbol, apikey: config.twelveData.apiKey },
      timeout: 10000,
    });
    const d = res.data;
    if (d.status === 'error' || !d.close) return null;
    return {
      price: parseFloat(d.close),
      change: parseFloat(d.change || '0'),
      changePercent: parseFloat(d.percent_change || '0'),
    };
  } catch (err: any) {
    logger.error(`Twelve Data quote error for ${symbol}:`, err.message);
    return null;
  }
}

async function fetchTimeSeries(symbol: string, days = 90): Promise<IndicatorOHLCV[]> {
  try {
    const res = await axios.get(`${BASE_URL}/time_series`, {
      params: {
        symbol,
        interval: '1day',
        outputsize: days,
        apikey: config.twelveData.apiKey,
      },
      timeout: 10000,
    });
    const d = res.data;
    if (d.status === 'error' || !d.values) return [];
    return d.values
      .map((v: any) => ({
        date: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
      }))
      .reverse(); // chronological order
  } catch (err: any) {
    logger.error(`Twelve Data time_series error for ${symbol}:`, err.message);
    return [];
  }
}

export const indicatorsService = {
  getIndicatorsList() {
    return INDICATORS;
  },

  async getAllQuotes(): Promise<IndicatorQuote[]> {
    const allIndicators = [
      ...INDICATORS.forex.map(i => ({ ...i, category: 'forex' as const })),
      ...INDICATORS.commodity.map(i => ({ ...i, category: 'commodity' as const })),
      ...INDICATORS.bond.map(i => ({ ...i, category: 'bond' as const })),
      ...INDICATORS.volatility.map(i => ({ ...i, category: 'volatility' as const })),
      ...INDICATORS.crypto.map(i => ({ ...i, category: 'crypto' as const })),
    ];

    // Batch request with comma-separated symbols
    const symbols = allIndicators.map(i => i.symbol).join(',');
    try {
      const res = await axios.get(`${BASE_URL}/quote`, {
        params: { symbol: symbols, apikey: config.twelveData.apiKey },
        timeout: 15000,
      });

      const results: IndicatorQuote[] = [];
      // When multiple symbols, response is an object keyed by symbol
      const data = Array.isArray(res.data) ? res.data :
        typeof res.data === 'object' && res.data.close ? [res.data] :
        Object.values(res.data);

      for (const d of data as any[]) {
        if (!d || d.status === 'error' || !d.close) continue;
        const indicator = allIndicators.find(i => i.symbol === d.symbol);
        if (!indicator) continue;
        results.push({
          symbol: indicator.symbol,
          name: indicator.name,
          category: indicator.category,
          price: parseFloat(d.close),
          change: parseFloat(d.change || '0'),
          changePercent: parseFloat(d.percent_change || '0'),
          updatedAt: d.datetime || new Date().toISOString(),
        });
      }
      return results;
    } catch (err: any) {
      logger.error('Twelve Data batch quote error:', err.message);
      // Fallback: fetch individually
      const results: IndicatorQuote[] = [];
      for (const indicator of allIndicators) {
        const quote = await fetchQuote(indicator.symbol);
        if (quote) {
          results.push({
            symbol: indicator.symbol,
            name: indicator.name,
            category: indicator.category,
            ...quote,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      return results;
    }
  },

  async getChart(symbol: string, days = 90): Promise<IndicatorChart | null> {
    const allIndicators = [
      ...INDICATORS.forex.map(i => ({ ...i, category: 'forex' })),
      ...INDICATORS.commodity.map(i => ({ ...i, category: 'commodity' })),
      ...INDICATORS.bond.map(i => ({ ...i, category: 'bond' })),
      ...INDICATORS.volatility.map(i => ({ ...i, category: 'volatility' })),
      ...INDICATORS.crypto.map(i => ({ ...i, category: 'crypto' })),
    ];
    const indicator = allIndicators.find(i => i.symbol === symbol);
    if (!indicator) return null;

    const data = await fetchTimeSeries(symbol, days);
    if (data.length === 0) return null;

    return {
      symbol: indicator.symbol,
      name: indicator.name,
      category: indicator.category,
      data,
    };
  },
};
