import api from './http';
import type {
  RideRequestPayload, RideRequest, Cab, Location, AssignPayload,
  RideIncidentType, CancelledQueueEntry, DriverAnalytics,
} from './types';

// === Ride Endpoints ===

export const createRide = (payload: RideRequestPayload) =>
    api.post<RideRequest>('/api/v1/rides', payload);

export const getPendingRides = () =>
    api.get<RideRequest[]>('/api/v1/rides/pending');

export const getGuestRides = (phone: string) =>
    api.get<RideRequest[]>('/api/v1/rides/guest', { params: { phone } });

export const getTripRides = (magicLinkId: string) =>
    api.get<RideRequest[]>(`/api/v1/rides/trip/${magicLinkId}`);

export const getCabs = () =>
    api.get<Cab[]>('/api/v1/cabs');

export const getCabActiveRides = (cabId: number) =>
    api.get<RideRequest[]>(`/api/v1/rides/cab/${cabId}`);

export const getCabCompletedRides = (cabId: number) =>
    api.get<RideRequest[]>(`/api/v1/rides/cab/${cabId}/completed`);

export const getOngoingRides = () =>
    api.get<RideRequest[]>('/api/v1/rides/ongoing');

export const getCancelledRides = (filters?: { date?: string; driver?: string; status?: RideIncidentType | '' }) =>
    api.get<CancelledQueueEntry[]>('/api/v1/rides/cancelled', {
      params: {
        ...(filters?.date ? { date: filters.date } : {}),
        ...(filters?.driver ? { driver: filters.driver } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      }
    });

export const getLocations = () =>
    api.get<Location[]>('/api/v1/locations');

export const cancelRide = (rideId: number) =>
    api.delete<RideRequest>(`/api/v1/rides/${rideId}`);

export const acceptRide = (rideId: number) =>
    api.put<RideRequest[]>(`/api/v1/rides/${rideId}/accept`);

export const denyRide = (rideId: number) =>
    api.put<RideRequest[]>(`/api/v1/rides/${rideId}/deny`);

// === Dispatch Endpoints ===

export const assignRides = (payload: AssignPayload) =>
    api.post<{ magicLinkId: string; otp: string; cabLicensePlate: string; driverName: string; driverPhone: string }>(
        '/api/v1/dispatch/assign', payload
    );

export const startTrip = (rideId: number, otp: string) =>
    api.post<{ success: boolean; message: string }>(
        `/api/v1/dispatch/start/${rideId}`, { otp }
    );

export const completeTrip = (rideId: number) =>
    api.post<{ success: boolean; message: string }>(
        `/api/v1/dispatch/complete/${rideId}`
    );

export const updateTripStatus = (magicLinkId: string, status: string) =>
    api.post<{ message: string }>(
        `/api/v1/dispatch/status/${magicLinkId}`, { status }
    );

export const markArrived = (rideId: number) =>
    api.post<{ success: boolean; message: string }>(
        `/api/v1/dispatch/arrive/${rideId}`
    );

// === Cab Endpoints ===

export const updateCabStatus = (phone: string, status: 'AVAILABLE' | 'OFFLINE') =>
    api.put<{ status: string; message: string }>('/api/v1/cabs/status', { phone, status });

export const getCabAnalytics = (cabId: number) =>
    api.get<DriverAnalytics>(`/api/v1/cabs/${cabId}/analytics`);

