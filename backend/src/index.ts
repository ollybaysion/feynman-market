import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDatabase, closeDatabase } from './database.js';
import { apiLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import apiRouter from './routes/index.js';
import { startScheduler } from './jobs/scheduler.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = config.nodeEnv === 'production';

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: isProd
    ? process.env.ALLOWED_ORIGIN || true   // 프로덕션: 환경변수로 허용 도메인 지정
    : ['http://localhost:3000', 'http://localhost:5173'],
}));
app.use(compression());
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json());

// Rate limiting
app.use('/api', apiLimiter);

// API routes
app.use('/api', apiRouter);

// 프로덕션: 빌드된 프론트엔드 정적 파일 서빙
if (isProd) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // SPA 라우팅: /api 외 모든 경로를 index.html로 처리
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Initialize and start
async function start() {
  try {
    initDatabase();
    startScheduler();

    app.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  closeDatabase();
  process.exit(0);
});

start();
