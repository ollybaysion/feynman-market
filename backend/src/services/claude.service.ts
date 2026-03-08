import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { NewsArticle, AISummary, MarketBrief, MarketRegionBrief } from '../types/news.js';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!config.anthropic.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `당신은 한국어로 주식 시장 뉴스를 분석하는 전문 애널리스트입니다.
주어진 뉴스 기사들을 분석하여 다음 JSON 형식으로만 응답하세요:

{
  "summary": "핵심 이슈 3-5개를 줄바꿈으로 구분하여 정리",
  "sentiment": "bullish" 또는 "bearish" 또는 "neutral",
  "sentimentScore": 0~100 사이의 숫자 (50=중립, 100=매우 긍정),
  "keyPoints": ["포인트1", "포인트2", "포인트3"]
}

반드시 유효한 JSON만 출력하세요. 다른 텍스트를 포함하지 마세요.
이 분석은 투자 권유가 아닌 정보 제공 목적입니다.`;

export const claudeService = {
  async summarizeNews(ticker: string, stockName: string, articles: NewsArticle[]): Promise<AISummary> {
    const anthropic = getClient();

    const newsText = articles
      .slice(0, 15)
      .map((a, i) => `[${i + 1}] ${a.title}\n${a.description || ''}\n출처: ${a.source || '알 수 없음'} | ${a.publishedAt}`)
      .join('\n\n');

    const userPrompt = `다음은 "${stockName}" (${ticker}) 관련 최근 뉴스입니다:\n\n${newsText}\n\n위 뉴스를 분석하여 JSON으로 응답해주세요.`;

    try {
      const message = await anthropic.messages.create({
        model: config.anthropic.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      // Extract JSON from response (handle possible markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const today = new Date().toISOString().split('T')[0];

      return {
        ticker,
        summaryDate: today,
        summaryText: parsed.summary + '\n\n주요 포인트:\n' + (parsed.keyPoints || []).map((p: string) => `• ${p}`).join('\n'),
        sentiment: parsed.sentiment,
        sentimentScore: parsed.sentimentScore,
      };
    } catch (err) {
      logger.error('Claude analysis failed:', err);
      throw new Error('AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  },

  async generateMarketBrief(krArticles: NewsArticle[], usArticles: NewsArticle[]): Promise<MarketBrief> {
    const anthropic = getClient();

    const formatNews = (articles: NewsArticle[], label: string) =>
      `=== ${label} ===\n` +
      articles
        .slice(0, 12)
        .map((a, i) => `[${i + 1}] ${a.title}${a.description ? '\n' + a.description : ''}`)
        .join('\n\n');

    const newsText = [
      formatNews(krArticles, '한국 시장 뉴스'),
      formatNews(usArticles, '미국 시장 뉴스'),
    ].join('\n\n');

    const systemPrompt = `당신은 글로벌 주식 시장을 분석하는 전문 애널리스트입니다.
한국 시장과 미국 시장의 뉴스를 분석하여 반드시 다음 JSON 형식으로만 응답하세요:

{
  "kr": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "sentimentScore": 0~100 (50=중립, 100=매우 긍정),
    "keyIssues": ["핵심 이슈1", "핵심 이슈2", "핵심 이슈3"],
    "summary": "한국 시장 한 줄 요약"
  },
  "us": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "sentimentScore": 0~100,
    "keyIssues": ["Key issue 1", "Key issue 2", "Key issue 3"],
    "summary": "US market one-line summary"
  }
}

keyIssues는 3~5개, 각 항목은 30자 이내로 간결하게 작성하세요.
반드시 유효한 JSON만 출력하세요. 이 분석은 투자 권유가 아닌 정보 제공 목적입니다.`;

    const message = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: `다음 뉴스를 분석하여 시장 주요 이슈 브리핑을 JSON으로 작성해주세요:\n\n${newsText}` }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude market brief response');

    const parsed = JSON.parse(jsonMatch[0]);
    const now = new Date();

    return {
      date: now.toISOString().split('T')[0],
      kr: {
        sentiment: parsed.kr?.sentiment || 'neutral',
        sentimentScore: parsed.kr?.sentimentScore ?? 50,
        keyIssues: parsed.kr?.keyIssues || [],
        summary: parsed.kr?.summary || '',
      },
      us: {
        sentiment: parsed.us?.sentiment || 'neutral',
        sentimentScore: parsed.us?.sentimentScore ?? 50,
        keyIssues: parsed.us?.keyIssues || [],
        summary: parsed.us?.summary || '',
      },
      generatedAt: now.toISOString(),
    };
  },

  async generateReportTitle(kr: MarketRegionBrief, us: MarketRegionBrief): Promise<string> {
    const anthropic = getClient();
    const prompt = `다음은 오늘의 한국/미국 주식 시장 분석입니다.

한국: ${kr.summary} (${kr.sentiment}, ${kr.sentimentScore}점)
주요 이슈: ${kr.keyIssues.join(', ')}

미국: ${us.summary} (${us.sentiment}, ${us.sentimentScore}점)
주요 이슈: ${us.keyIssues.join(', ')}

이 분석을 바탕으로 오늘의 시장 상황을 요약하는 한국어 제목을 하나만 작성하세요.
- 40자 이내
- 핵심 이슈 중심
- 신문 헤드라인 스타일
- 제목만 출력, 따옴표 없이`;

    try {
      const message = await anthropic.messages.create({
        model: config.anthropic.model,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      return text.trim().replace(/^["']|["']$/g, '').substring(0, 50);
    } catch (err) {
      logger.error('Title generation failed:', err);
      const today = new Date().toLocaleDateString('ko-KR');
      return `${today} 시장 분석 리포트`;
    }
  },
};
