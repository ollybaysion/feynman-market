import cron from 'node-cron';
import { logger } from '../utils/logger.js';

export function startScheduler() {
  // Refresh market data every 5 minutes during KR market hours (9:00-15:30 KST = 0:00-6:30 UTC)
  cron.schedule('*/5 0-7 * * 1-5', () => {
    logger.info('Scheduled: Refreshing Korean market data');
    // Will be implemented when market data service is complete
  }, { timezone: 'UTC' });

  // Refresh market data every 5 minutes during US market hours (9:30-16:00 EST = 14:30-21:00 UTC)
  cron.schedule('*/5 14-21 * * 1-5', () => {
    logger.info('Scheduled: Refreshing US market data');
  }, { timezone: 'UTC' });

  logger.info('Scheduler started');
}
