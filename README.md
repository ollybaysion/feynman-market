# Feynman Market

한국 & 미국 주식 시장 분석 웹 서비스. 실시간 시세, 뉴스, AI 기반 시장 분석을 한 곳에서 제공합니다.

**Live:** https://feynman-market-production.up.railway.app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS |
| Backend | Express 5, TypeScript, SQLite (better-sqlite3) |
| State | Zustand, TanStack React Query v5 |
| AI | Claude Sonnet (Anthropic SDK) |
| Chart | Lightweight Charts |
| Deploy | Docker, Railway, GitHub Actions CI |

## Features

- **실시간 시장 지수** — KOSPI, KOSDAQ, S&P 500, NASDAQ, DOW 지수를 SSE로 실시간 스트리밍
- **종목 검색** — KRX 전종목(3,969개) + 미국 주요 105종목 검색
- **종목 상세** — 캔들차트, 일별 시세, 관련 뉴스
- **AI 뉴스 분석** — Claude가 뉴스를 분석하여 투자 심리(bullish/bearish/neutral) 요약
- **주요 이슈 요약** — 한국/미국 시장 전체 이슈를 AI가 브리핑
- **뉴스 피드** — 한국(네이버) & 미국(Finnhub) 최신 뉴스

## Data Sources

| Source | Usage |
|--------|-------|
| KIS (한국투자증권) | 한국 주식 실시간 시세 |
| Finnhub | 미국 주식 시세, 뉴스 |
| Twelve Data / Stooq | 캔들차트 데이터 (fallback) |
| Naver Finance | 한국 시장 지수, 뉴스, 종목 목록 |
| Stooq | 미국 시장 지수 |
| Anthropic Claude | AI 뉴스 분석 및 시장 브리핑 |

## Quick Start

### Prerequisites

- Node.js 20+
- API Keys: KIS, Finnhub, Twelve Data, Naver, Anthropic

### Setup

```bash
# Clone
git clone https://github.com/ollybaysion/feynman-market.git
cd feynman-market

# Backend
cd backend
cp .env.example .env   # API 키 설정
npm install
npm run dev             # http://localhost:4000

# Frontend (별도 터미널)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

### Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Korean Investment Service
KIS_APP_KEY=
KIS_APP_SECRET=

# Finnhub
FINNHUB_API_KEY=

# Twelve Data
TWELVE_DATA_API_KEY=

# Naver API
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Anthropic Claude
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-4-5

# Database
DATABASE_PATH=./data/market.db
```

### Docker

```bash
docker build -t feynman-market .
docker run -p 4000:4000 --env-file backend/.env feynman-market
```

## Project Structure

```
├── frontend/
│   └── src/
│       ├── api/          # API client (Axios)
│       ├── components/   # React 컴포넌트 (common, dashboard, layout, search, stock)
│       ├── hooks/        # Custom hooks (useSSE, useStockQuote, useMarketBrief 등)
│       ├── pages/        # 페이지 (Dashboard, Search, StockDetail)
│       ├── store/        # Zustand store
│       ├── types/        # TypeScript 타입
│       └── utils/        # 유틸리티
├── backend/
│   └── src/
│       ├── routes/       # API 라우트 (stocks, market, news, ai, sse)
│       ├── services/     # 외부 API 연동 (KIS, Finnhub, Naver, Claude 등)
│       ├── middleware/   # 에러 핸들러, Rate limiter
│       ├── jobs/         # Cron 스케줄러
│       ├── types/        # TypeScript 타입
│       └── utils/        # 로거, 토큰 매니저
├── Dockerfile            # Multi-stage 빌드
├── railway.toml          # Railway 배포 설정
└── .github/workflows/    # CI 파이프라인
```

## Deployment

Railway에서 GitHub 연동으로 자동 배포됩니다. `main` 브랜치에 push 시 자동 빌드 & 배포.

자세한 내용은 [docs/deployment.md](docs/deployment.md) 참고.

## License

MIT
