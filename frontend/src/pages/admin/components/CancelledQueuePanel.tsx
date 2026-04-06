import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { type CancelledQueueEntry, type RideIncidentType } from '../../../api/client';

interface CancelledQueuePanelProps {
  cancelledRides: CancelledQueueEntry[];
  showCancelledQueue: boolean;
  setShowCancelledQueue: (v: boolean) => void;
  selectedCancelledDate: string;
  setSelectedCancelledDate: (v: string) => void;
  cancelledDriverFilter: string;
  setCancelledDriverFilter: (v: string) => void;
  cancelledStatusFilter: RideIncidentType | '';
  setCancelledStatusFilter: (v: RideIncidentType | '') => void;
  handleExportCancelledQueue: () => Promise<void>;
}

export default function CancelledQueuePanel({
  cancelledRides,
  showCancelledQueue,
  setShowCancelledQueue,
  selectedCancelledDate,
  setSelectedCancelledDate,
  cancelledDriverFilter,
  setCancelledDriverFilter,
  cancelledStatusFilter,
  setCancelledStatusFilter,
  handleExportCancelledQueue,
}: CancelledQueuePanelProps) {
  return (
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
  );
}

