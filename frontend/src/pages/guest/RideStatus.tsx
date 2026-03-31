import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Phone, KeyRound, Clock, MapPin, ArrowLeft, CheckCircle2, XCircle, PhoneCall } from 'lucide-react';
import { getGuestRides, cancelRide, getConfig, type RideRequest } from '../../api/client';
import { getGuestIdentity } from '../../lib/auth';

// Statuses the guest/admin can cancel — anything before the driver starts the trip (IN_TRANSIT)
const CANCELLABLE: RideRequest['status'][] = ['PENDING', 'OFFERED', 'ACCEPTED', 'ARRIVED'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Waiting for cab...',
  OFFERED: 'Cab assigned!',
  ACCEPTED: 'Driver accepted',
  IN_TRANSIT: 'On the way',
  ARRIVED: 'Cab has arrived!',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Ride cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  OFFERED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  ARRIVED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function RideStatus() {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPhone, setAdminPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const { phone: guestPhone } = getGuestIdentity();

  const fetchRides = useCallback(async () => {
    if (!guestPhone) { navigate('/'); return; }
    try {
      const res = await getGuestRides(guestPhone);
      if (res.data.length === 0) { navigate('/request'); return; }
      setRides(res.data);
    } catch {
      // Silently retry
    } finally {
      setLoading(false);
    }
  }, [guestPhone, navigate]);

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 10000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  useEffect(() => {
    getConfig().then(r => {
      setAdminPhone(r.data.adminPhone);
      setAdminName(r.data.adminName);
    }).catch(() => {});
  }, []);

  const handleCancel = async (rideId: number, guestName: string) => {
    if (!confirm(`Cancel your ride, ${guestName}? This cannot be undone.`)) return;
    setCancellingId(rideId);
    try {
      await cancelRide(rideId);
      // Refresh — if nothing left, fetchRides navigates away automatically
      await fetchRides();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to cancel ride. Please try again.';
      alert(msg);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/request')} className="p-2 hover:bg-blue-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Your Rides</h1>
          </div>
          {/* Admin contact in header */}
          {adminPhone && (
            <a
              href={`tel:${adminPhone}`}
              className="flex items-center gap-1.5 text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-lg transition"
              title="Call dispatch"
            >
              <PhoneCall className="w-4 h-4" />
              <span className="hidden xs:inline">Help</span>
            </a>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Admin support banner */}
        {adminPhone && (
          <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Need help?</p>
              <p className="text-sm font-semibold text-gray-800">{adminName || 'Dispatch Admin'}</p>
            </div>
            <a
              href={`tel:${adminPhone}`}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-2 rounded-lg transition"
            >
              <Phone className="w-4 h-4" />
              {adminPhone}
            </a>
          </div>
        )}

        {rides.map((ride) => (
          <div key={ride.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Status Header */}
            <div className={`px-4 py-2 flex items-center justify-between ${STATUS_COLORS[ride.status] || 'bg-gray-100 text-gray-800'}`}>
              <div className="flex items-center gap-2">
                {ride.status === 'PENDING'    && <Clock className="w-4 h-4" />}
                {(ride.status === 'OFFERED' || ride.status === 'ACCEPTED' || ride.status === 'IN_TRANSIT') && <Car className="w-4 h-4" />}
                {(ride.status === 'ARRIVED' || ride.status === 'COMPLETED') && <CheckCircle2 className="w-4 h-4" />}
                {ride.status === 'CANCELLED'  && <XCircle className="w-4 h-4" />}
                <span className="font-medium text-sm">{STATUS_LABELS[ride.status]}</span>
              </div>
              {/* Cancel button — only while cancellable */}
              {CANCELLABLE.includes(ride.status) && (
                <button
                  onClick={() => handleCancel(ride.id, ride.guestName)}
                  disabled={cancellingId === ride.id}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 ml-2"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {cancellingId === ride.id ? 'Cancelling…' : 'Cancel'}
                </button>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{ride.location.name}</span>
                <span className="text-gray-400">→</span>
                <span>{ride.direction === 'TO_VENUE' ? 'Event Venue' : 'Hotel'}</span>
              </div>

              {/* Custom destination */}
              {ride.customDestination && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="font-semibold">Custom destination: </span>{ride.customDestination}
                </div>
              )}

              {/* Passengers */}
              <div className="text-sm text-gray-600">
                {ride.passengerCount} passenger{ride.passengerCount > 1 ? 's' : ''}
              </div>

              {/* Assigned cab info */}
              {ride.cab && (ride.status === 'OFFERED' || ride.status === 'ACCEPTED' || ride.status === 'IN_TRANSIT' || ride.status === 'ARRIVED') && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-lg text-gray-800">{ride.cab.licensePlate}</span>
                  </div>
                  <a href={`tel:${ride.cab.driverPhone}`} className="flex items-center gap-3 text-blue-600 hover:text-blue-700">
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">{ride.cab.driverPhone}</span>
                  </a>

                  {/* OTP — shown once driver accepts and until trip starts */}
                  {ride.dropoffOtp && (ride.status === 'ACCEPTED' || ride.status === 'ARRIVED') && (
                    <div className="bg-white rounded-xl p-4 text-center border-2 border-blue-200">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-1">
                        <KeyRound className="w-4 h-4" />
                        <span>Your OTP</span>
                      </div>
                      <div className="text-4xl font-mono font-bold tracking-widest text-blue-600">
                        {ride.dropoffOtp}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Share this with your driver to start the trip</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 text-center">Auto-refreshing every 10 seconds</p>
      </div>
    </div>
  );
}
