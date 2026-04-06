import { useState, useCallback, useEffect } from 'react';
import {
  getPendingRides, getCabs, getOngoingRides, getEvents, getLocations,
  getCancelledRides, getComplaints, getConfig,
  isUnauthorizedError,
  type Cab, type RideRequest, type EventItinerary, type Location,
  type Complaint, type CancelledQueueEntry, type RideIncidentType, type ComplaintStatus
} from '../../../api/client';
import { type LocationGroup, DEFAULT_CAB_CAPACITY } from '../types';

export interface AdminPollingState {
  groups: LocationGroup[];
  cabs: Cab[];
  ongoingRides: RideRequest[];
  cancelledRides: CancelledQueueEntry[];
  events: EventItinerary[];
  complaints: Complaint[];
  locations: Location[];
  loading: boolean;
  unauthorized: boolean;
  lastRefresh: Date;
  settingsForm: { adminName: string; adminPhone: string };
}

export interface CancelledFilters {
  selectedCancelledDate: string;
  cancelledDriverFilter: string;
  cancelledStatusFilter: RideIncidentType | '';
}

export interface ComplaintFilters {
  complaintStatusFilter: ComplaintStatus | '';
  complaintDateFilter: string;
}

export interface AdminPollingActions {
  fetchData: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  setSettingsForm: React.Dispatch<React.SetStateAction<{ adminName: string; adminPhone: string }>>;
}

export function useAdminPolling(
  cancelledFilters: CancelledFilters,
  complaintFilters: ComplaintFilters,
): AdminPollingState & AdminPollingActions {
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [cabs, setCabs] = useState<Cab[]>([]);
  const [ongoingRides, setOngoingRides] = useState<RideRequest[]>([]);
  const [cancelledRides, setCancelledRides] = useState<CancelledQueueEntry[]>([]);
  const [events, setEvents] = useState<EventItinerary[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [settingsForm, setSettingsForm] = useState({ adminName: '', adminPhone: '' });

  const fetchData = useCallback(async () => {
    try {
      setUnauthorized(false);
      const [ridesRes, cabsRes, ongoingRes, cancelledRes, complaintsRes] = await Promise.allSettled([
        getPendingRides(),
        getCabs(),
        getOngoingRides(),
        getCancelledRides({
          date: cancelledFilters.selectedCancelledDate,
          driver: cancelledFilters.cancelledDriverFilter.trim() || undefined,
          status: cancelledFilters.cancelledStatusFilter || undefined,
        }),
        getComplaints(complaintFilters.complaintStatusFilter || undefined, complaintFilters.complaintDateFilter || undefined)
      ]);

      const firstUnauthorized = [ridesRes, cabsRes, ongoingRes, cancelledRes, complaintsRes]
        .find((result) => result.status === 'rejected' && isUnauthorizedError(result.reason));
      if (firstUnauthorized) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      if (cabsRes.status === 'fulfilled') setCabs(cabsRes.value.data);
      if (ongoingRes.status === 'fulfilled') setOngoingRides(ongoingRes.value.data);
      if (cancelledRes.status === 'fulfilled') setCancelledRides(cancelledRes.value.data);
      if (complaintsRes.status === 'fulfilled') setComplaints(complaintsRes.value.data);
      const ridesData = ridesRes.status === 'fulfilled' ? ridesRes.value.data : [];

      const now = new Date();
      const groupMap = new Map<number, LocationGroup>();

      for (const ride of ridesData) {
        const locId = ride.location.id;
        if (!groupMap.has(locId)) {
          groupMap.set(locId, {
            locationId: locId,
            locationName: ride.location.name,
            rides: [],
            totalPax: 0,
            hasTimedOut: false,
            isFull: false,
          });
        }
        const group = groupMap.get(locId)!;
        group.rides.push(ride);
        group.totalPax += ride.passengerCount;

        const waitMinutes = (now.getTime() - new Date(ride.requestedAt).getTime()) / 60000;
        if (waitMinutes >= 15) group.hasTimedOut = true;
      }

      for (const group of groupMap.values()) {
        if (group.totalPax >= DEFAULT_CAB_CAPACITY) group.isFull = true;
      }

      const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
        if (a.hasTimedOut !== b.hasTimedOut) return a.hasTimedOut ? -1 : 1;
        if (a.isFull !== b.isFull) return a.isFull ? -1 : 1;
        return b.totalPax - a.totalPax;
      });

      setGroups(sortedGroups);
      setLastRefresh(new Date());
    } catch {
      // Retry on next interval
    } finally {
      setLoading(false);
    }
  }, [
    cancelledFilters.selectedCancelledDate,
    cancelledFilters.cancelledDriverFilter,
    cancelledFilters.cancelledStatusFilter,
    complaintFilters.complaintDateFilter,
    complaintFilters.complaintStatusFilter,
  ]);

  const fetchEvents = useCallback(async () => {
    try {
      const [evRes, locRes] = await Promise.allSettled([getEvents(), getLocations()]);
      if (evRes.status === 'fulfilled') setEvents(evRes.value.data);
      if (locRes.status === 'fulfilled') setLocations(locRes.value.data);
    } catch {
      // Retry on next refresh
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchEvents();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData, fetchEvents]);

  // Load admin settings into the settings form
  useEffect(() => {
    getConfig().then(r => setSettingsForm({ adminName: r.data.adminName, adminPhone: r.data.adminPhone })).catch(() => {});
  }, []);

  return {
    groups,
    cabs,
    ongoingRides,
    cancelledRides,
    events,
    complaints,
    locations,
    loading,
    unauthorized,
    lastRefresh,
    settingsForm,
    fetchData,
    fetchEvents,
    setSettingsForm,
  };
}

