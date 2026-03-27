import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Phone, KeyRound, Clock, MapPin, Users, ArrowRight, Building2, PartyPopper, Minus, Plus, LogOut, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { createRide, getLocations, getGuestRides, type Location, type RideRequest } from '../../api/client';
import EventTimeline from '../../components/EventTimeline';

const MAX_CAB_CAPACITY = 4;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Waiting for cab...',
  ASSIGNED: 'Cab assigned!',
  IN_TRANSIT: 'On the way',
  ARRIVED: 'Cab has arrived!',
  COMPLETED: 'Trip completed',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  ARRIVED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

export default function GuestHome() {
  const navigate = useNavigate();
  const guestName = localStorage.getItem('guestName') || '';
  const guestPhone = localStorage.getItem('guestPhone') || '';

  // Ride request state
  const [showBooking, setShowBooking] = useState(false);
  const [direction, setDirection] = useState<'TO_VENUE' | 'TO_HOTEL'>('TO_VENUE');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Active rides state
  const [activeRides, setActiveRides] = useState<RideRequest[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);

  useEffect(() => {
    if (!guestName || !guestPhone) {
      navigate('/');
      return;
    }
    getLocations().then(res => {
      setLocations(res.data);
      const hotels = res.data.filter(l => !l.isMainVenue);
      if (hotels.length > 0) setSelectedLocationId(hotels[0].id);
    }).catch(() => setError('Failed to load locations'));
  }, [guestName, guestPhone, navigate]);

  const fetchRides = useCallback(async () => {
    if (!guestPhone) return;
    try {
      const res = await getGuestRides(guestPhone);
      setActiveRides(res.data);
    } catch {
      // silent
    } finally {
      setLoadingRides(false);
    }
  }, [guestPhone]);

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 10000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  const hotels = locations.filter(l => !l.isMainVenue);
  const venue = locations.find(l => l.isMainVenue);
  const hasActiveRides = activeRides.length > 0;

  const handleSubmit = async () => {
    if (!selectedLocationId || !venue) return;
    setSubmitting(true);
    setError('');
    try {
      let remaining = passengerCount;
      while (remaining > 0) {
        const count = Math.min(remaining, MAX_CAB_CAPACITY);
        await createRide({ guestName, guestPhone, passengerCount: count, direction, locationId: selectedLocationId });
        remaining -= count;
      }
      setShowBooking(false);
      setPassengerCount(1);
      fetchRides();
    } catch {
      setError('Failed to submit ride request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('guestName');
    localStorage.removeItem('guestPhone');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Event Transport</h1>
            <p className="text-blue-200 text-sm">Hi, {guestName}</p>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-blue-700 rounded-lg transition">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Event Schedule - always visible */}
        <EventTimeline />

        {/* Active Rides Section */}
        {hasActiveRides && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600" />
              Your Active Rides
            </h2>
            {activeRides.map((ride) => (
              <div key={ride.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className={`px-4 py-2 flex items-center gap-2 ${STATUS_COLORS[ride.status]}`}>
                  {(ride.status === 'PENDING') && <Clock className="w-4 h-4" />}
                  {(ride.status === 'ASSIGNED' || ride.status === 'IN_TRANSIT') && <Car className="w-4 h-4" />}
                  {(ride.status === 'ARRIVED' || ride.status === 'COMPLETED') && <CheckCircle2 className="w-4 h-4" />}
                  <span className="font-medium text-sm">{STATUS_LABELS[ride.status]}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>{ride.location.name}</span>
                    <span className="text-gray-400">→</span>
                    <span>{ride.direction === 'TO_VENUE' ? 'Event Venue' : 'Hotel'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {ride.passengerCount} passenger{ride.passengerCount > 1 ? 's' : ''}
                  </div>
                  {ride.cab && (ride.status === 'ASSIGNED' || ride.status === 'IN_TRANSIT' || ride.status === 'ARRIVED') && (
                    <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Car className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-lg text-gray-800">{ride.cab.licensePlate}</span>
                      </div>
                      <a href={`tel:${ride.cab.driverPhone}`} className="flex items-center gap-3 text-blue-600 hover:text-blue-700">
                        <Phone className="w-5 h-5" />
                        <span className="font-medium">{ride.cab.driverPhone}</span>
                      </a>
                      {ride.dropoffOtp && (
                        <div className="bg-white rounded-xl p-4 text-center border-2 border-blue-200">
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-1">
                            <KeyRound className="w-4 h-4" />
                            <span>Your OTP</span>
                          </div>
                          <div className="text-4xl font-mono font-bold tracking-widest text-blue-600">{ride.dropoffOtp}</div>
                          <p className="text-xs text-gray-400 mt-1">Share this with your driver at dropoff</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center">Auto-refreshing every 10 seconds</p>
          </div>
        )}

        {/* Book a Ride Section */}
        {!showBooking ? (
          <button
            onClick={() => setShowBooking(true)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 text-lg flex items-center justify-center gap-2"
          >
            <Car className="w-5 h-5" />
            Book a Ride
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Book a Ride</h2>
              <button onClick={() => setShowBooking(false)} className="text-sm text-blue-600 font-medium flex items-center gap-1">
                <ChevronUp className="w-4 h-4" /> Back to Schedule
              </button>
            </div>

            {/* Direction Toggle */}
            <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
              <button
                onClick={() => setDirection('TO_VENUE')}
                className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
                  direction === 'TO_VENUE' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <PartyPopper className="w-4 h-4" /> Going to Event
              </button>
              <button
                onClick={() => setDirection('TO_HOTEL')}
                className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
                  direction === 'TO_HOTEL' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-4 h-4" /> Going to Hotel
              </button>
            </div>

            {/* Location Selector */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                {direction === 'TO_VENUE' ? 'Pickup Hotel' : 'Dropoff Hotel'}
              </label>
              <select
                value={selectedLocationId ?? ''}
                onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                className="w-full py-3 px-4 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {hotels.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <ArrowRight className="w-4 h-4" />
                <span>{direction === 'TO_VENUE' ? venue?.name || 'Main Venue' : 'Selected Hotel'}</span>
              </div>
            </div>

            {/* Passenger Counter */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                Number of Passengers
              </label>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                  <Minus className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-4xl font-bold text-gray-800 w-16 text-center">{passengerCount}</span>
                <button onClick={() => setPassengerCount(Math.min(10, passengerCount + 1))} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {passengerCount > MAX_CAB_CAPACITY && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  This will be split into {Math.ceil(passengerCount / MAX_CAB_CAPACITY)} cab requests
                </p>
              )}
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedLocationId}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 text-lg"
            >
              {submitting ? 'Submitting...' : 'Request Ride'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
