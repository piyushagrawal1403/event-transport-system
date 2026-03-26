import { useState, useEffect } from 'react';
import { Car, Phone, LogIn, Navigation, MapPin } from 'lucide-react';
import { getCabs, getCabActiveRides, type Cab, type RideRequest } from '../../api/client';

export default function DriverDashboard() {
  const [phone, setPhone] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [, setCabs] = useState<Cab[]>([]);
  const [myCab, setMyCab] = useState<Cab | null>(null);
  const [activeTrips, setActiveTrips] = useState<RideRequest[]>([]);

  const normalizePhone = (p: string) => p.replace(/[^\d+]/g, '');

  useEffect(() => {
    const savedPhone = localStorage.getItem('driverPhone');
    if (savedPhone) {
      setPhone(savedPhone);
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;

    const fetchCabs = async () => {
      try {
        const res = await getCabs();
        setCabs(res.data);
        const normalizedInput = normalizePhone(phone);
        const found = res.data.find(c => normalizePhone(c.driverPhone) === normalizedInput);
        setMyCab(found || null);

        if (found && found.status === 'BUSY') {
          const ridesRes = await getCabActiveRides(found.id);
          setActiveTrips(ridesRes.data);
        } else {
          setActiveTrips([]);
        }
      } catch {
        // Retry
      }
    };

    fetchCabs();
    const interval = setInterval(fetchCabs, 10000);
    return () => clearInterval(interval);
  }, [loggedIn, phone]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      localStorage.setItem('driverPhone', phone.trim());
      setLoggedIn(true);
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Car className="w-12 h-12 text-white mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Driver Login</h1>
            <p className="text-indigo-200 mt-1">Enter your registered phone number</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-600 text-white px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Driver Dashboard</h1>
            {myCab && <p className="text-indigo-200 text-sm">{myCab.driverName} · {myCab.licensePlate}</p>}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('driverPhone');
              setLoggedIn(false);
              setPhone('');
            }}
            className="text-sm bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {myCab ? (
          <div className="space-y-4">
            {/* Current Status */}
            <div className={`rounded-xl p-4 ${
              myCab.status === 'AVAILABLE'
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  myCab.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-amber-500'
                } animate-pulse`} />
                <span className={`font-semibold ${
                  myCab.status === 'AVAILABLE' ? 'text-green-800' : 'text-amber-800'
                }`}>
                  {myCab.status === 'AVAILABLE' ? 'Available for rides' : 'Currently on a trip'}
                </span>
              </div>
            </div>

            {/* Cab Info */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">Your Cab</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">License Plate</p>
                  <p className="font-mono font-bold text-gray-800">{myCab.licensePlate}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="font-bold text-gray-800">{myCab.capacity} seats</p>
                </div>
              </div>
            </div>

            {/* Active Trip Info */}
            {myCab.status === 'BUSY' && activeTrips.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-indigo-600" />
                  Active Trip
                </h3>
                {activeTrips.map((ride) => (
                  <div key={ride.id} className="bg-indigo-50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium text-gray-800">{ride.location.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{ride.passengerCount} passengers · {ride.direction === 'TO_VENUE' ? 'To Venue' : 'To Hotel'}</p>
                    <p className="text-sm text-gray-600">Guest: {ride.guestName} ({ride.guestPhone})</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      ride.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                      ride.status === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-700' :
                      ride.status === 'ARRIVED' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{ride.status}</span>
                    {ride.magicLinkId && (
                      <a
                        href={`/d/${ride.magicLinkId}`}
                        className="block mt-2 text-center py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                      >
                        Open Trip Link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              You will receive trip assignments via SMS/WhatsApp with a link to complete rides.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No cab found for this phone number.</p>
            <p className="text-gray-400 text-sm mt-1">Please check with the admin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
