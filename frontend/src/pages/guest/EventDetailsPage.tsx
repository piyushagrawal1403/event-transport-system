import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Image as ImageIcon } from 'lucide-react';
import { getEventById, type EventItinerary } from '../../api/client';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItinerary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) {
      setError('Event not found');
      return;
    }
    getEventById(eventId)
      .then((res) => setEvent(res.data))
      .catch(() => setError('Failed to load event details'));
  }, [eventId]);

  return (
    <div className="wedding-app-bg">
      <div className="wedding-topbar px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>Event Details</h1>
          <button onClick={() => navigate(-1)} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

        {!error && !event && <div className="wedding-card p-6 text-center" style={{ color: 'var(--w-muted)' }}>Loading event...</div>}

        {event && (
          <div className="wedding-card overflow-hidden">
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-3xl font-bold" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>{event.title}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--w-muted)' }}>Tap back to return to the schedule</p>
              </div>

              <div className="space-y-2 text-sm" style={{ color: 'var(--w-muted)' }}>
                <p className="flex items-center gap-2"><Calendar className="w-5 h-5" style={{ color: 'var(--w-accent-strong)' }} /><span className="font-medium">{formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}</span></p>
                <p className="flex items-center gap-2"><MapPin className="w-5 h-5" style={{ color: 'var(--w-accent-strong)' }} /><span className="font-medium">{event.location.name}</span></p>
                <p className="flex items-center gap-2"><Clock className="w-5 h-5" style={{ color: 'var(--w-accent-strong)' }} /><span className="font-medium">Duration: {Math.max(0, Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000))} mins</span></p>
              </div>

              {event.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img src={event.imageUrl} alt={event.title} className="w-full h-56 object-cover" />
                </div>
              )}

              {!event.imageUrl && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ borderColor: 'var(--w-border)', color: 'var(--w-muted)' }}>
                  <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                  No event image added yet.
                </div>
              )}

              <div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>More Info</h3>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--w-muted)' }}>{event.description || 'Details will be updated by admin soon.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

