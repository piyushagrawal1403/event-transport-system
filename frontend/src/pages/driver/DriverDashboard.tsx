import { useState, useEffect } from 'react';
import {
  Car, Phone, LogIn, Navigation, MapPin, ChevronDown, ChevronUp,
  Award, Clock, CheckCircle, XCircle, KeyRound, Flag
} from 'lucide-react';
import {
  getCabs, getCabActiveRides, getCabCompletedRides, updateCabStatus,
  acceptRide, denyRide, markArrived, startTrip, completeTrip,
  type Cab, type RideRequest
} from '../../api/client';

export default function DriverDashboard() {
  const [phone, setPhone] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [myCab, setMyCab] = useState<Cab | null>(null);
  const [activeTrips, setActiveTrips] = useState<RideRequest[]>([]);
  const [completedRides, setCompletedRides] = useState<RideRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Accept / Deny modal
  const [consentRide, setConsentRide] = useState<RideRequest | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);

  // Start-trip OTP entry
  const [otpRideId, setOtpRideId] = useState<number | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Complete-trip loading per ride
  const [completingRideId, setCompletingRideId] = useState<number | null>(null);

  // Mark as arrived loading per ride
  const [arrivingRideId, setArrivingRideId] = useState<number | null>(null);

  const sanitizePhone = (p: string) => {
    const digits = p.replace(/[^\d]/g, '');
    return digits.startsWith('91') && digits.length === 12 ? digits.substring(2) : digits.slice(-10);
  };

  useEffect(() => {
    const savedPhone = localStorage.getItem('driverPhone');
    if (savedPhone) { setPhone(savedPhone); setLoggedIn(true); }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;

    const fetchCabs = async () => {
      try {
        const { data: cabs } = await getCabs();
        const sanitizedInput = sanitizePhone(phone);
        const found = cabs.find(c => sanitizePhone(c.driverPhone) === sanitizedInput);
        setMyCab(found || null);

        if (found) {
          const ridesRes = await getCabActiveRides(found.id);
          setActiveTrips(ridesRes.data);

          // Auto-show consent modal for the first OFFERED ride
          const offered = ridesRes.data.find(r => r.status === 'OFFERED');
          if (offered && !consentRide) setConsentRide(offered);

          const completedRes = await getCabCompletedRides(found.id);
          setCompletedRides(completedRes.data);
        } else {
          setActiveTrips([]);
          setCompletedRides([]);
        }
      } catch { /* retry */ }
    };

    fetchCabs();
    const interval = setInterval(fetchCabs, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, phone]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      const sanitized = sanitizePhone(phone.trim());
      localStorage.setItem('driverPhone', sanitized);
      setPhone(sanitized);
      setLoggedIn(true);
    }
  };

  // ── Accept / Deny handlers ────────────────────────────────────────────────

  const handleAccept = async () => {
    if (!consentRide) return;
    setConsentLoading(true);
    try {
      await acceptRide(consentRide.id);
      setConsentRide(null);
      // Refresh active trips
      if (myCab) {
        const ridesRes = await getCabActiveRides(myCab.id);
        setActiveTrips(ridesRes.data);
      }
    } catch {
      alert('Failed to accept the ride. Please try again.');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!consentRide) return;
    setConsentLoading(true);
    try {
      await denyRide(consentRide.id);
      setConsentRide(null);
      setActiveTrips([]);
      if (myCab) setMyCab({ ...myCab, status: 'AVAILABLE' });
    } catch {
      alert('Failed to deny the ride. Please try again.');
    } finally {
      setConsentLoading(false);
    }
  };

  // ── Start Trip (OTP) handler ──────────────────────────────────────────────

  const handleStartTrip = async () => {
    if (otpRideId === null) return;
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await startTrip(otpRideId, otpInput.trim());
      // Success: trip started
      setOtpRideId(null);
      setOtpInput('');
      if (myCab) {
        const ridesRes = await getCabActiveRides(myCab.id);
        setActiveTrips(ridesRes.data);
      }
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 400 && error.response.data && error.response.data.success === false) {
          if (error.response.data.message === 'Incorrect OTP') {
            setOtpError('Incorrect OTP. Ask the guest to check their booking.');
          } else {
            setOtpError(`Something went wrong: ${error.response.data.message}`);
          }
        } else if (error.response.status === 404) {
          setOtpError('Ride not found. Please refresh the page.');
        } else {
          setOtpError('Something went wrong. Please try again.');
        }
      } else {
        setOtpError('Network error. Please check your connection.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Mark as Arrived handler ────────────────────────────────────────────────

  const handleMarkArrived = async (rideId: number) => {
    setArrivingRideId(rideId);
    try {
      await markArrived(rideId);
      if (myCab) {
        const ridesRes = await getCabActiveRides(myCab.id);
        setActiveTrips(ridesRes.data);
      }
    } catch {
      alert('Failed to mark as arrived. Please try again.');
    } finally {
      setArrivingRideId(null);
    }
  };

  // ── Complete Trip handler ─────────────────────────────────────────────────

  const handleCompleteTrip = async (rideId: number) => {
    setCompletingRideId(rideId);
    try {
      await completeTrip(rideId);
      if (myCab) {
        const ridesRes = await getCabActiveRides(myCab.id);
        setActiveTrips(ridesRes.data);
        const completedRes = await getCabCompletedRides(myCab.id);
        setCompletedRides(completedRes.data);
        if (ridesRes.data.length === 0) setMyCab({ ...myCab, status: 'AVAILABLE' });
      }
    } catch {
      alert('Failed to complete trip. Please try again.');
    } finally {
      setCompletingRideId(null);
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────

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

  // ── Accept / Deny consent modal ───────────────────────────────────────────

  const ConsentModal = () => {
    if (!consentRide) return null;
    const batch = activeTrips.filter(r => r.magicLinkId === consentRide.magicLinkId);
    const totalPax = batch.reduce((s, r) => s + r.passengerCount, 0);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            {/* Header */}
            <div className="bg-indigo-600 rounded-t-2xl px-5 py-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="w-5 h-5" />
                <h2 className="text-lg font-bold">New Trip Assigned</h2>
              </div>
              <p className="text-indigo-200 text-sm">Please accept or deny within 2 minutes</p>
            </div>

            {/* Trip details */}
            <div className="p-5 space-y-3">
              {batch.map(ride => (
                  <div key={ride.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-800">{ride.location.name}</span>
                    </div>

                    {/* "Others" custom destination — highlighted */}
                    {ride.customDestination && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <Flag className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Custom Destination</p>
                            <p className="text-sm font-medium text-amber-900">{ride.customDestination}</p>
                          </div>
                        </div>
                    )}

                    <p className="text-sm text-gray-600">
                      {ride.passengerCount} pax · {ride.direction === 'TO_VENUE' ? '→ Venue' : '→ Hotel'}
                    </p>
                    <p className="text-sm text-gray-600">Guest: {ride.guestName} ({ride.guestPhone})</p>
                  </div>
              ))}

              <div className="flex items-center justify-between px-1 text-sm text-gray-500">
                <span>Total passengers</span>
                <span className="font-bold text-gray-800">{totalPax}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <button
                  onClick={handleDeny}
                  disabled={consentLoading}
                  className="py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-red-200 disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                Deny
              </button>
              <button
                  onClick={handleAccept}
                  disabled={consentLoading}
                  className="py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                Accept
              </button>
            </div>
          </div>
        </div>
    );
  };

  // ── OTP entry modal (start trip) ──────────────────────────────────────────

  const OtpModal = () => {
    if (otpRideId === null) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Enter Guest OTP</h2>
              <p className="text-sm text-gray-500 mt-1">Ask the guest for their 4-digit code to start the trip</p>
            </div>

            <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={otpInput}
                onChange={e => { setOtpInput(e.target.value); setOtpError(''); }}
                placeholder="- - - -"
                className="w-full text-center text-3xl font-mono font-bold tracking-widest py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />

            {otpError && (
                <p className="text-red-600 text-sm text-center">{otpError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                  onClick={() => { setOtpRideId(null); setOtpInput(''); setOtpError(''); }}
                  className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                  onClick={handleStartTrip}
                  disabled={otpInput.length !== 4 || otpLoading}
                  className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
              >
                {otpLoading ? 'Verifying…' : 'Start Trip'}
              </button>
            </div>
          </div>
        </div>
    );
  };

  // ── Main dashboard ────────────────────────────────────────────────────────

  return (
      <div className="min-h-screen bg-gray-50">
        <ConsentModal />
        <OtpModal />

        {/* Header */}
        <div className="bg-indigo-600 text-white px-4 py-4">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Driver Dashboard</h1>
              {myCab && <p className="text-indigo-200 text-sm">{myCab.driverName} · {myCab.licensePlate}</p>}
            </div>
            <button
                onClick={() => { localStorage.removeItem('driverPhone'); setLoggedIn(false); setPhone(''); }}
                className="text-sm bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4">
          {myCab ? (
              <div className="space-y-4">
                {/* Status toggle */}
                <div className={`rounded-xl p-4 ${
                    myCab.status === 'OFFLINE'
                        ? 'bg-gray-100 border border-gray-300'
                        : myCab.status === 'AVAILABLE'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                          myCab.status === 'OFFLINE' ? 'bg-gray-400' : myCab.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-amber-500'
                      } animate-pulse`} />
                      <span className={`font-semibold ${
                          myCab.status === 'OFFLINE' ? 'text-gray-600' : myCab.status === 'AVAILABLE' ? 'text-green-800' : 'text-amber-800'
                      }`}>
                    {myCab.status === 'OFFLINE' ? 'Off Duty' : myCab.status === 'AVAILABLE' ? 'On Duty' : 'On Trip'}
                  </span>
                    </div>
                    <button
                        disabled={myCab.status === 'BUSY' || togglingStatus}
                        onClick={async () => {
                          setTogglingStatus(true);
                          try {
                            const newStatus = myCab.status === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE';
                            await updateCabStatus(phone, newStatus);
                            setMyCab({ ...myCab, status: newStatus });
                          } catch (err) {
                            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update status';
                            alert(msg);
                          } finally {
                            setTogglingStatus(false);
                          }
                        }}
                        className={`relative inline-flex items-center w-12 h-6 rounded-full transition ${
                            myCab.status === 'BUSY' ? 'bg-gray-300 cursor-not-allowed' :
                                myCab.status === 'OFFLINE' ? 'bg-gray-300' : 'bg-green-500'
                        }`}
                    >
                  <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      myCab.status !== 'OFFLINE' ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                    </button>
                  </div>
                  {myCab.status === 'BUSY' && (
                      <p className="text-xs text-amber-600 mt-2">Cannot go offline during an active trip.</p>
                  )}
                </div>

                {/* Cab info */}
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

                {/* Active trips */}
                {activeTrips.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-indigo-600" />
                        Active Trip
                      </h3>

                      {activeTrips.map((ride) => (
                          <div key={ride.id} className="bg-indigo-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-indigo-500" />
                              <span className="font-medium text-gray-800">{ride.location.name}</span>
                            </div>

                            {/* "Others" custom destination — prominent banner */}
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

                            {/* Status badge */}
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                ride.status === 'OFFERED'    ? 'bg-orange-100 text-orange-700' :
                                    ride.status === 'ACCEPTED'   ? 'bg-blue-100 text-blue-700' :
                                        ride.status === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-700' :
                                            ride.status === 'ARRIVED'    ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-700'
                            }`}>
                      {ride.status}
                    </span>

                            {/* CTA buttons based on status */}
                            {ride.status === 'OFFERED' && (
                                <button
                                    onClick={() => setConsentRide(ride)}
                                    className="w-full mt-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition"
                                >
                                  Review Assignment
                                </button>
                            )}

                            {ride.status === 'ACCEPTED' && (
                                <button
                                    onClick={() => handleMarkArrived(ride.id)}
                                    disabled={arrivingRideId === ride.id}
                                    className="w-full mt-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  <Navigation className="w-4 h-4" />
                                  {arrivingRideId === ride.id ? 'Arriving…' : 'I\'ve Arrived at Pickup'}
                                </button>
                            )}

                            {ride.status === 'ARRIVED' && (
                                <button
                                    onClick={() => { setOtpRideId(ride.id); setOtpInput(''); setOtpError(''); }}
                                    className="w-full mt-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                                >
                                  <KeyRound className="w-4 h-4" />
                                  Enter Guest OTP to Start
                                </button>
                            )}

                            {ride.status === 'IN_TRANSIT' && (
                                <button
                                    onClick={() => handleCompleteTrip(ride.id)}
                                    disabled={completingRideId === ride.id}
                                    className="w-full mt-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  {completingRideId === ride.id ? 'Completing…' : 'Mark as Completed'}
                                </button>
                            )}
                          </div>
                      ))}
                    </div>
                )}

                {/* Completed history */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition rounded-xl"
                  >
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      Completed Rides ({completedRides.length})
                    </h3>
                    {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {showHistory && (
                      <div className="px-4 pb-4">
                        {completedRides.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-3">No completed rides yet</p>
                        ) : (
                            (() => {
                              const byDate = new Map<string, RideRequest[]>();
                              for (const ride of completedRides) {
                                const date = new Date(ride.requestedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                });
                                if (!byDate.has(date)) byDate.set(date, []);
                                byDate.get(date)!.push(ride);
                              }
                              return Array.from(byDate.entries()).map(([date, rides]) => (
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
                                                {new Date(ride.requestedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                            </div>
                                          </div>
                                      ))}
                                    </div>
                                  </div>
                              ));
                            })()
                        )}
                      </div>
                  )}
                </div>
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