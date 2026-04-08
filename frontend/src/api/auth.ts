import api from './http';
import type { AuthSession } from '../lib/auth';
import type { GuestLoginPayload, DriverLoginPayload, AdminLoginPayload } from './types';

export const guestLogin = (payload: GuestLoginPayload) =>
  api.post<AuthSession>('/api/v1/auth/guest-login', payload);

export const driverLogin = (payload: DriverLoginPayload) =>
  api.post<AuthSession>('/api/v1/auth/driver-login', payload);

export const adminLogin = (payload: AdminLoginPayload) =>
  api.post<AuthSession>('/api/v1/auth/admin-login', payload);

