import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, Users, Clock, MapPin, CheckCircle2, AlertTriangle,
  RefreshCw, Send, ChevronDown, ChevronUp, Navigation, Award, Flag, Bell, BellRing,
  Settings, Save, Phone, User, X, MessageSquare, Gauge, LogOut
} from 'lucide-react';
import {
  getPendingRides, getCabs, assignRides, getOngoingRides, getEvents, getLocations, cancelRide,
  getConfig, updateConfig, getCancelledRides, getCabAnalytics,
  getComplaints, closeComplaint, createEvent, updateEvent, uploadEventImage,
  exportCancelledQueueCsv, exportDriverAnalyticsCsv, exportComplaintsCsv,
  isUnauthorizedError,
  type RideRequest, type Cab, type EventItinerary, type Location, type DriverAnalytics,
  type Complaint, type CancelledQueueEntry, type RideIncidentType, type ComplaintStatus
} from '../../api/client';
import { clearAuthSession, getAuthSession } from '../../lib/auth';
import { pushNotificationService } from '../../services/PushNotificationService';

interface LocationGroup {
  locationId: number;
  locationName: string;
  rides: DashboardRideRequest[];
  totalPax: number;
  hasTimedOut: boolean;
  isFull: boolean;
}

type DashboardRideRequest = RideRequest & { driverDeniedCount?: number };

// Badge colours for every possible ride status
const STATUS_BADGE: Record<string, string> = {
  PENDING:    'bg-gray-700 text-gray-300',
  OFFERED:    'bg-orange-900 text-orange-200',
  ACCEPTED:   'bg-blue-900 text-blue-200',
  IN_TRANSIT: 'bg-yellow-900 text-yellow-200',
  ARRIVED:    'bg-teal-900 text-teal-200',
  COMPLETED:  'bg-green-900 text-green-200',
  CANCELLED:  'bg-red-900 text-red-200',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const adminSession = getAuthSession();
  const adminPhone = adminSession?.user.phone || 'admin';
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [cabs, setCabs] = useState<Cab[]>([]);
  const [selectedRides, setSelectedRides] = useState<Map<number, number>>(new Map());
  const [selectedCabId, setSelectedCabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showFleet, setShowFleet] = useState(true);
  const [assignResult, setAssignResult] = useState<{ magicLinkId: string; otp: string } | null>(null);
  const [ongoingRides, setOngoingRides] = useState<RideRequest[]>([]);
  const [cancelledRides, setCancelledRides] = useState<CancelledQueueEntry[]>([]);
  const [events, setEvents] = useState<EventItinerary[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showEvents, setShowEvents] = useState(true);
  const [showCancelledQueue, setShowCancelledQueue] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const [eventImageError, setEventImageError] = useState('');
  const [selectedCancelledDate, setSelectedCancelledDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  });
  const [cancelledDriverFilter, setCancelledDriverFilter] = useState('');
  const [cancelledStatusFilter, setCancelledStatusFilter] = useState<RideIncidentType | ''>('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatus | ''>('');
  const [complaintDateFilter, setComplaintDateFilter] = useState('');
  const [eventForm, setEventForm] = useState({ title: '', description: '', imageUrl: '', startTime: '', endTime: '', locationId: '', notifyGuests: false });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [analyticsModal, setAnalyticsModal] = useState<DriverAnalytics | null>(null);
  const [loadingAnalyticsCabId, setLoadingAnalyticsCabId] = useState<number | null>(null);
  const [adminPushPermission, setAdminPushPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [adminPushEnabled, setAdminPushEnabled] = useState(false);
  const [enablingAdminPush, setEnablingAdminPush] = useState(false);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ adminName: '', adminPhone: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const DEFAULT_CAB_CAPACITY = 4;

  const fetchData = useCallback(async () => {
    try {
      setUnauthorized(false);
      const [ridesRes, cabsRes, ongoingRes, cancelledRes, complaintsRes] = await Promise.allSettled([
        getPendingRides(),
        getCabs(),
        getOngoingRides(),
        getCancelledRides({
          date: selectedCancelledDate,
          driver: cancelledDriverFilter.trim() || undefined,
          status: cancelledStatusFilter || undefined,
        }),
        getComplaints(complaintStatusFilter || undefined, complaintDateFilter || undefined)
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
  }, [selectedCancelledDate, cancelledDriverFilter, cancelledStatusFilter, complaintDateFilter, complaintStatusFilter]);

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

  const ensureAdminPushSubscription = useCallback(async () => {
    await pushNotificationService.initialize();

    if (typeof Notification === 'undefined') {
      setAdminPushPermission('unsupported');
      setAdminPushEnabled(false);
      return;
    }

    const permission = Notification.permission;
    setAdminPushPermission(permission);

    if (permission === 'granted') {
      const subscribed = await pushNotificationService.subscribeUser(adminPhone, 'ADMIN', {
        permissionAlreadyGranted: true,
      });
      setAdminPushEnabled(subscribed);
    } else {
      setAdminPushEnabled(false);
    }
  }, [adminPhone]);

  // Keep admin notifications auto-on by re-checking subscription state
  useEffect(() => {
    ensureAdminPushSubscription();

    const onFocus = () => { ensureAdminPushSubscription(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensureAdminPushSubscription();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(() => {
      if (!adminPushEnabled) {
        ensureAdminPushSubscription();
      }
    }, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [adminPushEnabled, ensureAdminPushSubscription]);

  const handleEnableAdminNotifications = async () => {
    setEnablingAdminPush(true);
    try {
      await pushNotificationService.initialize();
      const granted = await pushNotificationService.requestPermission();
      setAdminPushPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

      if (!granted) {
        setAdminPushEnabled(false);
        return;
      }

      const subscribed = await pushNotificationService.subscribeUser(adminPhone, 'ADMIN', {
        permissionAlreadyGranted: true,
      });
      setAdminPushEnabled(subscribed);
    } catch (error) {
      console.error('Failed to enable admin push notifications:', error);
      setAdminPushEnabled(false);
    } finally {
      setEnablingAdminPush(false);
    }
  };

  const toggleRide = (rideId: number, paxCount: number) => {
    setSelectedRides(prev => {
      const next = new Map(prev);
      if (next.has(rideId)) { next.delete(rideId); } else { next.set(rideId, paxCount); }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedRides.size === 0 || !selectedCabId) return;
    setAssigning(true);
    try {
      const res = await assignRides({ cabId: selectedCabId, rideIds: Array.from(selectedRides.keys()) });
      setAssignResult({ magicLinkId: res.data.magicLinkId, otp: res.data.otp });

      console.log('=== DISPATCH PAYLOAD ===');
      console.log(`Driver: ${res.data.driverName}`);
      console.log(`Phone: ${res.data.driverPhone}`);
      console.log(`Cab: ${res.data.cabLicensePlate}`);
      console.log(`Magic Link: ${window.location.origin}/d/${res.data.magicLinkId}`);
      console.log(`OTP (given to guest): ${res.data.otp}`);
      console.log('========================');

      setSelectedRides(new Map());
      setSelectedCabId(null);
      await fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setAssignResult(null), 10000);
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          || 'Failed to assign rides. Check console for details.';
      alert(errorMsg);
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsForm.adminName.trim() || !settingsForm.adminPhone.trim()) return;
    setSavingSettings(true);
    try {
      await updateConfig({ adminName: settingsForm.adminName.trim(), adminPhone: settingsForm.adminPhone.trim() });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      alert('Failed to save settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const getDatePart = (value: string) => (value ? value.slice(0, 10) : '');
  const getTimePart = (value: string) => (value ? value.slice(11, 16) : '');

  const updateEventDateTime = (field: 'startTime' | 'endTime', part: 'date' | 'time', value: string) => {
    setEventForm((current) => {
      const existing = current[field];
      const date = part === 'date' ? value : (getDatePart(existing) || new Date().toISOString().slice(0, 10));
      const time = part === 'time' ? value : (getTimePart(existing) || (field === 'startTime' ? '09:00' : '10:00'));
      return {
        ...current,
        [field]: date && time ? `${date}T${time}` : existing,
      };
    });
  };

  const availableCabs = cabs.filter(c => c.status === 'AVAILABLE');
  const openComplaintsCount = complaints.filter(c => c.status === 'OPEN').length;
  const selectedPaxCount = Array.from(selectedRides.values()).reduce((sum, pax) => sum + pax, 0);
  const selectedCab = cabs.find(c => c.id === selectedCabId);
  const isOverCapacity = selectedCab ? selectedPaxCount > selectedCab.capacity : false;

  const getWaitTime = (requestedAt: string) => {
    const totalSecs = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 1000);
    if (totalSecs < 60) return `${totalSecs}s`;
    return `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;
  };

  const formatAcceptanceTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    const mins = Math.floor(seconds / 60);
    const remSecs = Math.round(seconds % 60);
    return `${mins}m ${remSecs}s`;
  };

  const openDriverAnalytics = async (cabId: number) => {
    setLoadingAnalyticsCabId(cabId);
    try {
      const res = await getCabAnalytics(cabId);
      setAnalyticsModal(res.data);
    } catch {
      alert('Failed to load driver analytics.');
    } finally {
      setLoadingAnalyticsCabId(null);
    }
  };

  const handleCloseComplaint = async (complaintId: number) => {
    try {
      await closeComplaint(complaintId, settingsForm.adminName || 'admin');
      await fetchData();
    } catch {
      alert('Failed to close complaint.');
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCancelledQueue = async () => {
    try {
      const res = await exportCancelledQueueCsv({
        date: selectedCancelledDate,
        driver: cancelledDriverFilter.trim() || undefined,
        status: cancelledStatusFilter || undefined,
      });
      downloadBlob(res.data, `cancelled-queue-${selectedCancelledDate}.csv`);
    } catch {
      alert('Failed to export cancelled queue CSV.');
    }
  };

  const handleExportDriverAnalytics = async () => {
    try {
      const res = await exportDriverAnalyticsCsv();
      downloadBlob(res.data, 'driver-analytics-summary.csv');
    } catch {
      alert('Failed to export driver analytics CSV.');
    }
  };

  const handleExportComplaints = async () => {
    try {
      const res = await exportComplaintsCsv({
        status: complaintStatusFilter || undefined,
        date: complaintDateFilter || undefined,
      });
      downloadBlob(res.data, `complaints-${complaintDateFilter || 'all'}.csv`);
    } catch {
      alert('Failed to export complaints CSV.');
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h2 className="text-xl font-semibold">Unauthorized</h2>
          <p className="text-sm text-gray-400">You do not have access to admin operations. Please sign in with an admin-enabled session.</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-gray-700/80 bg-gray-900/90 px-3 py-3 backdrop-blur sm:px-4">
          <div className="max-w-7xl mx-auto space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">Dispatch Dashboard</h1>
                <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                  {groups.reduce((sum, g) => sum + g.rides.length, 0)} pending · {availableCabs.length} cabs free
                </p>
              </div>
              <div className="hidden sm:inline text-xs text-gray-500 whitespace-nowrap">Updated {lastRefresh.toLocaleTimeString()}</div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
              <button
                onClick={() => setShowComplaints((current) => !current)}
                className="relative inline-flex h-9 items-center justify-center rounded-lg bg-gray-800 px-2 text-xs font-medium transition hover:bg-gray-700 sm:h-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
                title="Complaints"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">Complaints</span>
                <span className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] sm:static sm:ml-0.5 sm:text-xs ${openComplaintsCount > 0 ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-600 text-gray-200'}`}>
                  {openComplaintsCount}
                </span>
              </button>

              <button
                onClick={fetchData}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-800 px-2 transition hover:bg-gray-700 sm:h-auto sm:px-3 sm:py-2"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-800 px-2 transition hover:bg-gray-700 sm:h-auto sm:px-3 sm:py-2"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                onClick={() => { clearAuthSession(); navigate('/'); }}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-800 px-2 text-xs font-medium transition hover:bg-gray-700 sm:h-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </button>

              <div className="col-span-4 mt-0.5 flex flex-wrap items-center justify-between gap-1.5 sm:col-span-full sm:mt-0 sm:justify-end sm:gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs ${
                  adminPushEnabled
                    ? 'bg-green-900/70 text-green-200'
                    : adminPushPermission === 'denied'
                      ? 'bg-red-900/70 text-red-200'
                      : 'bg-yellow-900/70 text-yellow-200'
                }`}>
                  {adminPushEnabled ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  {adminPushEnabled
                    ? 'Alerts on'
                    : adminPushPermission === 'denied'
                      ? 'Blocked'
                      : adminPushPermission === 'unsupported'
                        ? 'Unsupported'
                        : 'Alerts off'}
                </span>

                {!adminPushEnabled && adminPushPermission !== 'unsupported' && (
                  <button
                    onClick={handleEnableAdminNotifications}
                    disabled={enablingAdminPush}
                    title={enablingAdminPush ? 'Enabling...' : 'Enable notifications'}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {enablingAdminPush ? 'Enabling...' : 'Enable alerts'}
                  </button>
                )}

                <span className="text-[11px] text-gray-500 sm:hidden">Updated {lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assign Result Toast */}
        {assignResult && (
            <div className="bg-green-600 text-white px-4 py-3">
              <div className="max-w-7xl mx-auto flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
              Dispatched! Status: <strong>OFFERED</strong> — awaiting driver acceptance.
                  &nbsp;Magic Link: <code className="bg-green-700 px-2 py-0.5 rounded">/d/{assignResult.magicLinkId}</code>
                  &nbsp;Guest OTP: <code className="bg-green-700 px-2 py-0.5 rounded font-mono">{assignResult.otp}</code>
              <em className="text-green-200 text-xs ml-2">(shown to guest at pickup)</em>
            </span>
              </div>
            </div>
        )}

        <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Queue Column ───────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Active Trips */}
            <h2 className="text-lg font-semibold flex items-center gap-2 mt-6">
              <Navigation className="w-5 h-5 text-yellow-400" />
              Active Trips
              <span className="text-sm font-normal text-gray-400">({ongoingRides.length})</span>
            </h2>

            {ongoingRides.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">
                  <Navigation className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No active trips</p>
                </div>
            ) : (
                (() => {
                  const tripMap = new Map<string, RideRequest[]>();
                  for (const ride of ongoingRides) {
                    const key = ride.magicLinkId || String(ride.id);
                    if (!tripMap.has(key)) tripMap.set(key, []);
                    tripMap.get(key)!.push(ride);
                  }
                  return Array.from(tripMap.entries()).map(([magicLink, rides]) => {
                    const first = rides[0];
                    const totalPax = rides.reduce((s, r) => s + r.passengerCount, 0);
                    const destination = first.direction === 'TO_VENUE' ? 'Main Venue' : first.location.name;
                    return (
                        <div key={magicLink} className="bg-gray-800 rounded-xl overflow-hidden border-2 border-yellow-700/50">
                          <div className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <Car className="w-5 h-5 text-yellow-400" />
                              <span className="font-mono font-medium">{first.cab?.licensePlate || '—'}</span>
                              <span className="text-gray-400 truncate">{first.cab?.driverName || '—'}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[first.status] || STATUS_BADGE['PENDING']}`}>
                          {first.status.replace('_', ' ')}
                        </span>
                              {first.assignedAt && <TransitTimer assignedAt={first.assignedAt} />}
                              {/* Cancel batch — only allowed before IN_TRANSIT */}
                              {first.status !== 'IN_TRANSIT' && first.status !== 'COMPLETED' && first.status !== 'CANCELLED' && (
                                <button
                                  onClick={async () => {
                                    const names = rides.map(r => r.guestName).join(', ');
                                    if (!confirm(`Cancel trip for: ${names}?\nThis will free the cab and notify the driver.`)) return;
                                    try {
                                      await Promise.all(rides.map(r => cancelRide(r.id)));
                                      fetchData();
                                    } catch {
                                      alert('Failed to cancel one or more rides.');
                                    }
                                  }}
                                  className="text-xs text-red-400 hover:text-red-300 font-medium border border-red-700/50 rounded px-2 py-0.5 whitespace-nowrap"
                                >
                                  Cancel Trip
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="px-4 pb-3 space-y-1">
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span><MapPin className="w-3 h-3 inline mr-1" />{destination}</span>
                              <span><Users className="w-3 h-3 inline mr-1" />{totalPax} pax</span>
                              {rides.map(r => <span key={r.id} className="text-gray-500">{r.guestName}</span>)}
                            </div>
                            {/* Show custom destination prominently if any ride in batch has one */}
                            {rides.some(r => r.customDestination) && (
                                <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2 mt-1">
                                  <Flag className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Custom Destination</p>
                                    <p className="text-sm text-amber-200 font-medium">
                                      {rides.find(r => r.customDestination)?.customDestination}
                                    </p>
                                  </div>
                                </div>
                            )}
                          </div>
                        </div>
                    );
                  });
                })()
            )}

            {/* Cancelled Queue */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowCancelledQueue(!showCancelledQueue)}
                  className="flex-1 flex items-center justify-between hover:bg-gray-750 transition rounded-xl"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    Cancelled Queue ({cancelledRides.length})
                  </h3>
                  {showCancelledQueue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <input
                  type="date"
                  value={selectedCancelledDate}
                  onChange={(e) => setSelectedCancelledDate(e.target.value)}
                  className="mr-2 rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-200 outline-none"
                />
              </div>
              {showCancelledQueue && (
                <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      value={cancelledDriverFilter}
                      onChange={(e) => setCancelledDriverFilter(e.target.value)}
                      placeholder="Driver / phone / plate"
                      className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none"
                    />
                    <select
                      value={cancelledStatusFilter}
                      onChange={(e) => setCancelledStatusFilter(e.target.value as RideIncidentType | '')}
                      className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none"
                    >
                      <option value="">All statuses</option>
                      <option value="GUEST_CANCELLED">Guest Cancelled</option>
                      <option value="DRIVER_DECLINED">Driver Declined</option>
                    </select>
                    <button
                      onClick={handleExportCancelledQueue}
                      className="rounded-md bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-medium"
                    >
                      Export CSV
                    </button>
                  </div>
                  {cancelledRides.length === 0 ? (
                    <p className="text-sm text-gray-500">No cancelled or declined rides for this day.</p>
                  ) : cancelledRides.map((ride) => (
                    <div key={ride.id} className="bg-gray-700/50 rounded-lg p-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-200 truncate">{ride.guestName} ({ride.passengerCount} pax)</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${ride.incidentType === 'GUEST_CANCELLED' ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'}`}>
                            {ride.incidentType === 'GUEST_CANCELLED' ? 'Guest Cancelled' : 'Driver Declined'}
                          </span>
                          <span className="text-xs text-gray-400">Ride #{ride.rideRequestId}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {ride.locationName} · {ride.direction === 'TO_VENUE' ? 'To Venue' : 'To Hotel'}
                      </p>
                      {ride.customDestination && (
                        <p className="text-xs text-amber-300 mt-1">Custom destination: {ride.customDestination}</p>
                      )}
                      {(ride.driverName || ride.cabLicensePlate) && (
                        <div className="mt-1 rounded-md bg-gray-800/70 px-2 py-1.5 text-xs text-gray-300 space-y-0.5">
                          <p>
                            Driver: <span className="text-gray-100 font-medium">{ride.driverName}</span>
                            {ride.cabLicensePlate && (
                              <span className="text-gray-400"> · {ride.cabLicensePlate}</span>
                            )}
                          </p>
                          {ride.driverPhone && (
                            <p className="text-gray-400">Phone: {ride.driverPhone}</p>
                          )}
                        </div>
                      )}
                      {(ride.driverDeniedCount ?? 0) > 0 && ride.incidentType === 'DRIVER_DECLINED' && (
                        <p className="text-xs text-orange-300 mt-1">Declined {ride.driverDeniedCount ?? 0} time{(ride.driverDeniedCount ?? 0) > 1 ? 's' : ''}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(ride.occurredAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ride Queue */}
            <h2 className="text-lg font-semibold flex items-center gap-2 mt-6">
              <Users className="w-5 h-5 text-blue-400" />
              Ride Queue
              <span className="text-sm font-normal text-gray-400">
              ({groups.reduce((sum, g) => sum + g.rides.length, 0)})
            </span>
            </h2>

            {groups.length === 0 && (
                <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending rides</p>
                </div>
            )}

            {groups.map((group) => (
                <div
                    key={group.locationId}
                    className={`bg-gray-800 rounded-xl overflow-hidden border-2 transition ${
                        group.hasTimedOut
                            ? 'border-red-500'
                            : group.isFull
                                ? 'border-green-500'
                                : 'border-gray-700'
                    }`}
                >
                  {/* Group Header */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className={`w-5 h-5 ${group.hasTimedOut ? 'text-red-400' : 'text-blue-400'}`} />
                      <span className="font-semibold">{group.locationName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.hasTimedOut && (
                          <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" /> OVERDUE
                    </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-mono font-bold ${
                          group.isFull ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
                      }`}>
                    {group.totalPax} / {DEFAULT_CAB_CAPACITY} Pax
                  </span>
                    </div>
                  </div>

                  {/* Rides */}
                  <div className="divide-y divide-gray-700">
                    {group.rides.map((ride) => {
                      const waitMins = Math.floor((Date.now() - new Date(ride.requestedAt).getTime()) / 60000);
                      return (
                          <label
                              key={ride.id}
                              className={`flex flex-wrap items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-750 transition ${
                                  waitMins >= 15 ? 'bg-red-900/20' : ''
                              }`}
                          >
                            <input
                                type="checkbox"
                                checked={selectedRides.has(ride.id)}
                                onChange={() => toggleRide(ride.id, ride.passengerCount)}
                                className="w-5 h-5 mt-0.5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate">{ride.guestName}</span>
                                <span className="text-gray-400 text-sm truncate">{ride.guestPhone}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span>{ride.passengerCount} pax</span>
                                <span>•</span>
                                <span>{ride.direction === 'TO_VENUE' ? '→ Venue' : '→ Hotel'}</span>
                              </div>
                              {/* Custom destination banner */}
                              {ride.customDestination && (
                                  <div className="flex items-start gap-1.5 bg-amber-900/30 border border-amber-700 rounded-lg px-2 py-1.5 mt-1">
                                    <Flag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-bold text-amber-400 uppercase tracking-wide leading-none mb-0.5">Custom Destination</p>
                                      <p className="text-sm text-amber-200 font-medium">{ride.customDestination}</p>
                                    </div>
                                  </div>
                              )}
                            </div>
                            <div className="w-full pl-8 flex items-center justify-between gap-2 sm:w-auto sm:pl-0 sm:flex-col sm:items-end sm:justify-start">
                        <span className={`text-sm font-mono font-bold ${
                            waitMins >= 15 ? 'text-red-400 animate-pulse' :
                                waitMins >= 10 ? 'text-orange-400' :
                                    waitMins >= 5  ? 'text-yellow-400' : 'text-gray-300'
                        }`}>
                          <Clock className="w-4 h-4 inline mr-1" />
                          {getWaitTime(ride.requestedAt)}
                        </span>
                              {waitMins >= 15 && <span className="text-xs text-red-400 font-semibold">OVERDUE</span>}
                              <button
                                  onClick={async (e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    if (!confirm(`Cancel ride for ${ride.guestName}?`)) return;
                                    try { await cancelRide(ride.id); fetchData(); }
                                    catch { alert('Failed to cancel ride'); }
                                  }}
                                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </label>
                      );
                    })}
                  </div>
                </div>
            ))}
          </div>

          {/* ── Fleet & Action Column ──────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Dispatch Panel */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                Dispatch
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Selected Rides</label>
                  <div className="text-2xl font-bold">
                    {selectedRides.size}
                    {selectedRides.size > 0 && (
                        <span className="text-base font-normal text-yellow-400 ml-2">({selectedPaxCount} pax)</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Assign to Cab</label>
                  <select
                      value={selectedCabId ?? ''}
                      onChange={(e) => setSelectedCabId(Number(e.target.value) || null)}
                      className="w-full py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select a cab...</option>
                    {availableCabs.map((cab) => (
                        <option key={cab.id} value={cab.id}>
                          {cab.licensePlate} — {cab.driverName} (Cap: {cab.capacity})
                        </option>
                    ))}
                  </select>
                </div>
                {isOverCapacity && (
                    <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {selectedPaxCount} pax exceeds cab capacity ({selectedCab?.capacity}). Assign fewer rides.
                    </div>
                )}
                <button
                    onClick={handleAssign}
                    disabled={selectedRides.size === 0 || !selectedCabId || assigning}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 font-semibold rounded-lg transition"
                >
                  {assigning ? 'Dispatching…' : 'Assign & Dispatch'}
                </button>
                {selectedRides.size === 0 && groups.length > 0 && (
                    <p className="text-xs text-gray-500 text-center">
                      Select rides → pick a cab → dispatch. Rides move to OFFERED until driver accepts.
                    </p>
                )}
              </div>
            </div>

            {/* Fleet */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <button
                    onClick={() => setShowFleet(!showFleet)}
                    className="flex-1 flex items-center justify-between hover:bg-gray-750 transition rounded-xl"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    Fleet ({availableCabs.length} free / {cabs.length} total)
                  </h3>
                  {showFleet ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleExportDriverAnalytics}
                  className="rounded-md bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
                >
                  Export CSV
                </button>
              </div>
              {showFleet && (
                  <div className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto">
                    {cabs.map((cab) => (
                        <div
                            key={cab.id}
                            className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                                cab.status === 'AVAILABLE' ? 'bg-green-900/20 text-green-300' :
                                    cab.status === 'OFFLINE'   ? 'bg-gray-900/30 text-gray-500 opacity-50' :
                                        'bg-red-900/20 text-red-300'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{cab.licensePlate}</span>
                            <button
                              onClick={() => openDriverAnalytics(cab.id)}
                              className="text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline disabled:opacity-50"
                              disabled={loadingAnalyticsCabId === cab.id}
                            >
                              {loadingAnalyticsCabId === cab.id ? 'Loading...' : cab.driverName}
                            </button>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 text-xs font-medium">
                        <Award className="w-3 h-3" />
                              {cab.tripsCompleted}
                      </span>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                              {cab.tripsDenied ?? 0}
                      </span>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 text-xs font-medium">
                        <Gauge className="w-3 h-3" />
                              {(cab.totalKm ?? 0).toFixed(1)} km
                      </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              cab.status === 'AVAILABLE' ? 'bg-green-800 text-green-200' :
                                  cab.status === 'OFFLINE'   ? 'bg-gray-700 text-gray-400' :
                                      'bg-red-800 text-red-200'
                          }`}>
                      {cab.status}
                    </span>
                        </div>
                    ))}
                  </div>
              )}
            </div>

            {/* Event Management */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <button
                onClick={() => setShowComplaints(!showComplaints)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition rounded-xl"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Complaints ({complaints.length})
                </h3>
                {showComplaints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showComplaints && (
                <div className="px-4 pb-4 space-y-2 max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={complaintStatusFilter}
                      onChange={(e) => setComplaintStatusFilter(e.target.value as ComplaintStatus | '')}
                      className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none"
                    >
                      <option value="">All statuses</option>
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                    <input
                      type="date"
                      value={complaintDateFilter}
                      onChange={(e) => setComplaintDateFilter(e.target.value)}
                      className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none"
                    />
                    <button
                      onClick={handleExportComplaints}
                      className="rounded-md bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-medium"
                    >
                      Export CSV
                    </button>
                  </div>
                  {complaints.length === 0 ? (
                    <p className="text-sm text-gray-500">No complaints filed.</p>
                  ) : complaints.map((complaint) => (
                    <div key={complaint.id} className="bg-gray-700/50 rounded-lg p-3 text-sm space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-200 truncate">{complaint.guestName}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          complaint.status === 'OPEN' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'
                        }`}>
                          {complaint.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{complaint.guestPhone}</p>
                      <p className="text-sm text-gray-300">{complaint.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(complaint.createdAt).toLocaleString()}
                        {complaint.rideRequest ? ` · Ride #${complaint.rideRequest.id}` : ''}
                      </p>
                      {complaint.status === 'OPEN' && (
                        <button
                          onClick={() => handleCloseComplaint(complaint.id)}
                          className="text-xs text-green-400 hover:text-green-300 font-medium"
                        >
                          Close Complaint
                        </button>
                      )}
                      {complaint.status === 'CLOSED' && complaint.closedAt && (
                        <p className="text-xs text-gray-500">
                          Closed {new Date(complaint.closedAt).toLocaleString()} by {complaint.closedBy || 'admin'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event Management */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <button
                  onClick={() => setShowEvents(!showEvents)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition rounded-xl"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Events ({events.length})
                </h3>
                {showEvents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showEvents && (
                  <div className="px-4 pb-4 space-y-2">
                    <button
                        onClick={() => {
                          setShowEventForm(true); setEditingEventId(null);
                          setEventImageFile(null);
                          setEventImageError('');
                          setEventForm({ title: '', description: '', imageUrl: '', startTime: '', endTime: '', locationId: locations[0]?.id?.toString() || '', notifyGuests: false });
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                    >
                      + Add Event
                    </button>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {events.map(ev => (
                          <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50 text-sm">
                            <div>
                              <p className="font-medium text-gray-200">{ev.title}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(ev.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                {' - '}
                                {new Date(ev.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                            <button
                                onClick={() => {
                                  setEditingEventId(ev.id);
                                  setEventImageFile(null);
                                  setEventImageError('');
                                  setEventForm({ title: ev.title, description: ev.description || '', imageUrl: ev.imageUrl || '', startTime: ev.startTime.slice(0, 16), endTime: ev.endTime.slice(0, 16), locationId: ev.location.id.toString(), notifyGuests: false });
                                  setShowEventForm(true);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Edit
                            </button>
                          </div>
                      ))}
                    </div>
                  </div>
              )}
            </div>

          </div>
        </div>

      {showEventForm && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">{editingEventId ? 'Edit Event' : 'Add Event'}</h3>
              <button
                onClick={() => {
                  setShowEventForm(false);
                  setEventImageFile(null);
                  setEventImageError('');
                }}
                className="p-1.5 rounded hover:bg-gray-700 transition"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={eventForm.title}
                onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Event Title"
                className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none"
              />
              <textarea
                value={eventForm.description}
                onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description / more info"
                rows={4}
                className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none"
              />
              <div className="rounded-lg border border-gray-600 p-3 space-y-2">
                <p className="text-xs text-gray-400">Event image</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) {
                      setEventImageFile(null);
                      setEventImageError('');
                      return;
                    }
                    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
                    if (!allowedTypes.includes(file.type)) {
                      setEventImageFile(null);
                      setEventImageError('Only JPG, PNG, or WEBP images are allowed.');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setEventImageFile(null);
                      setEventImageError('Image exceeds max size of 5MB.');
                      return;
                    }
                    setEventImageFile(file);
                    setEventImageError('');
                  }}
                  className="w-full text-xs text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-blue-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!eventImageFile) return;
                      setUploadingEventImage(true);
                      setEventImageError('');
                      try {
                        const res = await uploadEventImage(eventImageFile);
                        setEventForm((f) => ({ ...f, imageUrl: res.data.imageUrl }));
                      } catch {
                        setEventImageError('Failed to upload image. Please try again.');
                      } finally {
                        setUploadingEventImage(false);
                      }
                    }}
                    disabled={!eventImageFile || uploadingEventImage}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {uploadingEventImage ? 'Uploading...' : 'Upload Image'}
                  </button>
                  {eventForm.imageUrl && <span className="text-xs text-green-400">Uploaded</span>}
                </div>
                {eventImageError && <p className="text-xs text-red-400">{eventImageError}</p>}
                {eventForm.imageUrl && (
                  <img src={eventForm.imageUrl} alt="Event preview" className="h-24 w-full object-cover rounded-md border border-gray-600" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Start date</label>
                  <input type="date" value={getDatePart(eventForm.startTime)} onChange={e => updateEventDateTime('startTime', 'date', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Start time</label>
                  <input type="time" value={getTimePart(eventForm.startTime)} onChange={e => updateEventDateTime('startTime', 'time', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">End date</label>
                  <input type="date" value={getDatePart(eventForm.endTime)} onChange={e => updateEventDateTime('endTime', 'date', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">End time</label>
                  <input type="time" value={getTimePart(eventForm.endTime)} onChange={e => updateEventDateTime('endTime', 'time', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" />
                </div>
              </div>
              <select value={eventForm.locationId} onChange={e => setEventForm(f => ({ ...f, locationId: e.target.value }))} className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white outline-none">
                {locations.filter(l => l.isMainVenue).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={eventForm.notifyGuests} onChange={e => setEventForm(f => ({ ...f, notifyGuests: e.target.checked }))} className="rounded bg-gray-700 border-gray-500" />
                Notify all guests (push notification)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const payload = {
                      title: eventForm.title,
                      description: eventForm.description || null,
                      imageUrl: eventForm.imageUrl || null,
                      startTime: eventForm.startTime,
                      endTime: eventForm.endTime,
                      locationId: Number(eventForm.locationId),
                      notifyGuests: eventForm.notifyGuests
                    };
                    try {
                      if (editingEventId) {
                        await updateEvent(editingEventId, payload);
                      } else {
                        await createEvent(payload);
                      }
                      setShowEventForm(false);
                      setEventImageFile(null);
                      setEventImageError('');
                      await fetchEvents();
                    } catch {
                      alert('Failed to save event');
                    }
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowEventForm(false);
                    setEventImageFile(null);
                    setEventImageError('');
                  }}
                  className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {analyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Driver Analytics</h3>
              <button onClick={() => setAnalyticsModal(null)} className="p-1.5 rounded hover:bg-gray-700 transition">
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p className="text-gray-200 font-medium">{analyticsModal.driverName}</p>
              <p className="text-gray-400">{analyticsModal.licensePlate}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-gray-700 rounded p-2">
                  <p className="text-xs text-gray-400">Total Km</p>
                  <p className="text-lg font-semibold text-blue-300">{(analyticsModal.totalKm ?? 0).toFixed(1)}</p>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <p className="text-xs text-gray-400">Avg Acceptance</p>
                  <p className="text-lg font-semibold text-green-300">{formatAcceptanceTime(analyticsModal.averageAcceptanceTimeSeconds)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-gray-700 rounded p-2">
                  <p className="text-xs text-gray-400">Trips Completed</p>
                  <p className="text-lg font-semibold text-purple-300">{analyticsModal.tripsCompleted}</p>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <p className="text-xs text-gray-400">Trips Denied</p>
                  <p className="text-lg font-semibold text-red-300">{analyticsModal.tripsDenied}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-300" />
                Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded hover:bg-gray-700 transition"
                title="Close settings"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Admin contact shown to guests and drivers.</p>

              <div>
                <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <User className="w-3 h-3" /> Admin Name
                </label>
                <input
                  type="text"
                  value={settingsForm.adminName}
                  onChange={e => setSettingsForm(f => ({ ...f, adminName: e.target.value }))}
                  placeholder="e.g. Ravi Kumar"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <Phone className="w-3 h-3" /> Admin Phone
                </label>
                <input
                  type="tel"
                  value={settingsForm.adminPhone}
                  onChange={e => setSettingsForm(f => ({ ...f, adminPhone: e.target.value }))}
                  placeholder="e.g. +91-9900000000"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !settingsForm.adminName.trim() || !settingsForm.adminPhone.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {savingSettings ? 'Saving…' : settingsSaved ? '✓ Saved!' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

function TransitTimer({ assignedAt }: { assignedAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const totalSecs = Math.floor((Date.now() - new Date(assignedAt).getTime()) / 1000);
      setElapsed(totalSecs < 60 ? `${totalSecs}s` : `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [assignedAt]);

  const totalMins = Math.floor((Date.now() - new Date(assignedAt).getTime()) / 60000);
  const color = totalMins >= 30 ? 'text-red-400' : totalMins >= 15 ? 'text-orange-400' : 'text-yellow-300';

  return (
      <span className={`font-mono font-medium ${color}`}>
      <Clock className="w-3 h-3 inline mr-1" />
        {elapsed}
    </span>
  );
}