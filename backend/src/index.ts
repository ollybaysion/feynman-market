import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import fs from 'fs';
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

// Trust proxy (Railway runs behind a reverse proxy)
app.set('trust proxy', 1);

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

// 프론트엔드 정적 파일 서빙 (빌드된 파일이 있으면 항상 서빙)
const frontendDist = process.env.FRONTEND_DIST_PATH
  || path.join(__dirname, '../../frontend/dist');
const indexHtml = path.join(frontendDist, 'index.html');
const frontendExists = fs.existsSync(indexHtml);
logger.info(`Frontend path: ${frontendDist} (exists: ${frontendExists}), NODE_ENV: ${config.nodeEnv}`);
if (frontendExists) {
  app.use(express.static(frontendDist, { index: 'index.html' }));
  // SPA 라우팅: /api 외 모든 경로를 index.html로 처리
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}

// Error handler
app.use(errorHandler);

// Initialize and start
async function start() {
  try {
    await initDatabase();
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
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await closeDatabase();
  process.exit(0);
});

start();
