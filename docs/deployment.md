# Deployment

## Railway 배포

### 1. 프로젝트 생성

1. [railway.app](https://railway.app) 접속 → GitHub 로그인
2. **New Project** → **Deploy from GitHub repo** → `ollybaysion/feynman-market` 선택
3. `railway.toml`이 자동 감지되어 Dockerfile 빌드 시작

### 2. 환경변수 설정

Railway 대시보드 → **Variables** 탭에서 추가:

```
NODE_ENV=production
KIS_APP_KEY=<your-key>
KIS_APP_SECRET=<your-secret>
FINNHUB_API_KEY=<your-key>
TWELVE_DATA_API_KEY=<your-key>
NAVER_CLIENT_ID=<your-id>
NAVER_CLIENT_SECRET=<your-secret>
ANTHROPIC_API_KEY=<your-key>
DATABASE_PATH=/data/market.db
```

> `PORT`는 Railway가 자동 주입하므로 설정 불필요.

### 3. 볼륨 마운트

SQLite DB를 재배포 시에도 유지하려면:

Railway 대시보드 → **Settings** → **Volumes**:
- **Mount Path**: `/data`

### 4. 도메인

Railway 대시보드 → **Settings** → **Networking** → **Generate Domain**

기본 도메인: `*.up.railway.app`

커스텀 도메인도 설정 가능.

### 5. 자동 배포

`main` 브랜치에 push하면 자동으로 빌드 & 배포됩니다.

## Docker 로컬 실행

```bash
# 빌드
docker build -t feynman-market .

# 실행
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e KIS_APP_KEY=xxx \
  -e FINNHUB_API_KEY=xxx \
  -e ANTHROPIC_API_KEY=xxx \
  -v market-data:/data \
  feynman-market
```

## GitHub Actions CI

`.github/workflows/ci.yml`에서 `main` push/PR 시 자동 실행:

1. Backend 빌드 (TypeScript 컴파일)
2. Frontend 빌드 (Vite 번들링)
3. Docker 이미지 빌드 테스트

## 빌드 구조

```
Dockerfile (Multi-stage)
├── Stage 1: frontend-build    npm ci + vite build
├── Stage 2: backend-build     npm ci + tsc
└── Stage 3: production        npm ci --omit=dev + 빌드 결과물 복사
```

프로덕션 이미지에서 Express가 프론트엔드 정적 파일도 함께 서빙합니다 (단일 서비스).
