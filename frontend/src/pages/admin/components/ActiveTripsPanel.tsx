import { Car, MapPin, Users, Navigation, Flag } from 'lucide-react';
import { cancelRide, type RideRequest } from '../../../api/client';
import TransitTimer from './TransitTimer';
import { STATUS_BADGE } from '../types';

interface ActiveTripsPanelProps {
  ongoingRides: RideRequest[];
  fetchData: () => Promise<void>;
}

export default function ActiveTripsPanel({ ongoingRides, fetchData }: ActiveTripsPanelProps) {
  return (
    <>
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
    </>
  );
}

