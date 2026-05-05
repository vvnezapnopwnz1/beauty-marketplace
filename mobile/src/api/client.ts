import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';
import { AUTH_ENDPOINTS } from './endpoints';
import { LoginRequest, LoginResponse, TokenPair } from './types';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const tokenPair = useAuthStore.getState().tokenPair;
        if (tokenPair?.accessToken) {
          config.headers.Authorization = `Bearer ${tokenPair.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.axiosInstance(originalRequest);
            }).catch(() => {
              return Promise.reject(error);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newTokenPair = await this.refreshAccessToken();
            this.processQueue(null, newTokenPair.accessToken);
            originalRequest.headers.Authorization = `Bearer ${newTokenPair.accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            useAuthStore.getState().logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<TokenPair> {
    const refreshToken = useAuthStore.getState().tokenPair?.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.axiosInstance.post<{ tokenPair: TokenPair }>(
        AUTH_ENDPOINTS.verifyOTP,
        { refreshToken }
      );
      
      const newTokenPair = response.data.tokenPair;
      useAuthStore.getState().setTokenPair(newTokenPair);
      
      // Save to secure store
      await SecureStore.setItemAsync('tokenPair', JSON.stringify(newTokenPair));
      
      return newTokenPair;
    } catch (error) {
      throw new Error('Failed to refresh access token');
    }
  }

  private processQueue(error: unknown, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else if (token) {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  public async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.axiosInstance.post<LoginResponse>(
      AUTH_ENDPOINTS.verifyOTP,
      data
    );
    
    // Save tokens to secure store
    await SecureStore.setItemAsync('tokenPair', JSON.stringify(response.data.tokenPair));
    
    return response.data;
  }

  public async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('tokenPair');
  }

  public get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  public delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();