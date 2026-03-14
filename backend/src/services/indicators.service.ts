import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export type IndicatorCategory = 'index' | 'forex' | 'commodity' | 'agriculture' | 'bond' | 'volatility' | 'crypto';

export interface IndicatorQuote {
  symbol: string;
  name: string;
  category: IndicatorCategory;
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
// Note: Futures (GC, SI) and direct indices (SPX, DJI) require paid plans.
// Using ETFs as proxies where needed.
const INDICATORS = {
  index: [
    { symbol: 'SPY', name: 'S&P 500 (ETF)' },
    { symbol: 'QQQ', name: 'NASDAQ 100 (ETF)' },
    { symbol: 'DIA', name: '다우존스 (ETF)' },
    { symbol: 'UUP', name: '달러 인덱스 (ETF)' },
  ],
  forex: [
    { symbol: 'USD/KRW', name: '달러/원' },
    { symbol: 'EUR/KRW', name: '유로/원' },
    { symbol: 'JPY/KRW', name: '엔/원' },
    { symbol: 'EUR/USD', name: '유로/달러' },
    { symbol: 'USD/JPY', name: '달러/엔' },
    { symbol: 'GBP/USD', name: '파운드/달러' },
    { symbol: 'USD/CNY', name: '달러/위안' },
  ],
  commodity: [
    { symbol: 'XAU/USD', name: '금 (현물)' },
    { symbol: 'XAG/USD', name: '은 (현물)' },
    { symbol: 'GLD', name: '금 (ETF)' },
    { symbol: 'SLV', name: '은 (ETF)' },
    { symbol: 'USO', name: 'WTI 원유 (ETF)' },
    { symbol: 'NG', name: '천연가스' },
    { symbol: 'HG', name: '구리' },
  ],
  agriculture: [
    { symbol: 'CORN', name: '옥수수 (ETF)' },
    { symbol: 'WEAT', name: '소맥 (ETF)' },
    { symbol: 'SOYB', name: '대두 (ETF)' },
  ],
  bond: [
    { symbol: 'TLT', name: '미국 장기 국채 (ETF)' },
    { symbol: 'IEF', name: '미국 중기 국채 (ETF)' },
    { symbol: 'SHY', name: '미국 단기 국채 (ETF)' },
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
      ...INDICATORS.index.map(i => ({ ...i, category: 'index' as const })),
      ...INDICATORS.forex.map(i => ({ ...i, category: 'forex' as const })),
      ...INDICATORS.commodity.map(i => ({ ...i, category: 'commodity' as const })),
      ...INDICATORS.agriculture.map(i => ({ ...i, category: 'agriculture' as const })),
      ...INDICATORS.bond.map(i => ({ ...i, category: 'bond' as const })),
      ...INDICATORS.volatility.map(i => ({ ...i, category: 'volatility' as const })),
      ...INDICATORS.crypto.map(i => ({ ...i, category: 'crypto' as const })),
    ];

    // Twelve Data free plan: 8 API credits/min, 800/day
    // Each symbol in a batch = 1 credit
    const BATCH_SIZE = 4;
    const BATCH_DELAY = 8500; // ~8.5s between batches to stay under rate limit
    const results: IndicatorQuote[] = [];

    for (let i = 0; i < allIndicators.length; i += BATCH_SIZE) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
      const batch = allIndicators.slice(i, i + BATCH_SIZE);
      const symbols = batch.map(b => b.symbol).join(',');

      try {
        const res = await axios.get(`${BASE_URL}/quote`, {
          params: { symbol: symbols, apikey: config.twelveData.apiKey },
          timeout: 15000,
        });

        // Single symbol returns object directly, multiple returns keyed object
        const data = batch.length === 1
          ? [res.data]
          : Object.values(res.data);

        for (const d of data as any[]) {
          if (!d || d.status === 'error' || !d.close) continue;
          const indicator = batch.find(b => b.symbol === d.symbol);
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
      } catch (err: any) {
        logger.warn(`Twelve Data batch error for [${symbols}]:`, err.message);
      }
    }

    return results;
  },

  async getChart(symbol: string, days = 90): Promise<IndicatorChart | null> {
    const allIndicators = [
      ...INDICATORS.index.map(i => ({ ...i, category: 'index' })),
      ...INDICATORS.forex.map(i => ({ ...i, category: 'forex' })),
      ...INDICATORS.commodity.map(i => ({ ...i, category: 'commodity' })),
      ...INDICATORS.agriculture.map(i => ({ ...i, category: 'agriculture' })),
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
