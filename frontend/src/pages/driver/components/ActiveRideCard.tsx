import { MapPin, Navigation, KeyRound, CheckCircle, Flag } from 'lucide-react';
import { type RideRequest } from '../../../api/client';

interface ActiveRideCardProps {
  ride: RideRequest;
  onReviewAssignment: (ride: RideRequest) => void;
  onMarkArrived: (rideId: number) => void;
  onEnterOtp: (rideId: number) => void;
  onCompleteTrip: (rideId: number) => void;
  arrivingRideId: number | null;
  completingRideId: number | null;
}

export default function ActiveRideCard({
  ride, onReviewAssignment, onMarkArrived, onEnterOtp, onCompleteTrip, arrivingRideId, completingRideId,
}: ActiveRideCardProps) {
  return (
    <div className="bg-indigo-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-indigo-500" />
        <span className="font-medium text-gray-800">{ride.location.name}</span>
      </div>

      {ride.customDestination && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          <Flag className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Custom Destination</p>
            <p className="text-sm font-semibold text-amber-900">{ride.customDestination}</p>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-600">{ride.passengerCount} passengers · {ride.direction === 'TO_VENUE' ? 'To Venue' : 'To Hotel'}</p>
      <p className="text-sm text-gray-600">Guest: {ride.guestName} ({ride.guestPhone})</p>

      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        ride.status === 'OFFERED'    ? 'bg-orange-100 text-orange-700' :
          ride.status === 'ACCEPTED'   ? 'bg-blue-100 text-blue-700' :
            ride.status === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-700' :
              ride.status === 'ARRIVED'    ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
      }`}>
        {ride.status}
      </span>

      {ride.status === 'OFFERED' && (
        <button onClick={() => onReviewAssignment(ride)} className="w-full mt-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition">
          Review Assignment
        </button>
      )}

      {ride.status === 'ACCEPTED' && (
        <button onClick={() => onMarkArrived(ride.id)} disabled={arrivingRideId === ride.id} className="w-full mt-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50">
          <Navigation className="w-4 h-4" />
          {arrivingRideId === ride.id ? 'Arriving…' : 'I\'ve Arrived at Pickup'}
        </button>
      )}

      {ride.status === 'ARRIVED' && (
        <button onClick={() => onEnterOtp(ride.id)} className="w-full mt-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
          <KeyRound className="w-4 h-4" />
          Enter Guest OTP to Start
        </button>
      )}

      {ride.status === 'IN_TRANSIT' && (
        <button onClick={() => onCompleteTrip(ride.id)} disabled={completingRideId === ride.id} className="w-full mt-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50">
          <CheckCircle className="w-4 h-4" />
          {completingRideId === ride.id ? 'Completing…' : 'Mark as Completed'}
        </button>
      )}
    </div>
  );
}

