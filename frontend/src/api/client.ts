import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// === Types ===

export interface RideRequestPayload {
  guestName: string;
  guestPhone: string;
  passengerCount: number;
  direction: 'TO_VENUE' | 'TO_HOTEL';
  locationId: number;
  customDestination?: string; // required when locationId points to "Others"
}

export type RideStatus =
    | 'PENDING'
    | 'OFFERED'    // dispatched to driver, awaiting consent
    | 'ACCEPTED'   // driver accepted, awaiting guest OTP at pickup
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'COMPLETED'
    | 'CANCELLED';

export interface RideRequest {
  id: number;
  guestName: string;
  guestPhone: string;
  passengerCount: number;
  direction: 'TO_VENUE' | 'TO_HOTEL';
  status: RideStatus;
  location: Location;
  customDestination: string | null; // populated when location is "Others"
  cab: Cab | null;
  dropoffOtp: string | null;
  magicLinkId: string | null;
  requestedAt: string;
  assignedAt: string | null;
  acceptedAt: string | null;
}

export interface Cab {
  id: number;
  licensePlate: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  tripsCompleted: number;
}

export interface Location {
  id: number;
  name: string;
  isMainVenue: boolean;
}

export interface AppNotification {
  id: number;
  message: string;
  createdAt: string;
  dismissed: boolean;
}

export interface AssignPayload {
  cabId: number;
  rideIds: number[];
}

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

export const getLocations = () =>
    api.get<Location[]>('/api/v1/locations');

export const cancelRide = (rideId: number) =>
    api.delete<RideRequest>(`/api/v1/rides/${rideId}`);

// Driver consent — operate on a single ride ID; backend cascades to full batch
export const acceptRide = (rideId: number) =>
    api.put<RideRequest[]>(`/api/v1/rides/${rideId}/accept`);

export const denyRide = (rideId: number) =>
    api.put<RideRequest[]>(`/api/v1/rides/${rideId}/deny`);

// === Dispatch Endpoints ===

export const assignRides = (payload: AssignPayload) =>
    api.post<{ magicLinkId: string; otp: string; cabLicensePlate: string; driverName: string; driverPhone: string }>(
        '/api/v1/dispatch/assign', payload
    );

// OTP is now verified at trip START, not drop-off
export const startTrip = (rideId: number, otp: string) =>
    api.post<{ success: boolean; message: string }>(
        `/api/v1/dispatch/start/${rideId}`, { otp }
    );

// Complete trip — no OTP required at drop-off
export const completeTrip = (rideId: number) =>
    api.post<{ success: boolean; message: string }>(
        `/api/v1/dispatch/complete/${rideId}`
    );

export const updateTripStatus = (magicLinkId: string, status: string) =>
    api.post<{ message: string }>(
        `/api/v1/dispatch/status/${magicLinkId}`, { status }
    );

// Mark ride as arrived at pickup (ACCEPTED → ARRIVED)
export const markArrived = (rideId: number) =>
    api.post<{ success: boolean; message: string }>(
        `/api/v1/dispatch/arrive/${rideId}`
    );

// === Event Itinerary Endpoints ===

export interface EventItinerary {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: Location;
}

export const getEvents = () =>
    api.get<EventItinerary[]>('/api/v1/events');

// === Cab Endpoints ===

export const updateCabStatus = (phone: string, status: 'AVAILABLE' | 'OFFLINE') =>
    api.put<{ status: string; message: string }>('/api/v1/cabs/status', { phone, status });

// === Notification Endpoints ===

export const getNotifications = (since?: string) =>
    api.get<AppNotification[]>('/api/v1/notifications', {
      params: since ? { since } : {}
    });

// === Push Notification Endpoints ===

export const subscribeToPush = (subscription: any) =>
    api.post('/api/v1/push/subscribe', subscription);

export const getVapidPublicKey = () =>
    api.get<{ vapidPublicKey: string }>('/api/v1/push/vapid-public-key');

export default api;