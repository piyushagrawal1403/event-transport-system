import api from './http';
import type { ComplaintStatus, Complaint, ComplaintCategory } from './types';

export const createComplaint = (payload: {
  guestName: string;
  guestPhone: string;
  category: ComplaintCategory;
  message: string;
  rideRequestId?: number;
}) => api.post<Complaint>('/api/v1/complaints', payload);

export const getMyComplaints = () => api.get<Complaint[]>('/api/v1/complaints/mine');

export const getComplaints = (status?: ComplaintStatus, date?: string) =>
    api.get<Complaint[]>('/api/v1/complaints', {
      params: {
        ...(status ? { status } : {}),
        ...(date ? { date } : {}),
      }
    });

export const closeComplaint = (id: number, closedBy?: string) =>
    api.put<Complaint>(`/api/v1/complaints/${id}/close`, closedBy ? { closedBy } : {});

