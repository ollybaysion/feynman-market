import axios from 'axios';
import { config } from '../config.js';
import { logger } from './logger.js';

class KISTokenManager {
  private token: string | null = null;
  private expiresAt = 0;

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 60_000) {
      return this.token;
    }

    if (!config.kis.appKey || !config.kis.appSecret) {
      throw new Error('KIS API credentials not configured');
    }

    try {
      const res = await axios.post(`${config.kis.baseUrl}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: config.kis.appKey,
        appsecret: config.kis.appSecret,
      });

      this.token = res.data.access_token;
      // Token typically valid for 24 hours
      this.expiresAt = Date.now() + 23 * 60 * 60 * 1000;
      logger.info('KIS API token refreshed');
      return this.token!;
    } catch (err) {
      logger.error('Failed to get KIS token', err);
      throw new Error('KIS authentication failed');
    }
  }

  invalidate() {
    this.token = null;
    this.expiresAt = 0;
  }
}

export const kisTokenManager = new KISTokenManager();
