# API Reference

Base URL: `https://feynman-market-production.up.railway.app/api`

## Health

### `GET /health`

서버 상태 확인.

```json
{ "status": "ok", "timestamp": "2026-03-08T11:16:00.103Z" }
```

## Stocks

### `GET /stocks/search?q={query}`

종목 검색. 티커 또는 이름으로 검색.

```
GET /stocks/search?q=삼성
GET /stocks/search?q=AAPL
```

### `GET /stocks/:ticker/quote`

종목 실시간 시세 조회.

```
GET /stocks/005930.KS/quote
GET /stocks/AAPL/quote
```

### `GET /stocks/:ticker/chart?period={period}`

캔들차트 데이터.

| period | 설명 |
|--------|------|
| `1M` | 1개월 |
| `3M` | 3개월 |
| `6M` | 6개월 |
| `1Y` | 1년 |

```
GET /stocks/AAPL/chart?period=3M
```

## Market

### `GET /market/indices`

주요 시장 지수 (KOSPI, KOSDAQ, S&P 500, NASDAQ, DOW).

## News

### `GET /news/stock/:ticker`

종목 관련 뉴스.

### `GET /news/market?region={kr|us}`

시장 전체 뉴스.

## AI

### `GET /ai/summary/:ticker`

AI 종목 뉴스 분석. Claude가 관련 뉴스를 분석하여 투자 심리와 요약을 반환.

```json
{
  "sentiment": "bullish",
  "sentimentScore": 72,
  "summary": "...",
  "keyPoints": ["...", "..."],
  "risks": ["..."]
}
```

### `GET /ai/market-brief`

AI 시장 전체 브리핑. 한국/미국 시장의 주요 이슈를 분석.

```json
{
  "date": "2026-03-08",
  "kr": {
    "sentiment": "neutral",
    "sentimentScore": 50,
    "keyIssues": ["..."],
    "summary": "..."
  },
  "us": {
    "sentiment": "bullish",
    "sentimentScore": 65,
    "keyIssues": ["..."],
    "summary": "..."
  },
  "generatedAt": "2026-03-08T11:00:00.000Z"
}
```

## SSE (Server-Sent Events)

### `GET /sse/market-indices`

시장 지수 실시간 스트리밍. `EventSource`로 연결.

```javascript
const source = new EventSource('/api/sse/market-indices');
source.onmessage = (event) => {
  const indices = JSON.parse(event.data);
};
```

## Rate Limiting

모든 `/api` 엔드포인트에 Rate Limiting 적용. AI 엔드포인트는 별도의 더 엄격한 제한 적용.
