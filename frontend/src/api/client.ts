// Barrel re-export — import from here or from the individual domain files directly.
// All domain modules are also importable individually for new code.

export { isUnauthorizedError } from './http';
export type { AuthSession } from '../lib/auth';

// Auth
export { guestLogin, driverLogin, adminLogin } from './auth';

// Rides, dispatch, cabs, locations
export {
  createRide, getPendingRides, getGuestRides, getTripRides,
  getCabs, getCabActiveRides, getCabCompletedRides, getOngoingRides, getCancelledRides,
  getLocations, cancelRide, acceptRide, denyRide,
  assignRides, startTrip, completeTrip, updateTripStatus, markArrived,
  updateCabStatus, getCabAnalytics,
  createCab, updateCab, deleteCab,
  createLocation, updateLocation, deleteLocation,
  getMasterDataSnapshot, refreshMasterDataSnapshot,
} from './rides';

// Events & Notifications
export { getEvents, getEventById, uploadEventImage, createEvent, updateEvent, getNotifications } from './events';

// Complaints
export { createComplaint, getComplaints, getMyComplaints, closeComplaint } from './complaints';

// Push
export { subscribeToPush, unsubscribeFromPush, getVapidPublicKey, getAdminPushSubscriptions, sendAdminTestPush } from './push';

// Reports
export { getAdminDailyReport, exportCancelledQueueCsv, exportDriverAnalyticsCsv, exportComplaintsCsv } from './reports';

// Config
export { getConfig, updateConfig } from './config';

// All shared types
export type {
  GuestLoginPayload, DriverLoginPayload, AdminLoginPayload,
  RideRequest, RideRequestPayload, RideStatus,
  Cab, Location, AssignPayload, RideIncidentType, CancelledQueueEntry,
  DriverAnalytics, TopDriver, AdminDailyReport,
  EventItinerary, MasterDataSnapshot,
  ComplaintStatus, ComplaintCategory, Complaint,
  AppNotification,
  PushSubscriptionPayload, PushSubscriptionEntry,
} from './types';

export { default } from './http';

