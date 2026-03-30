import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEvents, type EventItinerary } from '../api/client';
const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
export default function EventTimeline() {
  const [events, setEvents] = useState<EventItinerary[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    const fetch = () => { getEvents().then(r => setEvents(r.data)).catch(() => {}); };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);
  if (events.length === 0) return null;
  // Group events by date
  const grouped: Record<string, EventItinerary[]> = {};
  events.forEach(e => {
    const key = formatDate(e.startTime);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  return (
    <div className="wedding-card p-4 mb-4">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>
        <Calendar className="w-4 h-4" style={{ color: 'var(--w-accent)' }} />
        Event Schedule
      </h2>
      <div className="max-h-64 overflow-y-auto space-y-3">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'var(--w-accent-strong)', fontFamily: "'Cinzel', serif" }}>{date}</p>
            <div className="space-y-2 border-l-4 pl-4 relative" style={{ borderColor: 'color-mix(in srgb, var(--w-accent) 50%, transparent 50%)', background: 'linear-gradient(90deg, rgba(201,168,118,0.05) 0%, transparent 100%)' }}>
              {items.map(ev => {
                const now = new Date();
                const start = new Date(ev.startTime);
                const end = new Date(ev.endTime);
                const isActive = now >= start && now <= end;
                const isPast = now > end;
                return (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className={`w-full text-left rounded-xl p-3 text-sm transition border ${isActive ? 'ring-2' : ''} ${isPast ? 'opacity-60' : ''}`}
                    style={{
                      borderColor: 'var(--w-border)',
                      background: isActive ? 'var(--w-accent-soft)' : 'color-mix(in srgb, var(--w-surface-strong) 86%, #ffffff 14%)',
                      boxShadow: isActive ? 'var(--w-shadow-3d), 0 0 0 2px rgba(201, 168, 118, 0.25)' : 'var(--w-shadow-soft)',
                    }}
                  >
                    <p className="font-semibold" style={{ color: isActive ? 'var(--w-accent-strong)' : 'var(--w-text)', fontFamily: "'Playfair Display', serif", fontSize: '1rem' }}>
                      {ev.title}
                      {isActive && <span className="ml-2 text-xs px-2 py-1 rounded-full text-white font-semibold" style={{ background: 'var(--w-accent-strong)', fontSize: '0.7rem', fontFamily: "'Cinzel', serif" }}>LIVE</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs mt-2 flex-wrap" style={{ color: 'var(--w-muted)' }}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(ev.startTime)} - {formatTime(ev.endTime)}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
