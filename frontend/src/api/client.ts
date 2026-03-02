import axios from 'axios';
import { API_BASE } from '../utils/constants';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || '요청에 실패했습니다.';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);
