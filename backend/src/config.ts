import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  kis: {
    appKey: process.env.KIS_APP_KEY || '',
    appSecret: process.env.KIS_APP_SECRET || '',
    baseUrl: process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443',
  },

  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY || '',
  },

  twelveData: {
    apiKey: process.env.TWELVE_DATA_API_KEY || '',
  },

  naver: {
    clientId: process.env.NAVER_CLIENT_ID || '',
    clientSecret: process.env.NAVER_CLIENT_SECRET || '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5',
  },

  database: {
    path: process.env.DATABASE_PATH || './data/market.db',
  },
} as const;
