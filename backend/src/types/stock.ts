export interface Stock {
  ticker: string;
  name: string;
  nameEn?: string;
  market: 'KOSPI' | 'KOSDAQ' | 'NYSE' | 'NASDAQ';
  sector?: string;
}

export interface StockQuote {
  ticker: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: string;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}
