export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  cached?: boolean;
  cachedAt?: string;
}

export interface TrendingIssue {
  title: string;
  description: string;
  market: 'KR' | 'US';
  relatedStocks: string[];
  timestamp: string;
}
