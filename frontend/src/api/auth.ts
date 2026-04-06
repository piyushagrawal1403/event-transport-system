import api from './http';
import type { AuthSession } from '../lib/auth';
import type { RequestOtpPayload, RequestOtpResponse, VerifyOtpPayload, AdminLoginPayload } from './types';

export const requestOtp = (payload: RequestOtpPayload) =>
  api.post<RequestOtpResponse>('/api/v1/auth/request-otp', payload);

export const verifyOtp = (payload: VerifyOtpPayload) =>
  api.post<AuthSession>('/api/v1/auth/verify-otp', payload);

export const adminLogin = (payload: AdminLoginPayload) =>
  api.post<AuthSession>('/api/v1/auth/admin-login', payload);

