import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AUTH } from './endpoints';
import { ApiError, fromAxiosError } from './errors';
import { useAuthStore } from '../stores/authStore';

type PendingRequest = {
  config: AxiosRequestConfig;
  resolve: (r: AxiosResponse) => void;
  reject: (e: any) => void;
};

const instance: AxiosInstance = axios.create({
  // callers use full URLs from endpoints, so no baseURL here
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let queue: PendingRequest[] = [];

function processQueue(error: any, token?: string) {
  queue.forEach(({ resolve, reject, config }) => {
    if (error) reject(error);
    else if (token) {
      config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token}` };
      resolve(instance.request(config as AxiosRequestConfig) as unknown as AxiosResponse);
    }
  });
  queue = [];
}

async function refreshToken(refreshToken: string) {
  const resp = await axios.post(
    AUTH.refresh,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return resp.data as { accessToken: string; refreshToken: string; expiresAt?: number };
}

instance.interceptors.request.use((config) => {
  const tokenPair = useAuthStore.getState().tokenPair;
  if (tokenPair?.accessToken) {
    config.headers = { ...config.headers, Authorization: `Bearer ${tokenPair.accessToken}` } as any;
  }
  return config;
});

instance.interceptors.response.use(
  (r) => r,
  async (err) => {
    const originalConfig = err.config as AxiosRequestConfig & { _retry?: boolean };
    if (!originalConfig) return Promise.reject(fromAxiosError(err));

    const status = err.response?.status;
    if (status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;
      const refresh = useAuthStore.getState().tokenPair?.refreshToken;
      if (!refresh) {
        useAuthStore.getState().logout();
        return Promise.reject(fromAxiosError(err));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ config: originalConfig, resolve, reject });
        });
      }

      isRefreshing = true;
      try {
        const tokens = await refreshToken(refresh);
        useAuthStore.getState().setTokenPair({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        processQueue(null, tokens.accessToken);
        return instance.request(originalConfig);
      } catch (e) {
        processQueue(e, undefined);
        useAuthStore.getState().logout();
        return Promise.reject(fromAxiosError(e));
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(fromAxiosError(err));
  },
);

export async function apiRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
  try {
    const resp = await instance.request<T>(config);
    return resp.data;
  } catch (e) {
    throw fromAxiosError(e);
  }
}

export default instance;
// end of file