import axios from 'axios';
import { config } from '../config.js';
import type { StockQuote, OHLCV } from '../types/stock.js';
import type { NewsArticle } from '../types/news.js';

const finnhubApi = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: 10000,
  params: { token: config.finnhub.apiKey },
});

export const finnhubService = {
  async getQuote(ticker: string): Promise<StockQuote> {
    const [quoteRes, profileRes] = await Promise.all([
      finnhubApi.get('/quote', { params: { symbol: ticker } }),
      finnhubApi.get('/stock/profile2', { params: { symbol: ticker } }).catch(() => ({ data: {} })),
    ]);

    const q = quoteRes.data;
    const p = profileRes.data;
    return {
      ticker,
      name: p.name || ticker,
      market: p.exchange?.includes('NASDAQ') ? 'NASDAQ' : 'NYSE',
      price: q.c,
      change: q.d,
      changePercent: q.dp,
      volume: 0, // quote endpoint doesn't return volume
      high: q.h,
      low: q.l,
      open: q.o,
      prevClose: q.pc,
      timestamp: new Date(q.t * 1000).toISOString(),
    };
  },

  async getDailyChart(ticker: string, days = 30): Promise<OHLCV[]> {
    const to = Math.floor(Date.now() / 1000);
    const from = to - (days + 10) * 86400; // extra buffer for weekends

    const res = await finnhubApi.get('/stock/candle', {
      params: {
        symbol: ticker,
        resolution: 'D',
        from,
        to,
      },
    });

    if (res.data.s !== 'ok') {
      return [];
    }

    const { t, o, h, l, c, v } = res.data;
    const data: OHLCV[] = [];
    for (let i = 0; i < t.length; i++) {
      data.push({
        date: new Date(t[i] * 1000).toISOString().split('T')[0],
        open: o[i],
        high: h[i],
        low: l[i],
        close: c[i],
        volume: v[i],
      });
    }
    return data.slice(-days);
  },

  async getCompanyNews(ticker: string, days = 30): Promise<NewsArticle[]> {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - days * 86400_000).toISOString().split('T')[0];

    const res = await finnhubApi.get('/company-news', {
      params: { symbol: ticker, from, to },
    });

    return (res.data || []).slice(0, 50).map((n: any) => ({
      ticker,
      title: n.headline,
      url: n.url,
      source: n.source,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      description: n.summary,
      market: 'US' as const,
    }));
  },

  async searchSymbols(query: string): Promise<{ ticker: string; name: string; market: string }[]> {
    const res = await finnhubApi.get('/search', { params: { q: query } });
    return (res.data.result || [])
      .filter((r: any) => r.type === 'Common Stock')
      .slice(0, 20)
      .map((r: any) => ({
        ticker: r.symbol,
        name: r.description,
        market: 'NYSE', // Finnhub doesn't distinguish well; we'll refine later
      }));
  },

  async getMarketNews(): Promise<NewsArticle[]> {
    const res = await finnhubApi.get('/news', { params: { category: 'general' } });
    return (res.data || []).slice(0, 30).map((n: any) => ({
      title: n.headline,
      url: n.url,
      source: n.source,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      description: n.summary,
      market: 'US' as const,
    }));
  },
};
