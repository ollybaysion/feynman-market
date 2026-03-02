import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { OHLCV } from '../types/stock.js';

const twelveApi = axios.create({
  baseURL: 'https://api.twelvedata.com',
  timeout: 10000,
});

export const twelveDataService = {
  async getDailyChart(ticker: string, days = 30): Promise<OHLCV[]> {
    if (!config.twelveData.apiKey) {
      throw new Error('TWELVE_DATA_API_KEY not configured');
    }

    const res = await twelveApi.get('/time_series', {
      params: {
        symbol: ticker,
        interval: '1day',
        outputsize: days + 10,
        apikey: config.twelveData.apiKey,
        format: 'JSON',
      },
    });

    if (res.data.status === 'error') {
      throw new Error(`Twelve Data error: ${res.data.message}`);
    }

    const values: any[] = res.data.values || [];
    return values
      .map((d: any) => ({
        date: d.datetime,
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close),
        volume: parseInt(d.volume, 10),
      }))
      .reverse()
      .slice(-days);
  },
};
