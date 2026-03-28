import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Phone, KeyRound, Clock, MapPin, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getGuestRides, type RideRequest } from '../../api/client';

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
};

export default function RideStatus() {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const guestPhone = localStorage.getItem('guestPhone') || '';

  const fetchRides = useCallback(async () => {
    if (!guestPhone) {
      navigate('/');
      return;
    }
    try {
      const res = await getGuestRides(guestPhone);
      if (res.data.length === 0) {
        navigate('/request');
        return;
      }
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

  const handleBack = () => navigate('/request');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-blue-700 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Your Rides</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {rides.map((ride) => (
          <div key={ride.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Status Header */}
            <div className={`px-4 py-2 flex items-center gap-2 ${STATUS_COLORS[ride.status]}`}>
              {ride.status === 'PENDING' && <Clock className="w-4 h-4" />}
              {ride.status === 'OFFERED' && <Car className="w-4 h-4" />}
              {ride.status === 'ACCEPTED' && <Car className="w-4 h-4" />}
              {ride.status === 'IN_TRANSIT' && <Car className="w-4 h-4" />}
              {ride.status === 'ARRIVED' && <CheckCircle2 className="w-4 h-4" />}
              {ride.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4" />}
              <span className="font-medium text-sm">{STATUS_LABELS[ride.status]}</span>
            </div>

            <div className="p-4 space-y-3">
              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>{ride.location.name}</span>
                <span className="text-gray-400">→</span>
                <span>{ride.direction === 'TO_VENUE' ? 'Event Venue' : 'Hotel'}</span>
              </div>

              {/* Passengers */}
              <div className="text-sm text-gray-600">
                {ride.passengerCount} passenger{ride.passengerCount > 1 ? 's' : ''}
              </div>

              {/* Assigned info */}
              {ride.cab && (ride.status === 'OFFERED' || ride.status === 'ACCEPTED' || ride.status === 'IN_TRANSIT' || ride.status === 'ARRIVED') && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  {/* Cab Plate */}
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-lg text-gray-800">{ride.cab.licensePlate}</span>
                  </div>

                  {/* Driver Phone */}
                  <a
                    href={`tel:${ride.cab.driverPhone}`}
                    className="flex items-center gap-3 text-blue-600 hover:text-blue-700"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">{ride.cab.driverPhone}</span>
                  </a>

                  {/* OTP */}
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
