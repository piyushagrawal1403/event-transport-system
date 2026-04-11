import api from './http';
import type { EventItinerary, AppNotification } from './types';

export const getEvents = () =>
    api.get<EventItinerary[]>('/api/v1/events');

export const getEventById = (id: string) =>
    api.get<EventItinerary>(`/api/v1/events/${id}`);

export const uploadEventImage = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<{ imageUrl: string }>('/api/v1/events/images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const createEvent = (payload: {
  title: string;
  description: string | null;
  imageUrl: string | null;
  startTime: string;
  endTime: string;
  locationId: number;
  notifyGuests?: boolean;
}) => api.post<EventItinerary>('/api/v1/events', payload);

export const updateEvent = (id: string, payload: {
  title: string;
  description: string | null;
  imageUrl: string | null;
  startTime: string;
  endTime: string;
  locationId: number;
  notifyGuests?: boolean;
}) => api.put<EventItinerary>(`/api/v1/events/${id}`, payload);

export const deleteEvent = (id: string) =>
  api.delete<void>(`/api/v1/events/${id}`);

// === Notification Endpoints ===

export const getNotifications = (since?: string) =>
    api.get<AppNotification[]>('/api/v1/notifications', {
      params: since ? { since } : {}
    });

