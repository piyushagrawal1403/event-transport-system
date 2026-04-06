import api from './http';
import type { AdminDailyReport, ComplaintStatus, RideIncidentType } from './types';

export const getAdminDailyReport = (date?: string) =>
    api.get<AdminDailyReport>('/api/v1/admin/reports/daily', {
      params: date ? { date } : {}
    });

export const exportCancelledQueueCsv = (filters?: { date?: string; driver?: string; status?: RideIncidentType | '' }) =>
    api.get<Blob>('/api/v1/admin/reports/exports/cancelled-queue', {
      params: {
        ...(filters?.date ? { date: filters.date } : {}),
        ...(filters?.driver ? { driver: filters.driver } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      responseType: 'blob',
    });

export const exportDriverAnalyticsCsv = () =>
    api.get<Blob>('/api/v1/admin/reports/exports/driver-analytics', {
      responseType: 'blob',
    });

export const exportComplaintsCsv = (filters?: { status?: ComplaintStatus; date?: string }) =>
    api.get<Blob>('/api/v1/admin/reports/exports/complaints', {
      params: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.date ? { date: filters.date } : {}),
      },
      responseType: 'blob',
    });

