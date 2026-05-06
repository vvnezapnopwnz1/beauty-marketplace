import { apiRequest } from './client';
import { AUTH, USER } from './endpoints';
import type { MeResponse, OTPRequestPayload, VerifyOtpPayload, VerifyOtpResponse } from './types';

export const authApi = {
  requestOtp: async (payload: OTPRequestPayload) => {
    try {
      return await apiRequest<{ expiresAt: string }>({
        url: AUTH.requestOTP,
        method: 'post',
        data: payload,
      });
    } catch (error) {
      console.log('requestOtp', AUTH.requestOTP);
      console.log('payload', payload);
      console.log('method', 'post');
      console.log('data', payload);
      console.error('requestOtp', error);
      throw new Error('Failed to request OTP');
    }
  },

  verifyOtp: async (payload: VerifyOtpPayload) => {
    try {
      console.log('verifyOtp', AUTH.verifyOTP);
      console.log('payload', payload);
      console.log('method', 'post');
      console.log('data', payload);
      return await apiRequest<VerifyOtpResponse>({
        url: AUTH.verifyOTP,
        method: 'post',
        data: payload,
      });
    } catch (error) {
      console.log('verifyOtp', AUTH.verifyOTP);
      console.log('payload', payload);
      console.log('method', 'post');
      console.log('data', payload);
      console.error('verifyOtp', error);
      throw new Error('Failed to verify OTP');
    }
  },

  fetchMe: async () => {
    try {
      console.log('fetchMe', USER.me);
      console.log('method', 'get');
      return await apiRequest<MeResponse>({
        url: USER.me,
        method: 'get',
      });
    } catch (error) {
      console.log('fetchMe', USER.me);
      console.log('method', 'get');
      console.error('fetchMe', error);
      throw new Error('Failed to fetch me');
    }
  },
};

