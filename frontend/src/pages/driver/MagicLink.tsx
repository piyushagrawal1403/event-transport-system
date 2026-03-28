import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, KeyRound, Car, MapPin, Users } from 'lucide-react';
import { completeTrip, getTripRides, updateTripStatus, type RideRequest } from '../../api/client';

export default function MagicLink() {
  const { magicLinkId } = useParams<{ magicLinkId: string }>();
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [tripStatus, setTripStatus] = useState<string>('');

  useEffect(() => {
    if (magicLinkId) {
      getTripRides(magicLinkId).then(res => {
        setRides(res.data);
        if (res.data.length > 0) {
          const s = res.data[0].status;
          setTripStatus(s);
          if (s === 'COMPLETED') {
            setStatus('success');
          }
        }
      }).catch(() => {});
    }
  }, [magicLinkId]);

  const handleNumpad = (digit: string) => {
    if (otp.length < 4) {
      setOtp(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setOtp(prev => prev.slice(0, -1));
  };

  const handleComplete = async () => {
    if (!magicLinkId || otp.length !== 4) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await completeTrip(magicLinkId, otp);
      if (res.data.success) {
        setStatus('success');
        setTripStatus('COMPLETED');
      } else {
        setStatus('error');
        setErrorMsg('Incorrect OTP. Please try again.');
        setOtp('');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Incorrect OTP. Please try again.');
      setOtp('');
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!magicLinkId) return;
    try {
      await updateTripStatus(magicLinkId, newStatus);
      setTripStatus(newStatus);
    } catch {
      alert('Failed to update status');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-800">Trip Completed!</h1>
          <p className="text-green-600 mt-2">Thank you. You are now available for new rides.</p>
          <a
            href="/driver"
            className="inline-block mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-lg"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const totalPax = rides.reduce((sum, r) => sum + r.passengerCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Car className="w-5 h-5" />
            Trip Details
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Trip Info */}
        {rides.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>{rides[0].location.name}</span>
              <span className="text-gray-400">→</span>
              <span>{rides[0].direction === 'TO_VENUE' ? 'Event Venue' : 'Hotel'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>{totalPax} passenger{totalPax !== 1 ? 's' : ''} ({rides.length} ride{rides.length !== 1 ? 's' : ''})</span>
            </div>
          </div>
        )}

        {/* Status Update Buttons */}
        {tripStatus !== 'COMPLETED' && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500 mb-2">Update trip status:</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusUpdate('IN_TRANSIT')}
                disabled={tripStatus === 'IN_TRANSIT'}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  tripStatus === 'IN_TRANSIT'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                In Transit
              </button>
              <button
                onClick={() => handleStatusUpdate('ARRIVED')}
                disabled={tripStatus === 'ARRIVED'}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  tripStatus === 'ARRIVED'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Arrived
              </button>
            </div>
          </div>
        )}

        {/* OTP Input */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center mb-4">
            <KeyRound className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-gray-800">Enter Guest OTP</h2>
            <p className="text-sm text-gray-500">Ask the guest for their 4-digit code</p>
          </div>

          {/* OTP Display */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-mono font-bold transition ${
                  otp[i]
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 bg-gray-50 text-gray-400'
                }`}
              >
                {otp[i] || '·'}
              </div>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((key) => (
              <button
                key={key || 'empty'}
                onClick={() => {
                  if (key === '←') handleBackspace();
                  else if (key) handleNumpad(key);
                }}
                disabled={!key}
                className={`py-4 rounded-xl text-xl font-semibold transition ${
                  !key
                    ? 'invisible'
                    : key === '←'
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 active:bg-gray-300'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{errorMsg}</span>
            </div>
          )}

          {/* Complete Button */}
          <button
            onClick={handleComplete}
            disabled={otp.length !== 4 || status === 'loading'}
            className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold text-lg rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            {status === 'loading' ? 'Verifying...' : 'Complete Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}
