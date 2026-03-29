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
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-blue-600" />
        Event Schedule
      </h2>
      <div className="max-h-64 overflow-y-auto space-y-3">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-medium text-gray-500 mb-1">{date}</p>
            <div className="space-y-2 border-l-2 border-blue-200 pl-3">
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
                    className={`w-full text-left rounded-lg p-2 text-sm transition hover:ring-1 hover:ring-blue-300 ${isActive ? 'bg-blue-50 border border-blue-200' : isPast ? 'opacity-50 bg-gray-50' : 'bg-gray-50'}`}
                  >
                    <p className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                      {ev.title}
                      {isActive && <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">NOW</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
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
