import { Users, MapPin, AlertTriangle, Clock, Flag } from 'lucide-react';
import { cancelRide } from '../../../api/client';
import { type LocationGroup, DEFAULT_CAB_CAPACITY } from '../types';

interface RideQueuePanelProps {
  groups: LocationGroup[];
  selectedRides: Map<number, number>;
  toggleRide: (rideId: number, paxCount: number) => void;
  fetchData: () => Promise<void>;
}

function getWaitTime(requestedAt: string) {
  const totalSecs = Math.floor((Date.now() - new Date(requestedAt).getTime()) / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  return `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;
}

export default function RideQueuePanel({ groups, selectedRides, toggleRide, fetchData }: RideQueuePanelProps) {
  return (
    <>
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
    </>
  );
}

