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

export interface MarketReport {
  id: number;
  date: string;
  title: string;
  indicesSnapshot: {
    symbol: string;
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }[];
  krAnalysis: MarketRegionBrief;
  usAnalysis: MarketRegionBrief;
  sources: { title: string; url: string; source: string; market: 'KR' | 'US' }[];
  createdAt?: number;
  updatedAt?: number;
}

export interface MarketReportListItem {
  id: number;
  date: string;
  title: string;
  krSentiment: 'bullish' | 'bearish' | 'neutral';
  usSentiment: 'bullish' | 'bearish' | 'neutral';
  krSentimentScore: number;
  usSentimentScore: number;
  createdAt: number;
}

// --- Issue Tracker ---
export interface IssueTracker {
  id: number;
  title: string;
  keywords: string[];
  description: string;
  status: 'active' | 'archived';
  createdAt: number;
  latestEntry?: string;
  entryCount: number;
}

export interface IssueEntry {
  id: number;
  trackerId: number;
  date: string;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  articles: { title: string; url: string; source: string; publishedAt: string }[];
  createdAt: number;
}

export interface IssueTrackerDetail {
  id: number;
  title: string;
  keywords: string[];
  description: string;
  status: 'active' | 'archived';
  createdAt: number;
  entries: IssueEntry[];
  totalEntries: number;
}
