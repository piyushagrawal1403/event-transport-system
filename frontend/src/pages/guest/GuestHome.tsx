import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Phone, Users, ArrowRight, Building2, PartyPopper, Minus, Plus, LogOut, Flag, MessageSquare, CalendarDays, Headset, ChevronDown, X, MapPin } from 'lucide-react';
import { createRide, getLocations, getGuestRides, getConfig, createComplaint, type Location, type RideRequest, type RideRequestPayload } from '../../api/client';
import EventTimeline from '../../components/EventTimeline';
import NotificationBanner from '../../components/NotificationBanner';
import { clearAuthSession, getGuestIdentity } from '../../lib/auth';
import { useGuestPush } from './hooks/useGuestPush';
import GuestActiveRideCard from './components/GuestActiveRideCard';

const MAX_CAB_CAPACITY = 4;


export default function GuestHome() {
  const navigate = useNavigate();
  const { name: guestName, phone: guestPhone } = getGuestIdentity();

  // Modal state
  const [openModal, setOpenModal] = useState<'schedule' | 'ride' | 'support' | 'complaints' | null>(null);
  const [direction, setDirection] = useState<'TO_VENUE' | 'TO_HOTEL'>('TO_VENUE');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [customDestination, setCustomDestination] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Active rides state
  const [activeRides, setActiveRides] = useState<RideRequest[]>([]);
  const [, setLoadingRides] = useState(true);
  const [adminPhone, setAdminPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [complaintRideId, setComplaintRideId] = useState<string>('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState('');

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

  useEffect(() => {
    getConfig().then(res => {
      setAdminPhone(res.data.adminPhone || '');
      setAdminName(res.data.adminName || '');
    }).catch(() => {});
  }, []);

  const { unsubscribe } = useGuestPush(guestPhone);

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

  const toggleSection = (section: 'schedule' | 'ride' | 'support' | 'complaints') => {
    setOpenModal(section);
  };

  const handleSubmit = async () => {
    if (!selectedLocationId || !venue) return;
    setSubmitting(true);
    setError('');
    try {
      let remaining = passengerCount;
      while (remaining > 0) {
        const count = Math.min(remaining, MAX_CAB_CAPACITY);
        const selectedLocation = hotels.find(h => h.id === selectedLocationId);
        const payload: RideRequestPayload = { guestName, guestPhone, passengerCount: count, direction, locationId: selectedLocationId };
        if (selectedLocation?.name === 'Others') {
          payload.customDestination = customDestination.trim();
        }
        await createRide(payload);
        remaining -= count;
      }
      setPassengerCount(1);
      setCustomDestination('');
      fetchRides();
    } catch {
      setError('Failed to submit ride request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await unsubscribe();
    clearAuthSession();
    navigate('/');
  };

  const handleSubmitComplaint = async () => {
    if (!complaintMessage.trim()) return false;
    setSubmittingComplaint(true);
    setComplaintSuccess('');
    try {
      await createComplaint({
        guestName,
        guestPhone,
        message: complaintMessage.trim(),
        rideRequestId: complaintRideId ? Number(complaintRideId) : undefined,
      });
      setComplaintMessage('');
      setComplaintRideId('');
      setComplaintSuccess('Complaint submitted. Admin will review it.');
      window.setTimeout(() => setComplaintSuccess(''), 4000);
      return true;
    } catch {
      alert('Failed to submit complaint. Please try again.');
      return false;
    } finally {
      setSubmittingComplaint(false);
    }
  };

  return (
    <div className="wedding-app-bg">
      <NotificationBanner />
      <div className="wedding-topbar px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'white', letterSpacing: '0.02em' }}>Event Transport</h1>
            <p className="text-sm text-white/80">Hi, {guestName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { void handleLogout(); }} className="p-2 hover:bg-white/20 rounded-lg transition" type="button">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <p className="text-sm" style={{ color: 'var(--w-muted)' }}>Choose a card to open details.</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => toggleSection('schedule')}
            className="wedding-card p-5 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--w-accent-soft), var(--w-rose-light))' }}>
                <CalendarDays className="w-5 h-5" style={{ color: 'var(--w-accent-strong)' }} />
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--w-muted)' }} />
            </div>
            <p className="mt-3 text-base font-semibold" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>Event Schedule</p>
            <p className="text-xs mt-1" style={{ color: 'var(--w-muted)' }}>Timeline and ceremonies</p>
          </button>

          <button
            type="button"
            onClick={() => toggleSection('ride')}
            className="wedding-card p-5 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--w-accent-soft), var(--w-rose-light))' }}>
                <Car className="w-5 h-5" style={{ color: 'var(--w-accent-strong)' }} />
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--w-muted)' }} />
            </div>
            <p className="mt-3 text-base font-semibold" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>Book a Ride</p>
            <p className="text-xs mt-1" style={{ color: 'var(--w-muted)' }}>{hasActiveRides ? `${activeRides.length} active` : 'Create new request'}</p>
          </button>

          <button
            type="button"
            onClick={() => toggleSection('support')}
            className="wedding-card p-5 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--w-accent-soft), var(--w-accent-soft))' }}>
                <Headset className="w-5 h-5" style={{ color: 'var(--w-accent-strong)' }} />
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--w-muted)' }} />
            </div>
            <p className="mt-3 text-base font-semibold" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>Support Helpline</p>
            <p className="text-xs mt-1" style={{ color: 'var(--w-muted)' }}>{adminPhone ? adminName || 'Event Admin' : 'Not configured'}</p>
          </button>

          <button
            type="button"
            onClick={() => toggleSection('complaints')}
            className="wedding-card p-5 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--w-rose-light), var(--w-accent-soft))' }}>
                <MessageSquare className="w-5 h-5" style={{ color: 'var(--w-accent-strong)' }} />
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--w-muted)' }} />
            </div>
            <p className="mt-3 text-base font-semibold" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>Complaints</p>
            <p className="text-xs mt-1" style={{ color: 'var(--w-muted)' }}>Report ride issues</p>
          </button>
        </div>


        {openModal === 'schedule' && (
          <div className="wedding-overlay">
            <div className="wedding-modal">
              <div className="wedding-modal-header">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Event Schedule</h2>
                <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-white/20 rounded-lg transition">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="wedding-modal-body">
                <EventTimeline />
              </div>
            </div>
          </div>
        )}

        {openModal === 'support' && (
          <div className="wedding-overlay">
            <div className="wedding-modal">
              <div className="wedding-modal-header">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Support Helpline</h2>
                <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-white/20 rounded-lg transition">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="wedding-modal-body">
                <div className="wedding-card px-4 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--w-muted)', fontFamily: "'Cinzel', serif" }}>Support Helpline</p>
                    <p className="text-base font-semibold truncate" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>{adminName || 'Event Admin'}</p>
                  </div>
                  {adminPhone ? (
                    <a href={`tel:${adminPhone}`} className="flex items-center gap-2 wedding-button-primary px-4 py-3 flex-shrink-0">
                      <Phone className="w-4 h-4" />
                      {adminPhone}
                    </a>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--w-muted)' }}>No support number yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {openModal === 'ride' && (
          <div className="wedding-overlay">
            <div className="wedding-modal">
              <div className="wedding-modal-header">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Book a Ride</h2>
                <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-white/20 rounded-lg transition">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="wedding-modal-body space-y-4">
                {hasActiveRides && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--w-text)', fontFamily: "'Cinzel', serif" }}>
                      <Car className="w-4 h-4" style={{ color: 'var(--w-accent)' }} />
                      Your Active Rides
                    </h3>
                    {activeRides.map((ride) => (
                      <GuestActiveRideCard key={ride.id} ride={ride} fetchRides={fetchRides} />
                    ))}
                    <p className="text-xs text-center" style={{ color: 'var(--w-muted)' }}>Auto-refreshing every 10 seconds</p>
                  </div>
                )}

                <div className="wedding-card p-1 flex gap-1">
                  <button
                    onClick={() => setDirection('TO_VENUE')}
                    className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${direction === 'TO_VENUE' ? 'wedding-button-primary' : 'hover:bg-gray-100'}`}
                    style={{ color: direction === 'TO_VENUE' ? '#fff' : 'var(--w-text)' }}
                  >
                    <PartyPopper className="w-4 h-4" /> Going to Event
                  </button>
                  <button
                    onClick={() => setDirection('TO_HOTEL')}
                    className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${direction === 'TO_HOTEL' ? 'wedding-button-primary' : 'hover:bg-gray-100'}`}
                    style={{ color: direction === 'TO_HOTEL' ? '#fff' : 'var(--w-text)' }}
                  >
                    <Building2 className="w-4 h-4" /> Going to Hotel
                  </button>
                </div>

                <div className="wedding-card p-4">
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--w-text)', fontFamily: "'Cinzel', serif" }}>
                    <MapPin className="w-4 h-4" style={{ color: 'var(--w-accent)' }} />
                    {direction === 'TO_VENUE' ? 'Pickup Hotel' : 'Dropoff Hotel'}
                  </label>
                  <select value={selectedLocationId ?? ''} onChange={(e) => setSelectedLocationId(Number(e.target.value))} className="wedding-input">
                    {hotels.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                  </select>
                  {(() => {
                    const sel = hotels.find(h => h.id === selectedLocationId);
                    return sel?.name === 'Others' && (
                      <div className="mt-3">
                        <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--w-text)', fontFamily: "'Cinzel', serif" }}>
                          <Flag className="w-4 h-4" style={{ color: 'var(--w-accent)' }} />
                          Custom Destination
                        </label>
                        <input type="text" value={customDestination} onChange={(e) => setCustomDestination(e.target.value)} placeholder="Where exactly do you want to go?" className="wedding-input" required />
                      </div>
                    );
                  })()}
                  <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--w-muted)' }}>
                    <ArrowRight className="w-4 h-4" />
                    <span>{direction === 'TO_VENUE' ? venue?.name || 'Main Venue' : 'Selected Hotel'}</span>
                  </div>
                </div>

                <div className="wedding-card p-4">
                  <label className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: 'var(--w-text)', fontFamily: "'Cinzel', serif" }}>
                    <Users className="w-4 h-4" style={{ color: 'var(--w-accent)' }} />
                    Number of Passengers
                  </label>
                  <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                      <Minus className="w-5 h-5 text-gray-600" />
                    </button>
                    <span className="text-4xl font-bold w-16 text-center" style={{ color: 'var(--w-text)' }}>{passengerCount}</span>
                    <button onClick={() => setPassengerCount(Math.min(10, passengerCount + 1))} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                      <Plus className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  {passengerCount > MAX_CAB_CAPACITY && (
                    <p className="text-xs text-amber-600 text-center mt-2">This will be split into {Math.ceil(passengerCount / MAX_CAB_CAPACITY)} cab requests</p>
                  )}
                </div>

                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedLocationId || (hotels.find(h => h.id === selectedLocationId)?.name === 'Others' && !customDestination.trim())}
                  className="w-full py-4 wedding-button-primary disabled:opacity-50 text-lg"
                >
                  {submitting ? 'Submitting...' : 'Request Ride'}
                </button>
              </div>
            </div>
          </div>
        )}

        {openModal === 'complaints' && (
          <div className="wedding-overlay">
            <div className="wedding-modal">
              <div className="wedding-modal-header">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>File a Complaint</h2>
                <button onClick={() => setOpenModal(null)} className="p-2 hover:bg-white/20 rounded-lg transition">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="wedding-modal-body space-y-4">
                <p className="text-sm" style={{ color: 'var(--w-muted)' }}>Tell the admin what went wrong.</p>
                <textarea
                  value={complaintMessage}
                  onChange={(e) => setComplaintMessage(e.target.value)}
                  rows={5}
                  placeholder="Describe your issue..."
                  className="wedding-input text-sm"
                />
                <select value={complaintRideId} onChange={(e) => setComplaintRideId(e.target.value)} className="wedding-input text-sm">
                  <option value="">Related ride (optional)</option>
                  {activeRides.map((ride) => (
                    <option key={ride.id} value={ride.id}>Ride #{ride.id} - {ride.location.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleSubmitComplaint}
                  disabled={submittingComplaint || !complaintMessage.trim()}
                  className="w-full py-3 wedding-button-primary disabled:opacity-50"
                >
                  {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
                </button>
                {complaintSuccess && <p className="text-sm text-green-600 font-medium text-center">{complaintSuccess}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
