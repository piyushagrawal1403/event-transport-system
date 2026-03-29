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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Event Details</h1>
          <button onClick={() => navigate(-1)} className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

        {!error && !event && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">Loading event...</div>
        )}

        {event && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                <p className="text-sm text-gray-500 mt-1">Tap back to return to the schedule</p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" />{formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" />{event.location.name}</p>
                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" />Duration: {Math.max(0, Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000))} mins</p>
              </div>

              {event.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img src={event.imageUrl} alt={event.title} className="w-full h-56 object-cover" />
                </div>
              )}

              {!event.imageUrl && (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-400 text-sm">
                  <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                  No event image added yet.
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">More Info</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description || 'Details will be updated by admin soon.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

