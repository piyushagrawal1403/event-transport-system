import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { getEvents, getMasterDataSnapshot, type EventItinerary } from '../api/client';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function isLive(ev: EventItinerary) {
  const now = Date.now();
  return now >= new Date(ev.startTime).getTime() && now <= new Date(ev.endTime).getTime();
}

export default function EventCarousel() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItinerary[]>([]);
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragDelta = useRef(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch events
  useEffect(() => {
    const load = () => {
      getEvents()
        .then((r) => setEvents(r.data))
        .catch(async () => {
          try {
            const snap = await getMasterDataSnapshot();
            setEvents(snap.data.events ?? []);
          } catch {
            // silent – keep existing state
          }
        });
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const total = events.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  // Auto-play
  useEffect(() => {
    if (total <= 1) return;
    autoPlayRef.current = setInterval(next, 4500);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [next, total]);

  const pauseAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
  };
  const resumeAutoPlay = () => {
    if (total <= 1) return;
    autoPlayRef.current = setInterval(next, 4500);
  };

  // Touch / pointer drag
  const onPointerDown = (e: React.PointerEvent) => {
    pauseAutoPlay();
    setDragging(true);
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    dragDelta.current = e.clientX - dragStartX.current;
  };
  const onPointerUp = () => {
    if (dragging) {
      if (dragDelta.current < -40) next();
      else if (dragDelta.current > 40) prev();
    }
    setDragging(false);
    resumeAutoPlay();
  };

  if (total === 0) return null;

  const ev = events[current];
  const imageSrc = ev.imageUrl || '/images/default-event.svg';
  const live = isLive(ev);

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: 'var(--w-accent-strong)', fontFamily: "'Cinzel', serif" }}
        >
          Events
        </p>
        {total > 1 && (
          <p className="text-xs" style={{ color: 'var(--w-muted)' }}>
            {current + 1} / {total}
          </p>
        )}
      </div>

      {/* Card */}
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{
          background: 'var(--w-surface)',
          border: '1px solid var(--w-border)',
          boxShadow: 'var(--w-shadow-3d)',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={() => {
          if (Math.abs(dragDelta.current) < 8) {
            navigate(`/events/${ev.id}`);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/events/${ev.id}`); }}
        aria-label={`View event: ${ev.title}`}
      >
        {/* Image */}
        <div className="relative w-full" style={{ height: '11rem' }}>
          <img
            src={imageSrc}
            alt={ev.title}
            className="w-full h-full object-cover"
            draggable={false}
            onError={(e) => {
              const t = e.currentTarget;
              if (!t.src.endsWith('/images/default-event.svg')) {
                t.src = '/images/default-event.svg';
              }
            }}
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(7,20,100,0.80) 0%, rgba(7,20,100,0.25) 55%, transparent 100%)',
            }}
          />

          {/* LIVE badge */}
          {live && (
            <span
              className="absolute top-3 left-3 text-white text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--w-accent-strong)', fontFamily: "'Cinzel', serif" }}
            >
              LIVE
            </span>
          )}

          {/* Nav arrows (only when multiple events) */}
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous event"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition"
                style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}
                onClick={(e) => { e.stopPropagation(); pauseAutoPlay(); prev(); resumeAutoPlay(); }}
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                aria-label="Next event"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition"
                style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}
                onClick={(e) => { e.stopPropagation(); pauseAutoPlay(); next(); resumeAutoPlay(); }}
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </>
          )}

          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <p
              className="text-white font-bold text-base leading-tight"
              style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            >
              {ev.title}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-white/80 text-xs">
                <Clock className="w-3 h-3" />
                {formatDate(ev.startTime)} · {formatTime(ev.startTime)}
              </span>
              <span className="flex items-center gap-1 text-white/80 text-xs">
                <MapPin className="w-3 h-3" />
                {ev.location.name}
              </span>
            </div>
          </div>
        </div>

        {/* Tap-to-view hint */}
        <div className="px-4 py-2 flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--w-muted)' }}>
            Tap to view full details
          </p>
          {/* Dots */}
          {total > 1 && (
            <div className="flex items-center gap-1">
              {events.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to event ${i + 1}`}
                  onClick={(e) => { e.stopPropagation(); pauseAutoPlay(); setCurrent(i); resumeAutoPlay(); }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? '16px' : '6px',
                    height: '6px',
                    background: i === current ? 'var(--w-accent-strong)' : 'var(--w-border)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

