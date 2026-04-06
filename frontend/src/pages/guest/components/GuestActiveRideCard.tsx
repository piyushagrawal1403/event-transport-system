import { Car, Phone, KeyRound, Clock, MapPin, CheckCircle2, Navigation } from 'lucide-react';
import { cancelRide, type RideRequest } from '../../../api/client';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Waiting for cab...',
  OFFERED: 'Cab assigned, awaiting driver acceptance...',
  ACCEPTED: 'Cab on the way',
  ARRIVED: 'Cab has arrived! Share your OTP',
  IN_TRANSIT: 'On the way to destination',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Ride cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  OFFERED: 'bg-orange-100 text-orange-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  ARRIVED: 'bg-green-100 text-green-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

interface GuestActiveRideCardProps {
  ride: RideRequest;
  fetchRides: () => void;
}

export default function GuestActiveRideCard({ ride, fetchRides }: GuestActiveRideCardProps) {
  return (
    <div className="wedding-card overflow-hidden">
      <div className={`px-4 py-2 flex items-center gap-2 ${STATUS_COLORS[ride.status]}`}>
        {ride.status === 'PENDING' && <Clock className="w-4 h-4" />}
        {(ride.status === 'OFFERED' || ride.status === 'ACCEPTED') && <Navigation className="w-4 h-4" />}
        {ride.status === 'IN_TRANSIT' && <Car className="w-4 h-4" />}
        {(ride.status === 'ARRIVED' || ride.status === 'COMPLETED') && <CheckCircle2 className="w-4 h-4" />}
        <span className="font-medium text-sm">{STATUS_LABELS[ride.status]}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--w-muted)' }}>
          <MapPin className="w-4 h-4" style={{ color: 'var(--w-accent)' }} />
          <span>{ride.location.name}</span>
          <span>→</span>
          <span>{ride.direction === 'TO_VENUE' ? 'Event Venue' : 'Hotel'}</span>
        </div>
        <div className="text-sm" style={{ color: 'var(--w-muted)' }}>
          {ride.passengerCount} passenger{ride.passengerCount > 1 ? 's' : ''}
        </div>
        {ride.cab && (ride.status === 'ACCEPTED' || ride.status === 'ARRIVED' || ride.status === 'IN_TRANSIT') && (
          <div className="wedding-soft-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5" style={{ color: 'var(--w-accent)' }} />
              <span className="font-bold text-lg" style={{ color: 'var(--w-text)' }}>{ride.cab.licensePlate}</span>
            </div>
            <a href={`tel:${ride.cab.driverPhone}`} className="flex items-center gap-3" style={{ color: 'var(--w-accent-strong)' }}>
              <Phone className="w-5 h-5" />
              <span className="font-medium">{ride.cab.driverPhone}</span>
            </a>
            {ride.dropoffOtp && (ride.status === 'ACCEPTED' || ride.status === 'ARRIVED') && (
              <div className="rounded-xl p-4 text-center border-2" style={{ borderColor: 'color-mix(in srgb, var(--w-accent) 35%, transparent 65%)' }}>
                <div className="flex items-center justify-center gap-2 text-sm mb-1" style={{ color: 'var(--w-muted)' }}>
                  <KeyRound className="w-4 h-4" />
                  <span>Your OTP</span>
                </div>
                <div className="text-4xl font-mono font-bold tracking-widest" style={{ color: 'var(--w-accent-strong)' }}>{ride.dropoffOtp}</div>
                <p className="text-xs mt-1" style={{ color: 'var(--w-muted)' }}>Share this with your driver to start the trip</p>
              </div>
            )}
          </div>
        )}
      </div>
      {(ride.status === 'PENDING' || ride.status === 'ACCEPTED') && (
        <div className="px-4 pb-3">
          <button
            onClick={async () => {
              if (!confirm('Cancel this ride?')) return;
              try { await cancelRide(ride.id); fetchRides(); }
              catch { alert('Failed to cancel ride'); }
            }}
            className="w-full py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition"
          >
            Cancel Ride
          </button>
        </div>
      )}
    </div>
  );
}

