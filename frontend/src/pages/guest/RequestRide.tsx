import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, ArrowRight, Building2, PartyPopper, Minus, Plus, LogOut } from 'lucide-react';
import { createRide, getLocations, getGuestRides, type Location } from '../../api/client';
import EventTimeline from '../../components/EventTimeline';

const MAX_CAB_CAPACITY = 4;

export default function RequestRide() {
  const [direction, setDirection] = useState<'TO_VENUE' | 'TO_HOTEL'>('TO_VENUE');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const guestName = localStorage.getItem('guestName') || '';
  const guestPhone = localStorage.getItem('guestPhone') || '';

  useEffect(() => {
    if (!guestName || !guestPhone) {
      navigate('/');
      return;
    }

    // Check for active rides
    getGuestRides(guestPhone).then(res => {
      if (res.data.length > 0) {
        navigate('/status');
      }
    }).catch(() => {});

    getLocations().then(res => {
      setLocations(res.data);
      const hotels = res.data.filter(l => !l.isMainVenue);
      if (hotels.length > 0) {
        setSelectedLocationId(hotels[0].id);
      }
    }).catch(() => setError('Failed to load locations'));
  }, [guestName, guestPhone, navigate]);

  const hotels = locations.filter(l => !l.isMainVenue);
  const venue = locations.find(l => l.isMainVenue);

  const handleSubmit = async () => {
    if (!selectedLocationId || !venue) return;

    setLoading(true);
    setError('');

    try {
      const locationId = direction === 'TO_VENUE' ? selectedLocationId : selectedLocationId;
      let remaining = passengerCount;

      // Auto-split logic: split into multiple requests if > MAX_CAB_CAPACITY
      while (remaining > 0) {
        const count = Math.min(remaining, MAX_CAB_CAPACITY);
        await createRide({
          guestName,
          guestPhone,
          passengerCount: count,
          direction,
          locationId,
        });
        remaining -= count;
      }

      navigate('/status');
    } catch (err) {
      setError('Failed to submit ride request. Please try again.');
    } finally {
      setLoading(false);
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
            <h1 className="text-lg font-bold">Request a Ride</h1>
            <p className="text-blue-200 text-sm">Hi, {guestName}</p>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-blue-700 rounded-lg transition">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Event Schedule */}
        <EventTimeline />

        {/* Direction Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
          <button
            onClick={() => setDirection('TO_VENUE')}
            className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
              direction === 'TO_VENUE'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <PartyPopper className="w-4 h-4" />
            Going to Event
          </button>
          <button
            onClick={() => setDirection('TO_HOTEL')}
            className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
              direction === 'TO_HOTEL'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Going to Hotel
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
            <span>
              {direction === 'TO_VENUE'
                ? venue?.name || 'Main Venue'
                : 'Selected Hotel'}
            </span>
          </div>
        </div>

        {/* Passenger Counter */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Users className="w-4 h-4 text-blue-600" />
            Number of Passengers
          </label>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            >
              <Minus className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-4xl font-bold text-gray-800 w-16 text-center">
              {passengerCount}
            </span>
            <button
              onClick={() => setPassengerCount(Math.min(10, passengerCount + 1))}
              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          {passengerCount > MAX_CAB_CAPACITY && (
            <p className="text-xs text-amber-600 text-center mt-2">
              This will be split into {Math.ceil(passengerCount / MAX_CAB_CAPACITY)} cab requests
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedLocationId}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 text-lg"
        >
          {loading ? 'Submitting...' : 'Request Ride'}
        </button>
      </div>
    </div>
  );
}
