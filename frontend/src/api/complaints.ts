import api from './http';
import type { ComplaintStatus, Complaint } from './types';

export const createComplaint = (payload: {
  guestName: string;
  guestPhone: string;
  message: string;
  rideRequestId?: number;
}) => api.post<Complaint>('/api/v1/complaints', payload);

export const getComplaints = (status?: ComplaintStatus, date?: string) =>
    api.get<Complaint[]>('/api/v1/complaints', {
      params: {
        ...(status ? { status } : {}),
        ...(date ? { date } : {}),
      }
    });

export const closeComplaint = (id: number, closedBy?: string) =>
    api.put<Complaint>(`/api/v1/complaints/${id}/close`, closedBy ? { closedBy } : {});

