import api from './http';

export const getConfig = () =>
  api.get<{ adminPhone: string; adminName: string }>('/api/v1/config');

export const updateConfig = (payload: { adminPhone?: string; adminName?: string }) =>
  api.put<{ adminPhone: string; adminName: string }>('/api/v1/config', payload);

