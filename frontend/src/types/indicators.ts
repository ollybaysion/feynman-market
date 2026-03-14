export interface IndicatorQuote {
  symbol: string;
  name: string;
  category: 'index' | 'forex' | 'commodity' | 'agriculture' | 'bond' | 'volatility' | 'crypto';
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
