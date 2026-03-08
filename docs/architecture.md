# Architecture

## Overview

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
│  React 19 + Vite + TanStack Query + Zustand     │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────┐
│                 Express 5 Server                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Routes   │ │Middleware│ │  Static Serving  │ │
│  │ /api/*    │ │ helmet   │ │ frontend/dist    │ │
│  │          │ │ cors     │ │                  │ │
│  │          │ │ rate-limit│ │                  │ │
│  └────┬─────┘ └──────────┘ └──────────────────┘ │
│       │                                          │
│  ┌────▼─────────────────────────────────────┐    │
│  │              Services Layer              │    │
│  │  KIS │ Finnhub │ Naver │ TwelveData │    │    │
│  │  Claude AI │ Yahoo Finance │ Cache    │    │    │
│  └────┬─────────────────────────────────────┘    │
│       │                                          │
│  ┌────▼─────────────────────────────────────┐    │
│  │         SQLite (better-sqlite3)          │    │
│  │  stocks │ price_cache │ news_cache │     │    │
│  │  ai_summaries │ market_indices           │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

## Frontend

### 데이터 흐름

```
Page → Hook (useStockQuote 등) → React Query → API Client (Axios) → Backend
                                      ↕
                                   Cache (staleTime)
```

- **React Query**: 서버 상태 관리. 엔드포인트별 staleTime 설정으로 불필요한 재요청 방지
- **Zustand**: 클라이언트 상태 (사이드바 토글, 활성 종목 등)
- **SSE (useSSE hook)**: 시장 지수 실시간 스트리밍

### 주요 페이지

| 페이지 | 경로 | 설명 |
|--------|------|------|
| DashboardPage | `/` | 시장 지수, AI 이슈 요약, 뉴스 피드 |
| StockDetailPage | `/stock/:ticker` | 종목 상세 (차트, 시세, 뉴스, AI 분석) |
| SearchPage | `/search?q=` | 종목 검색 결과 |

## Backend

### API 엔드포인트

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/stocks/search?q=` | 종목 검색 |
| GET | `/api/stocks/:ticker/quote` | 종목 시세 |
| GET | `/api/stocks/:ticker/chart?period=` | 캔들차트 데이터 |
| GET | `/api/market/indices` | 시장 지수 (KOSPI, S&P 500 등) |
| GET | `/api/news/stock/:ticker` | 종목 관련 뉴스 |
| GET | `/api/news/market?region=` | 시장 전체 뉴스 |
| GET | `/api/ai/summary/:ticker` | AI 종목 분석 |
| GET | `/api/ai/market-brief` | AI 시장 이슈 브리핑 |
| GET | `/api/sse/market-indices` | 시장 지수 SSE 스트림 |

### 캐싱 전략 (SQLite)

| 데이터 | TTL | 테이블 |
|--------|-----|--------|
| 주식 시세 (장중) | 1분 | price_cache |
| 주식 시세 (장후) | 24시간 | price_cache |
| 뉴스 | 6시간 | news_cache |
| AI 종목 분석 | 24시간 | ai_summaries |
| AI 시장 브리핑 | 3시간 | ai_summaries |
| 시장 지수 | 1분 | market_indices |

### 외부 API Fallback 전략

- **한국 시세**: KIS API → (실패 시) Yahoo Finance
- **미국 시세**: Finnhub → (실패 시) Yahoo Finance
- **차트 데이터**: Twelve Data → (실패 시) Stooq CSV
- **한국 뉴스**: Naver Search API
- **미국 뉴스**: Finnhub News API
- **시장 지수 (KR)**: Naver Finance
- **시장 지수 (US)**: Stooq

## Database Schema

```sql
-- 종목 마스터
stocks (ticker, name, name_en, market, sector, updated_at)

-- 시세 캐시
price_cache (ticker, data_json, period, created_at)

-- 뉴스 캐시
news_cache (ticker, articles_json, source, created_at)

-- AI 분석 결과
ai_summaries (ticker, summary_json, created_at)

-- 시장 지수
market_indices (symbol, name, value, change, change_percent, updated_at)
```
