import axios from 'axios';
import { config } from '../config.js';
import type { NewsArticle } from '../types/news.js';

const naverApi = axios.create({
  baseURL: 'https://openapi.naver.com',
  timeout: 10000,
  headers: {
    'X-Naver-Client-Id': config.naver.clientId,
    'X-Naver-Client-Secret': config.naver.clientSecret,
  },
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim();
}

export const naverNewsService = {
  async searchNews(query: string, display = 50): Promise<NewsArticle[]> {
    if (!config.naver.clientId) {
      return [];
    }

    const res = await naverApi.get('/v1/search/news.json', {
      params: {
        query,
        display,
        sort: 'date',
      },
    });

    return (res.data.items || []).map((item: any) => ({
      title: stripHtml(item.title),
      url: item.originallink || item.link,
      source: new URL(item.originallink || item.link).hostname.replace('www.', ''),
      publishedAt: new Date(item.pubDate).toISOString(),
      description: stripHtml(item.description),
      market: 'KR' as const,
    }));
  },

  async getStockNews(stockName: string, ticker: string, days = 30): Promise<NewsArticle[]> {
    const articles = await this.searchNews(`${stockName} 주가`, 100);
    const cutoff = new Date(Date.now() - days * 86400_000);

    return articles
      .filter(a => new Date(a.publishedAt) >= cutoff)
      .map(a => ({ ...a, ticker }));
  },

  async getMarketNews(): Promise<NewsArticle[]> {
    const queries = ['주식시장', '코스피', '증시'];
    const results: NewsArticle[] = [];

    for (const q of queries) {
      const articles = await this.searchNews(q, 15);
      results.push(...articles);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    return results.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  },
};
