export const API_BASE = '/api';

export const MARKET_LABELS: Record<string, string> = {
  KOSPI: '코스피',
  KOSDAQ: '코스닥',
  NYSE: 'NYSE',
  NASDAQ: 'NASDAQ',
  KR: '한국',
  US: '미국',
};

export const REFETCH_INTERVALS = {
  quote: 30_000,    // 30 seconds
  chart: 60_000,    // 1 minute
  news: 300_000,    // 5 minutes
  indices: 15_000,  // 15 seconds
};
