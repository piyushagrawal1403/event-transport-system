import { useState, useEffect, useCallback } from 'react';
import {
  Car, Users, Clock, MapPin, CheckCircle2, AlertTriangle,
  RefreshCw, Send, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  getPendingRides, getCabs, assignRides,
  type RideRequest, type Cab
} from '../../api/client';

interface LocationGroup {
  locationId: number;
  locationName: string;
  rides: RideRequest[];
  totalPax: number;
  hasTimedOut: boolean;
  isFull: boolean;
}

export default function Dashboard() {
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [cabs, setCabs] = useState<Cab[]>([]);
  const [selectedRides, setSelectedRides] = useState<Map<number, number>>(new Map()); // rideId -> passengerCount
  const [selectedCabId, setSelectedCabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showFleet, setShowFleet] = useState(true);
  const [assignResult, setAssignResult] = useState<{ magicLinkId: string; otp: string } | null>(null);

  const DEFAULT_CAB_CAPACITY = 4;

  const fetchData = useCallback(async () => {
    try {
      const [ridesRes, cabsRes] = await Promise.all([getPendingRides(), getCabs()]);
      setCabs(cabsRes.data);

      const now = new Date();
      const groupMap = new Map<number, LocationGroup>();

      for (const ride of ridesRes.data) {
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
        if (waitMinutes >= 15) {
          group.hasTimedOut = true;
        }
      }

      for (const group of groupMap.values()) {
        if (group.totalPax >= DEFAULT_CAB_CAPACITY) {
          group.isFull = true;
        }
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleRide = (rideId: number, paxCount: number) => {
    setSelectedRides(prev => {
      const next = new Map(prev);
      if (next.has(rideId)) {
        next.delete(rideId);
      } else {
        next.set(rideId, paxCount);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedRides.size === 0 || !selectedCabId) return;
    const totalPax = Array.from(selectedRides.values()).reduce((s, p) => s + p, 0);
    const cab = cabs.find(c => c.id === selectedCabId);
    if (cab && totalPax > cab.capacity) {
      if (!confirm(`Selected ${totalPax} passengers exceeds cab capacity (${cab.capacity}). Assign anyway?`)) return;
    }

    setAssigning(true);
    try {
      const res = await assignRides({
        cabId: selectedCabId,
        rideIds: Array.from(selectedRides.keys()),
      });
      setAssignResult({ magicLinkId: res.data.magicLinkId, otp: res.data.otp });

      console.log('=== SMS PAYLOAD ===');
      console.log(`Driver: ${res.data.driverName}`);
      console.log(`Phone: ${res.data.driverPhone}`);
      console.log(`Cab: ${res.data.cabLicensePlate}`);
      console.log(`Magic Link: ${window.location.origin}/d/${res.data.magicLinkId}`);
      console.log(`OTP: ${res.data.otp}`);
      console.log('===================');

      setSelectedRides(new Map());
      setSelectedCabId(null);
      await fetchData();

      setTimeout(() => setAssignResult(null), 10000);
    } catch (err) {
      alert('Failed to assign rides. Check console for details.');
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
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
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
              {groups.reduce((sum, g) => sum + g.rides.length, 0)} pending rides · {availableCabs.length} cabs available
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Assign Result Toast */}
      {assignResult && (
        <div className="bg-green-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Assigned! Magic Link: <code className="bg-green-700 px-2 py-1 rounded">/d/{assignResult.magicLinkId}</code> | OTP: <code className="bg-green-700 px-2 py-1 rounded font-mono">{assignResult.otp}</code></span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Queue Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Ride Queue
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
              <div className="px-4 py-3 flex items-center justify-between bg-gray-750">
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
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-750 transition ${
                        waitMins >= 15 ? 'bg-red-900/20' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRides.has(ride.id)}
                        onChange={() => toggleRide(ride.id, ride.passengerCount)}
                        className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{ride.guestName}</span>
                          <span className="text-gray-400 text-sm">{ride.guestPhone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
                          <span>{ride.passengerCount} pax</span>
                          <span>•</span>
                          <span>{ride.direction === 'TO_VENUE' ? '→ Venue' : '→ Hotel'}</span>
                        </div>
                      </div>
                      <div className={`flex flex-col items-end`}>
                        <span className={`text-sm font-mono font-bold ${waitMins >= 15 ? 'text-red-400 animate-pulse' : waitMins >= 10 ? 'text-orange-400' : waitMins >= 5 ? 'text-yellow-400' : 'text-gray-300'}`}>
                          <Clock className="w-4 h-4 inline mr-1" />
                          {getWaitTime(ride.requestedAt)}
                        </span>
                        {waitMins >= 15 && (
                          <span className="text-xs text-red-400 font-semibold">OVERDUE</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Fleet & Action Column */}
        <div className="space-y-4">
          {/* Assign Action */}
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
                  {selectedPaxCount} pax selected exceeds cab capacity ({selectedCab?.capacity}). Consider assigning in batches — select fewer rides per cab.
                </div>
              )}

              <button
                onClick={handleAssign}
                disabled={selectedRides.size === 0 || !selectedCabId || assigning}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 font-semibold rounded-lg transition"
              >
                {assigning ? 'Assigning...' : 'Assign & Dispatch'}
              </button>

              {selectedRides.size === 0 && groups.length > 0 && (
                <p className="text-xs text-gray-500 text-center">Tip: Select rides from the queue, pick a cab, then assign. For split rides (e.g. 6 pax = 4+2), assign each batch to a separate cab.</p>
              )}
            </div>
          </div>

          {/* Fleet Status */}
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
                      cab.status === 'AVAILABLE' ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-medium">{cab.licensePlate}</span>
                      <span className="text-gray-400 ml-2">{cab.driverName}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      cab.status === 'AVAILABLE' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
                    }`}>
                      {cab.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
