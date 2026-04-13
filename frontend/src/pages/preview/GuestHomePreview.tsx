import { Car, CalendarDays, Headset, MessageSquare, ChevronRight, Sparkles, Heart } from 'lucide-react';

/**
 * GuestHomePreview - A live preview of the new wedding carnival design
 * This uses isolated CSS classes (preview-*) so it doesn't affect existing screens
 */
export default function GuestHomePreview() {
  return (
    <div className="preview-app-bg min-h-dvh">
      {/* Warm Top Banner */}
      <div className="preview-topbar px-4 py-5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-2 left-4 opacity-30">
          <Sparkles className="w-5 h-5 text-amber-200" />
        </div>
        <div className="absolute top-3 right-8 opacity-30">
          <Heart className="w-4 h-4 text-rose-200" />
        </div>
        <div className="absolute bottom-2 right-4 opacity-20">
          <Sparkles className="w-4 h-4 text-amber-100" />
        </div>
        
        <div className="max-w-md mx-auto relative z-10">
          <p className="text-xs uppercase tracking-widest text-rose-100/80 mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
            Welcome to the Celebration
          </p>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>
            Priya &amp; Rahul&apos;s Wedding
          </h1>
          <p className="text-sm text-white/80 mt-1">Hello, Anjali</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-5">
        {/* Celebration Banner Card */}
        <div className="preview-celebration-card p-5 relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-40">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex items-center gap-3">
            <div className="preview-icon-glow w-12 h-12 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: '#5D4037', fontFamily: "'Playfair Display', serif" }}>
                Day 2 of Celebrations
              </p>
              <p className="text-sm" style={{ color: '#8D6E63' }}>Sangeet Ceremony Tonight</p>
            </div>
          </div>
        </div>

        {/* 2x2 Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Event Schedule Card */}
          <button type="button" className="preview-card p-5 text-left group">
            <div className="flex items-center justify-between mb-3">
              <div className="preview-icon-tile w-11 h-11 rounded-2xl flex items-center justify-center">
                <CalendarDays className="w-5 h-5" style={{ color: '#C9736A' }} />
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-70 transition" style={{ color: '#8D6E63' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: '#4E342E', fontFamily: "'Playfair Display', serif" }}>
              Event Schedule
            </p>
            <p className="text-xs mt-1" style={{ color: '#8D6E63' }}>Timeline &amp; ceremonies</p>
          </button>

          {/* Book a Ride Card */}
          <button type="button" className="preview-card p-5 text-left group">
            <div className="flex items-center justify-between mb-3">
              <div className="preview-icon-tile w-11 h-11 rounded-2xl flex items-center justify-center">
                <Car className="w-5 h-5" style={{ color: '#C9736A' }} />
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-70 transition" style={{ color: '#8D6E63' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: '#4E342E', fontFamily: "'Playfair Display', serif" }}>
              Book a Ride
            </p>
            <p className="text-xs mt-1" style={{ color: '#8D6E63' }}>Request transport</p>
          </button>

          {/* Support Helpline Card */}
          <button type="button" className="preview-card p-5 text-left group">
            <div className="flex items-center justify-between mb-3">
              <div className="preview-icon-tile w-11 h-11 rounded-2xl flex items-center justify-center">
                <Headset className="w-5 h-5" style={{ color: '#8FAF8F' }} />
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-70 transition" style={{ color: '#8D6E63' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: '#4E342E', fontFamily: "'Playfair Display', serif" }}>
              Support Helpline
            </p>
            <p className="text-xs mt-1" style={{ color: '#8D6E63' }}>2 contacts available</p>
          </button>

          {/* Complaints Card */}
          <button type="button" className="preview-card p-5 text-left group">
            <div className="flex items-center justify-between mb-3">
              <div className="preview-icon-tile w-11 h-11 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5" style={{ color: '#B8A9C9' }} />
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-70 transition" style={{ color: '#8D6E63' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: '#4E342E', fontFamily: "'Playfair Display', serif" }}>
              Feedback
            </p>
            <p className="text-xs mt-1" style={{ color: '#8D6E63' }}>Share your thoughts</p>
          </button>
        </div>

        {/* Event Carousel Preview */}
        <div className="preview-card p-4">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#8D6E63', fontFamily: "'Cinzel', serif" }}>
            Upcoming Events
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            <div className="preview-event-chip flex-shrink-0 px-4 py-3 rounded-2xl">
              <p className="text-sm font-semibold" style={{ color: '#4E342E' }}>Sangeet</p>
              <p className="text-xs" style={{ color: '#8D6E63' }}>7:00 PM</p>
            </div>
            <div className="preview-event-chip flex-shrink-0 px-4 py-3 rounded-2xl">
              <p className="text-sm font-semibold" style={{ color: '#4E342E' }}>Mehendi</p>
              <p className="text-xs" style={{ color: '#8D6E63' }}>Tomorrow</p>
            </div>
            <div className="preview-event-chip flex-shrink-0 px-4 py-3 rounded-2xl">
              <p className="text-sm font-semibold" style={{ color: '#4E342E' }}>Wedding</p>
              <p className="text-xs" style={{ color: '#8D6E63' }}>Dec 15</p>
            </div>
          </div>
        </div>

        {/* Color Palette Reference */}
        <div className="preview-card p-4">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#8D6E63', fontFamily: "'Cinzel', serif" }}>
            Wedding Carnival Palette
          </p>
          <div className="flex gap-2 flex-wrap">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full" style={{ background: '#FDF6EC' }} />
              <span className="text-[10px] mt-1" style={{ color: '#8D6E63' }}>Ivory</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full" style={{ background: '#F9E4D4' }} />
              <span className="text-[10px] mt-1" style={{ color: '#8D6E63' }}>Blush</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full" style={{ background: '#C9736A' }} />
              <span className="text-[10px] mt-1" style={{ color: '#8D6E63' }}>Rose</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full" style={{ background: '#B8A9C9' }} />
              <span className="text-[10px] mt-1" style={{ color: '#8D6E63' }}>Lavender</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full" style={{ background: '#8FAF8F' }} />
              <span className="text-[10px] mt-1" style={{ color: '#8D6E63' }}>Sage</span>
            </div>
          </div>
        </div>

        {/* Back to main app link */}
        <div className="text-center pt-2 pb-6">
          <a href="/" className="text-sm underline" style={{ color: '#C9736A' }}>
            Back to Main App
          </a>
        </div>
      </div>
    </div>
  );
}
