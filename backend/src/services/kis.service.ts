import axios from 'axios';
import { config } from '../config.js';
import { kisTokenManager } from '../utils/token-manager.js';
import { logger } from '../utils/logger.js';
import type { StockQuote, OHLCV } from '../types/stock.js';

const kisApi = axios.create({
  baseURL: config.kis.baseUrl,
  timeout: 10000,
});

async function getHeaders(trId: string) {
  const token = await kisTokenManager.getToken();
  return {
    'Content-Type': 'application/json; charset=utf-8',
    authorization: `Bearer ${token}`,
    appkey: config.kis.appKey,
    appsecret: config.kis.appSecret,
    tr_id: trId,
  };
}

export const kisService = {
  async getQuote(ticker: string): Promise<StockQuote> {
    const headers = await getHeaders('FHKST01010100');
    const res = await kisApi.get('/uapi/domestic-stock/v1/quotations/inquire-price', {
      headers,
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: ticker,
      },
    });

    const d = res.data.output;
    return {
      ticker,
      name: d.hts_kor_isnm || ticker,
      market: 'KOSPI',
      price: parseFloat(d.stck_prpr),
      change: parseFloat(d.prdy_vrss),
      changePercent: parseFloat(d.prdy_ctrt),
      volume: parseInt(d.acml_vol, 10),
      high: parseFloat(d.stck_hgpr),
      low: parseFloat(d.stck_lwpr),
      open: parseFloat(d.stck_oprc),
      prevClose: parseFloat(d.stck_prpr) - parseFloat(d.prdy_vrss),
      timestamp: new Date().toISOString(),
    };
  },

  async getDailyChart(ticker: string, days = 30): Promise<OHLCV[]> {
    const headers = await getHeaders('FHKST03010100');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days - 10); // extra buffer for non-trading days

    const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

    const res = await kisApi.get('/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice', {
      headers,
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: ticker,
        FID_INPUT_DATE_1: fmt(startDate),
        FID_INPUT_DATE_2: fmt(endDate),
        FID_PERIOD_DIV_CODE: 'D',
        FID_ORG_ADJ_PRC: '0',
      },
    });

    const output = res.data.output2 || [];
    return output
      .map((d: any) => ({
        date: `${d.stck_bsop_date.slice(0, 4)}-${d.stck_bsop_date.slice(4, 6)}-${d.stck_bsop_date.slice(6, 8)}`,
        open: parseFloat(d.stck_oprc),
        high: parseFloat(d.stck_hgpr),
        low: parseFloat(d.stck_lwpr),
        close: parseFloat(d.stck_clpr),
        volume: parseInt(d.acml_vol, 10),
      }))
      .reverse()
      .slice(-days);
  },

  async searchStocks(query: string): Promise<{ ticker: string; name: string; market: string }[]> {
    // KIS doesn't have a great search API, so we rely on the local stocks table
    // This is seeded/refreshed periodically
    logger.debug('KIS stock search delegated to local DB for query:', query);
    return [];
  },
};
