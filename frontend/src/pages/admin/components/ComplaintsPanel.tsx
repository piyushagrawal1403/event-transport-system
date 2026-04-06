import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { type Complaint, type ComplaintStatus } from '../../../api/client';

interface ComplaintsPanelProps {
  complaints: Complaint[];
  showComplaints: boolean;
  setShowComplaints: (v: boolean) => void;
  complaintStatusFilter: ComplaintStatus | '';
  setComplaintStatusFilter: (v: ComplaintStatus | '') => void;
  complaintDateFilter: string;
  setComplaintDateFilter: (v: string) => void;
  handleExportComplaints: () => Promise<void>;
  handleCloseComplaint: (id: number) => Promise<void>;
}

export default function ComplaintsPanel({
  complaints,
  showComplaints,
  setShowComplaints,
  complaintStatusFilter,
  setComplaintStatusFilter,
  complaintDateFilter,
  setComplaintDateFilter,
  handleExportComplaints,
  handleCloseComplaint,
}: ComplaintsPanelProps) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <button
        onClick={() => setShowComplaints(!showComplaints)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition rounded-xl"
      >
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          Complaints ({complaints.length})
        </h3>
        {showComplaints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showComplaints && (
        <div className="px-4 pb-4 space-y-2 max-h-72 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={complaintStatusFilter}
              onChange={(e) => setComplaintStatusFilter(e.target.value as ComplaintStatus | '')}
              className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none"
            >
              <option value="">All statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <input
              type="date"
              value={complaintDateFilter}
              onChange={(e) => setComplaintDateFilter(e.target.value)}
              className="rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-200 outline-none"
            />
            <button
              onClick={handleExportComplaints}
              className="rounded-md bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-medium"
            >
              Export CSV
            </button>
          </div>
          {complaints.length === 0 ? (
            <p className="text-sm text-gray-500">No complaints filed.</p>
          ) : complaints.map((complaint) => (
            <div key={complaint.id} className="bg-gray-700/50 rounded-lg p-3 text-sm space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-gray-200 truncate">{complaint.guestName}</p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  complaint.status === 'OPEN' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'
                }`}>
                  {complaint.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">{complaint.guestPhone}</p>
              <p className="text-sm text-gray-300">{complaint.message}</p>
              <p className="text-xs text-gray-500">
                {new Date(complaint.createdAt).toLocaleString()}
                {complaint.rideRequest ? ` · Ride #${complaint.rideRequest.id}` : ''}
              </p>
              {complaint.status === 'OPEN' && (
                <button
                  onClick={() => handleCloseComplaint(complaint.id)}
                  className="text-xs text-green-400 hover:text-green-300 font-medium"
                >
                  Close Complaint
                </button>
              )}
              {complaint.status === 'CLOSED' && complaint.closedAt && (
                <p className="text-xs text-gray-500">
                  Closed {new Date(complaint.closedAt).toLocaleString()} by {complaint.closedBy || 'admin'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

