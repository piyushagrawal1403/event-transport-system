import { MapPin, Clock, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { type RideRequest } from '../../../api/client';

interface RideHistoryPanelProps {
  completedRides: RideRequest[];
  showHistory: boolean;
  onToggle: () => void;
}

export default function RideHistoryPanel({
  completedRides,
  showHistory,
  onToggle,
}: RideHistoryPanelProps) {
  const byDate = new Map<string, RideRequest[]>();
  for (const ride of completedRides) {
    const date = new Date(ride.requestedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(ride);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition rounded-xl"
      >
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" />
          Completed Rides ({completedRides.length})
        </h3>
        {showHistory
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {showHistory && (
        <div className="px-4 pb-4">
          {completedRides.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-3">No completed rides yet</p>
          ) : (
            Array.from(byDate.entries()).map(([date, rides]) => (
              <div key={date} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{date}</p>
                <div className="space-y-2">
                  {rides.map(ride => (
                    <div key={ride.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="font-medium text-gray-700">
                            {ride.customDestination
                              ? `Others → ${ride.customDestination}`
                              : ride.location.name}
                          </span>
                        </div>
                        <span className="text-xs text-green-600 font-medium">COMPLETED</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-gray-500 text-xs">
                        <span>{ride.passengerCount} pax</span>
                        <span>{ride.direction === 'TO_VENUE' ? '→ Venue' : '→ Hotel'}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ride.requestedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

