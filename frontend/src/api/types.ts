import { type UserRole } from '../lib/auth';

// === Auth Types ===

export interface GuestLoginPayload {
  name: string;
  phone: string;
  recaptchaToken: string;
}

export interface DriverLoginPayload {
  phone: string;
  recaptchaToken: string;
}

export interface AdminLoginPayload {
  username: string;
  password: string;
}

// === Ride Types ===

export interface RideRequestPayload {
  guestName: string;
  guestPhone: string;
  passengerCount: number;
  direction: 'TO_VENUE' | 'TO_HOTEL';
  locationId: number;
  customDestination?: string;
}

export type RideStatus =
    | 'PENDING'
    | 'OFFERED'
    | 'ACCEPTED'
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
  customDestination: string | null;
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

export interface AssignPayload {
  cabId: number;
  rideIds: number[];
}

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

// === Analytics Types ===

export interface DriverAnalytics {
  cabId: number;
  driverName: string;
  licensePlate: string;
  totalKm: number;
  tripsCompleted: number;
  tripsDenied: number;
  averageAcceptanceTimeSeconds: number;
}

export interface TopDriver {
  cabId: number;
  driverName: string;
  licensePlate: string;
  tripsCompleted: number;
  totalKm: number;
}

export interface AdminDailyReport {
  date: string;
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  driverDeclinedCount: number;
  openComplaints: number;
  closedComplaints: number;
  topDriversByTrips: TopDriver[];
  topDriversByKm: TopDriver[];
}

// === Event Types ===

export interface EventItinerary {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startTime: string;
  endTime: string;
  location: Location;
}

// === Complaint Types ===

export type ComplaintStatus = 'OPEN' | 'CLOSED';
export type ComplaintCategory = 'RIDE' | 'HOTEL' | 'DRIVER_BEHAVIOR' | 'APP_ISSUE' | 'OTHERS';

export interface Complaint {
  id: number;
  guestName: string;
  guestPhone: string;
  category: ComplaintCategory;
  message: string;
  status: ComplaintStatus;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
  rideRequest: RideRequest | null;
}

// === Notification Types ===

export interface AppNotification {
  id: number;
  message: string;
  createdAt: string;
  dismissed: boolean;
}

// === Push Types ===

export interface PushSubscriptionPayload {
  endpoint: string;
  'keys.p256dh': string;
  'keys.auth': string;
  userPhone: string;
  userType: UserRole;
}

export interface PushSubscriptionEntry {
  id: number;
  userType: string;
  userPhone: string;
  subscribedAt: string | null;
  endpointSuffix: string;
}

