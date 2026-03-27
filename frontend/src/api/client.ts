import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// === Ride Endpoints ===
export interface RideRequestPayload {
  guestName: string;
  guestPhone: string;
  passengerCount: number;
  direction: 'TO_VENUE' | 'TO_HOTEL';
  locationId: number;
}

export interface RideRequest {
  id: number;
  guestName: string;
  guestPhone: string;
  passengerCount: number;
  direction: 'TO_VENUE' | 'TO_HOTEL';
  status: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'ARRIVED' | 'COMPLETED';
  location: Location;
  cab: Cab | null;
  dropoffOtp: string | null;
  magicLinkId: string | null;
  requestedAt: string;
  assignedAt: string | null;
}

export interface Cab {
  id: number;
  licensePlate: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  status: 'AVAILABLE' | 'BUSY';
  tripsCompleted: number;
}

export interface Location {
  id: number;
  name: string;
  isMainVenue: boolean;
}

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

export const getLocations = () =>
  api.get<Location[]>('/api/v1/locations');

export interface AssignPayload {
  cabId: number;
  rideIds: number[];
}

export const assignRides = (payload: AssignPayload) =>
  api.post<{ magicLinkId: string; otp: string; cabLicensePlate: string; driverName: string; driverPhone: string }>(
    '/api/v1/dispatch/assign', payload
  );

export const completeTrip = (magicLinkId: string, otp: string) =>
  api.post<{ success: boolean; message: string }>(
    `/api/v1/dispatch/complete/${magicLinkId}`, { otp }
  );

export const updateTripStatus = (magicLinkId: string, status: string) =>
  api.post<{ message: string }>(
    `/api/v1/dispatch/status/${magicLinkId}`, { status }
  );

export default api;
