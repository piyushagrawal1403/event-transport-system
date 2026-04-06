import { useState } from 'react';
import { Car, ChevronDown, ChevronUp, Award, AlertTriangle, Gauge } from 'lucide-react';
import { getCabAnalytics, type Cab, type DriverAnalytics } from '../../../api/client';

interface FleetPanelProps {
  cabs: Cab[];
  handleExportDriverAnalytics: () => Promise<void>;
  onOpenAnalytics: (analytics: DriverAnalytics) => void;
}

export default function FleetPanel({ cabs, handleExportDriverAnalytics, onOpenAnalytics }: FleetPanelProps) {
  const [showFleet, setShowFleet] = useState(true);
  const [loadingAnalyticsCabId, setLoadingAnalyticsCabId] = useState<number | null>(null);

  const availableCabs = cabs.filter(c => c.status === 'AVAILABLE');

  const openDriverAnalytics = async (cabId: number) => {
    setLoadingAnalyticsCabId(cabId);
    try {
      const res = await getCabAnalytics(cabId);
      onOpenAnalytics(res.data);
    } catch {
      alert('Failed to load driver analytics.');
    } finally {
      setLoadingAnalyticsCabId(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowFleet(!showFleet)}
          className="flex-1 flex items-center justify-between hover:bg-gray-750 transition rounded-xl"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-400" />
            Fleet ({availableCabs.length} free / {cabs.length} total)
          </h3>
          {showFleet ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          onClick={handleExportDriverAnalytics}
          className="rounded-md bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
        >
          Export CSV
        </button>
      </div>
      {showFleet && (
        <div className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto">
          {cabs.map((cab) => (
            <div
              key={cab.id}
              className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                cab.status === 'AVAILABLE' ? 'bg-green-900/20 text-green-300' :
                  cab.status === 'OFFLINE'   ? 'bg-gray-900/30 text-gray-500 opacity-50' :
                    'bg-red-900/20 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{cab.licensePlate}</span>
                <button
                  onClick={() => openDriverAnalytics(cab.id)}
                  className="text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline disabled:opacity-50"
                  disabled={loadingAnalyticsCabId === cab.id}
                >
                  {loadingAnalyticsCabId === cab.id ? 'Loading...' : cab.driverName}
                </button>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 text-xs font-medium">
                  <Award className="w-3 h-3" />
                  {cab.tripsCompleted}
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  {cab.tripsDenied ?? 0}
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 text-xs font-medium">
                  <Gauge className="w-3 h-3" />
                  {(cab.totalKm ?? 0).toFixed(1)} km
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                cab.status === 'AVAILABLE' ? 'bg-green-800 text-green-200' :
                  cab.status === 'OFFLINE'   ? 'bg-gray-700 text-gray-400' :
                    'bg-red-800 text-red-200'
              }`}>
                {cab.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

