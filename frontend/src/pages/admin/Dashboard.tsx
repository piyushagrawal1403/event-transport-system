import { useState, useEffect, useCallback } from 'react';
import {
  Car, Users, Clock, MapPin, CheckCircle2, AlertTriangle,
  RefreshCw, Send, ChevronDown, ChevronUp, Navigation, Award, Flag, Bell, BellRing
} from 'lucide-react';
import {
  getPendingRides, getCabs, assignRides, getOngoingRides, getEvents, getLocations, cancelRide,
  type RideRequest, type Cab, type EventItinerary, type Location
} from '../../api/client';
import api from '../../api/client';
import { pushNotificationService } from '../../services/PushNotificationService';

interface LocationGroup {
  locationId: number;
  locationName: string;
  rides: RideRequest[];
  totalPax: number;
  hasTimedOut: boolean;
  isFull: boolean;
}

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
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [cabs, setCabs] = useState<Cab[]>([]);
  const [selectedRides, setSelectedRides] = useState<Map<number, number>>(new Map());
  const [selectedCabId, setSelectedCabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showFleet, setShowFleet] = useState(true);
  const [assignResult, setAssignResult] = useState<{ magicLinkId: string; otp: string } | null>(null);
  const [ongoingRides, setOngoingRides] = useState<RideRequest[]>([]);
  const [events, setEvents] = useState<EventItinerary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showEvents, setShowEvents] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', startTime: '', endTime: '', locationId: '', notifyGuests: false });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [adminPushPermission, setAdminPushPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [adminPushEnabled, setAdminPushEnabled] = useState(false);
  const [enablingAdminPush, setEnablingAdminPush] = useState(false);

  const DEFAULT_CAB_CAPACITY = 4;

  const fetchData = useCallback(async () => {
    try {
      const [ridesRes, cabsRes, ongoingRes] = await Promise.allSettled([getPendingRides(), getCabs(), getOngoingRides()]);
      if (cabsRes.status === 'fulfilled') setCabs(cabsRes.value.data);
      if (ongoingRes.status === 'fulfilled') setOngoingRides(ongoingRes.value.data);
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
  }, []);

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

  // Initialize push notifications for admin
  useEffect(() => {
    const initializeAdminPush = async () => {
      await pushNotificationService.initialize();

      if (typeof Notification === 'undefined') {
        setAdminPushPermission('unsupported');
        setAdminPushEnabled(false);
        return;
      }

      setAdminPushPermission(Notification.permission);

      if (Notification.permission === 'granted') {
        const subscribed = await pushNotificationService.subscribeUser('admin', 'ADMIN', {
          permissionAlreadyGranted: true,
        });
        setAdminPushEnabled(subscribed);
      }
    };

    initializeAdminPush();
  }, []);

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

      const subscribed = await pushNotificationService.subscribeUser('admin', 'ADMIN', {
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

  const availableCabs = cabs.filter(c => c.status === 'AVAILABLE');
  const selectedPaxCount = Array.from(selectedRides.values()).reduce((sum, pax) => sum + pax, 0);
  const selectedCab = cabs.find(c => c.id === selectedCabId);
  const isOverCapacity = selectedCab ? selectedPaxCount > selectedCab.capacity : false;

  const getWaitTime = (requestedAt: string) => {
    const totalSecs = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 1000);
    if (totalSecs < 60) return `${totalSecs}s`;
    return `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Dispatch Dashboard</h1>
              <p className="text-gray-400 text-sm">
                {groups.reduce((sum, g) => sum + g.rides.length, 0)} pending · {availableCabs.length} cabs free
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  adminPushEnabled
                    ? 'bg-green-900 text-green-200'
                    : adminPushPermission === 'denied'
                      ? 'bg-red-900 text-red-200'
                      : 'bg-yellow-900 text-yellow-200'
                }`}>
                  {adminPushEnabled ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  {adminPushEnabled
                    ? 'Admin notifications on'
                    : adminPushPermission === 'denied'
                      ? 'Notifications blocked'
                      : adminPushPermission === 'unsupported'
                        ? 'Notifications unsupported'
                        : 'Notifications off'}
                </span>
                {!adminPushEnabled && adminPushPermission !== 'unsupported' && (
                  <button
                    onClick={handleEnableAdminNotifications}
                    disabled={enablingAdminPush}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Bell className="w-4 h-4" />
                    {enablingAdminPush ? 'Enabling…' : 'Enable notifications'}
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-500">Updated {lastRefresh.toLocaleTimeString()}</span>
              <button onClick={fetchData} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
                <RefreshCw className="w-4 h-4" />
              </button>
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
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Car className="w-5 h-5 text-yellow-400" />
                              <span className="font-mono font-medium">{first.cab?.licensePlate || '—'}</span>
                              <span className="text-gray-400">{first.cab?.driverName || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[first.status] || STATUS_BADGE['PENDING']}`}>
                          {first.status.replace('_', ' ')}
                        </span>
                              {first.assignedAt && <TransitTimer assignedAt={first.assignedAt} />}
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
                              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-750 transition ${
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
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{ride.guestName}</span>
                                <span className="text-gray-400 text-sm">{ride.guestPhone}</span>
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
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
              <button
                  onClick={() => setShowFleet(!showFleet)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition rounded-xl"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-400" />
                  Fleet ({availableCabs.length} free / {cabs.length} total)
                </h3>
                {showFleet ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
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
                            <span className="text-gray-400">{cab.driverName}</span>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 text-xs font-medium">
                        <Award className="w-3 h-3" />
                              {cab.tripsCompleted}
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
                          setEventForm({ title: '', description: '', startTime: '', endTime: '', locationId: locations[0]?.id?.toString() || '', notifyGuests: false });
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                    >
                      + Add Event
                    </button>
                    {showEventForm && (
                        <div className="bg-gray-700 rounded-lg p-3 space-y-2">
                          <input value={eventForm.title} onChange={e => setEventForm(f => ({...f, title: e.target.value}))} placeholder="Event Title" className="w-full py-2 px-3 bg-gray-600 rounded text-sm text-white placeholder-gray-400 outline-none" />
                          <input value={eventForm.description} onChange={e => setEventForm(f => ({...f, description: e.target.value}))} placeholder="Description (optional)" className="w-full py-2 px-3 bg-gray-600 rounded text-sm text-white placeholder-gray-400 outline-none" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-400">Start</label>
                              <input type="datetime-local" value={eventForm.startTime} onChange={e => setEventForm(f => ({...f, startTime: e.target.value}))} className="w-full py-2 px-2 bg-gray-600 rounded text-sm text-white outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">End</label>
                              <input type="datetime-local" value={eventForm.endTime} onChange={e => setEventForm(f => ({...f, endTime: e.target.value}))} className="w-full py-2 px-2 bg-gray-600 rounded text-sm text-white outline-none" />
                            </div>
                          </div>
                          <select value={eventForm.locationId} onChange={e => setEventForm(f => ({...f, locationId: e.target.value}))} className="w-full py-2 px-3 bg-gray-600 rounded text-sm text-white outline-none">
                            {locations.filter(l => l.isMainVenue).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={eventForm.notifyGuests} onChange={e => setEventForm(f => ({...f, notifyGuests: e.target.checked}))} className="rounded bg-gray-600 border-gray-500" />
                            Notify all guests (in-app)
                          </label>
                          <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                  const payload = { title: eventForm.title, description: eventForm.description || null, startTime: eventForm.startTime, endTime: eventForm.endTime, locationId: Number(eventForm.locationId), notifyGuests: eventForm.notifyGuests };
                                  try {
                                    if (editingEventId) { await api.put(`/api/v1/events/${editingEventId}`, payload); }
                                    else { await api.post('/api/v1/events', payload); }
                                    setShowEventForm(false); fetchEvents();
                                  } catch { alert('Failed to save event'); }
                                }}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition"
                            >
                              Save
                            </button>
                            <button onClick={() => setShowEventForm(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition">Cancel</button>
                          </div>
                        </div>
                    )}
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
                                  setEventForm({ title: ev.title, description: ev.description || '', startTime: ev.startTime.slice(0, 16), endTime: ev.endTime.slice(0, 16), locationId: ev.location.id.toString(), notifyGuests: false });
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