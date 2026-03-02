export interface NewsArticle {
  id?: number;
  ticker?: string;
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
  description?: string;
  market: 'KR' | 'US';
}

export interface AISummary {
  ticker: string;
  summaryDate: string;
  summaryText: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
}

export interface MarketRegionBrief {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  keyIssues: string[];
  summary: string;
}

export interface MarketBrief {
  date: string;
  kr: MarketRegionBrief;
  us: MarketRegionBrief;
  generatedAt: string;
}
