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
  lastAssignedDriverName: string | null;
  lastAssignedDriverPhone: string | null;
  lastAssignedCabLicensePlate: string | null;
  dropoffOtp: string | null;
  magicLinkId: string | null;
  requestedAt: string;
  updatedAt: string | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  driverDeniedCount: number;
}

export interface Cab {
  id: number;
  licensePlate: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  tripsCompleted: number;
  tripsDenied: number;
  totalKm: number;
}

export interface Location {
  id: number;
  name: string;
  isMainVenue: boolean;
  distanceFromMainVenue: number;
}

export interface DriverAnalytics {
  cabId: number;
  driverName: string;
  licensePlate: string;
  totalKm: number;
  tripsCompleted: number;
  tripsDenied: number;
  averageAcceptanceTimeSeconds: number;
}

export type ComplaintStatus = 'OPEN' | 'CLOSED';

export type RideIncidentType = 'GUEST_CANCELLED' | 'DRIVER_DECLINED';

export interface CancelledQueueEntry {
  id: number;
  rideRequestId: number;
  incidentType: RideIncidentType;
  occurredAt: string;
  guestName: string;
  guestPhone: string;
  passengerCount: number;
  direction: 'TO_VENUE' | 'TO_HOTEL';
  locationName: string;
  customDestination: string | null;
  driverName: string | null;
  driverPhone: string | null;
  cabLicensePlate: string | null;
  driverDeniedCount: number | null;
}

export interface Complaint {
  id: number;
  guestName: string;
  guestPhone: string;
  message: string;
  status: ComplaintStatus;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
  rideRequest: RideRequest | null;
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

export interface PushSubscriptionPayload {
  endpoint: string;
  'keys.p256dh': string;
  'keys.auth': string;
  userPhone: string;
  userType: 'ADMIN' | 'DRIVER' | 'GUEST';
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

export const getCancelledRides = (date?: string) =>
    api.get<CancelledQueueEntry[]>('/api/v1/rides/cancelled', {
      params: date ? { date } : {}
    });

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
  imageUrl: string | null;
  startTime: string;
  endTime: string;
  location: Location;
}

export const getEvents = () =>
    api.get<EventItinerary[]>('/api/v1/events');

export const getEventById = (id: string) =>
    api.get<EventItinerary>(`/api/v1/events/${id}`);

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

// === Cab Endpoints ===

export const updateCabStatus = (phone: string, status: 'AVAILABLE' | 'OFFLINE') =>
    api.put<{ status: string; message: string }>('/api/v1/cabs/status', { phone, status });

export const getCabAnalytics = (cabId: number) =>
    api.get<DriverAnalytics>(`/api/v1/cabs/${cabId}/analytics`);

// === Complaint Endpoints ===

export const createComplaint = (payload: {
  guestName: string;
  guestPhone: string;
  message: string;
  rideRequestId?: number;
}) => api.post<Complaint>('/api/v1/complaints', payload);

export const getComplaints = (status?: ComplaintStatus) =>
    api.get<Complaint[]>('/api/v1/complaints', {
      params: status ? { status } : {}
    });

export const closeComplaint = (id: number, closedBy?: string) =>
    api.put<Complaint>(`/api/v1/complaints/${id}/close`, closedBy ? { closedBy } : {});

// === Notification Endpoints ===

export const getNotifications = (since?: string) =>
    api.get<AppNotification[]>('/api/v1/notifications', {
      params: since ? { since } : {}
    });

// === Push Notification Endpoints ===

export const subscribeToPush = (subscription: PushSubscriptionPayload) =>
    api.post('/api/v1/push/subscribe', subscription);

export const getVapidPublicKey = () =>
    api.get<{ vapidPublicKey: string }>('/api/v1/push/vapid-public-key');

// App config — admin phone + name, editable from the admin dashboard
export const getConfig = () =>
    api.get<{ adminPhone: string; adminName: string }>('/api/v1/config');

export const updateConfig = (payload: { adminPhone?: string; adminName?: string }) =>
    api.put<{ adminPhone: string; adminName: string }>('/api/v1/config', payload);

export default api;