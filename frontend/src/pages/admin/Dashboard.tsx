import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle,
  RefreshCw, Send, ChevronDown, ChevronUp, Clock, Bell, BellRing,
  Settings, Save, User, X, MessageSquare, LogOut, MoreVertical
} from 'lucide-react';
import {
  assignRides, closeComplaint, createEvent, updateEvent, deleteEvent, uploadEventImage,
  exportCancelledQueueCsv, exportDriverAnalyticsCsv, exportComplaintsCsv,
  updateConfig,
  type EventItinerary, type Location, type DriverAnalytics,
  type RideIncidentType, type ComplaintStatus
} from '../../api/client';
import { clearAuthSession, getAuthSession } from '../../lib/auth';
import { pushNotificationService } from '../../services/PushNotificationService';
import { parseSupportContacts, serializeSupportContacts, type SupportContact } from '../../lib/supportContacts';

import { useAdminPush } from './hooks/useAdminPush';
import { useAdminPolling } from './hooks/useAdminPolling';
import ActiveTripsPanel from './components/ActiveTripsPanel';
import CancelledQueuePanel from './components/CancelledQueuePanel';
import RideQueuePanel from './components/RideQueuePanel';
import FleetPanel from './components/FleetPanel';
import ComplaintsPanel from './components/ComplaintsPanel';
import CabsManagementPanel from './components/CabsManagementPanel';
import LocationsManagementPanel from './components/LocationsManagementPanel';

export default function Dashboard() {
  const navigate = useNavigate();
  const adminSession = getAuthSession();
  const adminPhone = adminSession?.user.phone || 'admin';

  // ── Cancelled queue filters ─────────────────────────────────────────────
  const [selectedCancelledDate, setSelectedCancelledDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  });
  const [cancelledDriverFilter, setCancelledDriverFilter] = useState('');
  const [cancelledStatusFilter, setCancelledStatusFilter] = useState<RideIncidentType | ''>('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatus | ''>('');
  const [complaintDateFilter, setComplaintDateFilter] = useState('');

  // ── Polling state (groups, cabs, rides, events, etc.) ──────────────────
  const polling = useAdminPolling(
    { selectedCancelledDate, cancelledDriverFilter, cancelledStatusFilter },
    { complaintStatusFilter, complaintDateFilter },
  );

  // ── Push notification state ────────────────────────────────────────────
  const push = useAdminPush(adminPhone);

  // ── Local UI state ─────────────────────────────────────────────────────
  const [selectedRides, setSelectedRides] = useState<Map<number, number>>(new Map());
  const [selectedCabId, setSelectedCabId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<{ magicLinkId: string; otp: string } | null>(null);
  const [showEvents, setShowEvents] = useState(true);
  const [showCancelledQueue, setShowCancelledQueue] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const [eventImageError, setEventImageError] = useState('');
  const [eventForm, setEventForm] = useState({ title: '', description: '', imageUrl: '', startTime: '', endTime: '', locationId: '', notifyGuests: false });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [analyticsModal, setAnalyticsModal] = useState<DriverAnalytics | null>(null);
  const [showMobileHeaderMenu, setShowMobileHeaderMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [supportContactInputs, setSupportContactInputs] = useState<SupportContact[]>([{ name: '', phone: '' }]);

  const { groups, cabs, ongoingRides, cancelledRides, events, complaints, locations, loading, unauthorized, lastRefresh, settingsForm, fetchData, fetchEvents, setSettingsForm } = polling;
  const { adminPushPermission, adminPushEnabled, enablingAdminPush, pushSubCount, loadingPushSubCount, sendingTestPush, testPushResult, handleEnableAdminNotifications, handleLoadPushSubCount, handleSendTestPush, resetPushDebug } = push;

  useEffect(() => {
    if (!showSettings) return;
    const parsed = parseSupportContacts(settingsForm.adminName, settingsForm.adminPhone);
    setSupportContactInputs(parsed.length > 0 ? parsed : [{ name: '', phone: '' }]);
  }, [showSettings, settingsForm.adminName, settingsForm.adminPhone]);

  const openSettingsModal = () => {
    const parsed = parseSupportContacts(settingsForm.adminName, settingsForm.adminPhone);
    setSupportContactInputs(parsed.length > 0 ? parsed : [{ name: '', phone: '' }]);
    setShowSettings(true);
    resetPushDebug();
  };

  const updateSupportContactInput = (index: number, field: 'name' | 'phone', value: string) => {
    setSupportContactInputs((prev) => prev.map((entry, idx) => (
      idx === index ? { ...entry, [field]: value } : entry
    )));
  };

  const addSupportContactInput = () => {
    setSupportContactInputs((prev) => [...prev, { name: '', phone: '' }]);
  };

  const removeSupportContactInput = (index: number) => {
    setSupportContactInputs((prev) => {
      if (prev.length === 1) {
        return [{ name: '', phone: '' }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const toggleRide = (rideId: number, paxCount: number) => {
    setSelectedRides(prev => {
      const next = new Map(prev);
      if (next.has(rideId)) { next.delete(rideId); } else { next.set(rideId, paxCount); }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedRides.size === 0 || !selectedCabId) return;
    setAssigning(true);
    try {
      const res = await assignRides({ cabId: selectedCabId, rideIds: Array.from(selectedRides.keys()) });
      setAssignResult({ magicLinkId: res.data.magicLinkId, otp: res.data.otp });


      setSelectedRides(new Map());
      setSelectedCabId(null);
      await fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setAssignResult(null), 10000);
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to assign rides. Check console for details.';
      alert(errorMsg);
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveSettings = async () => {
    const hasAnyRowData = supportContactInputs.some((entry) => entry.name.trim() || entry.phone.trim());
    const hasPartialRow = supportContactInputs.some((entry) => {
      const hasName = entry.name.trim().length > 0;
      const hasPhone = entry.phone.trim().length > 0;
      return (hasName && !hasPhone) || (!hasName && hasPhone);
    });

    if (!hasAnyRowData || hasPartialRow) {
      alert('Each support contact must include both name and mobile number.');
      return;
    }

    const serialized = serializeSupportContacts(supportContactInputs);
    if (!serialized.adminName || !serialized.adminPhone) {
      return;
    }

    setSavingSettings(true);
    try {
      await updateConfig({ adminName: serialized.adminName, adminPhone: serialized.adminPhone });
      setSettingsForm((prev) => ({ ...prev, adminName: serialized.adminName, adminPhone: serialized.adminPhone }));
      setSupportContactInputs(parseSupportContacts(serialized.adminName, serialized.adminPhone));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      alert('Failed to save settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = useCallback(async () => {
    await pushNotificationService.unsubscribeUser();
    clearAuthSession();
    navigate('/');
  }, [navigate]);

  const handleCloseComplaint = async (complaintId: number) => {
    const supportContacts = parseSupportContacts(settingsForm.adminName, settingsForm.adminPhone);
    const closedByName = supportContacts[0]?.name || settingsForm.adminName || 'admin';
    try {
      await closeComplaint(complaintId, closedByName);
      await fetchData();
    } catch {
      alert('Failed to close complaint.');
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCancelledQueue = async () => {
    try {
      const res = await exportCancelledQueueCsv({ date: selectedCancelledDate, driver: cancelledDriverFilter.trim() || undefined, status: cancelledStatusFilter || undefined });
      downloadBlob(res.data, `cancelled-queue-${selectedCancelledDate}.csv`);
    } catch { alert('Failed to export cancelled queue CSV.'); }
  };

  const handleExportDriverAnalytics = async () => {
    try {
      const res = await exportDriverAnalyticsCsv();
      downloadBlob(res.data, 'driver-analytics-summary.csv');
    } catch { alert('Failed to export driver analytics CSV.'); }
  };

  const handleExportComplaints = async () => {
    try {
      const res = await exportComplaintsCsv({ status: complaintStatusFilter || undefined, date: complaintDateFilter || undefined });
      downloadBlob(res.data, `complaints-${complaintDateFilter || 'all'}.csv`);
    } catch { alert('Failed to export complaints CSV.'); }
  };

  const getDatePart = (value: string) => (value ? value.slice(0, 10) : '');
  const getTimePart = (value: string) => (value ? value.slice(11, 16) : '');

  const updateEventDateTime = (field: 'startTime' | 'endTime', part: 'date' | 'time', value: string) => {
    setEventForm((current) => {
      const existing = current[field];
      const date = part === 'date' ? value : (getDatePart(existing) || new Date().toISOString().slice(0, 10));
      const time = part === 'time' ? value : (getTimePart(existing) || (field === 'startTime' ? '09:00' : '10:00'));
      return { ...current, [field]: date && time ? `${date}T${time}` : existing };
    });
  };

  const formatAcceptanceTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    const mins = Math.floor(seconds / 60);
    const remSecs = Math.round(seconds % 60);
    return `${mins}m ${remSecs}s`;
  };

  const availableCabs = cabs.filter(c => c.status === 'AVAILABLE');
  const openComplaintsCount = complaints.filter(c => c.status === 'OPEN').length;
  const selectedPaxCount = Array.from(selectedRides.values()).reduce((sum, pax) => sum + pax, 0);
  const selectedCab = cabs.find(c => c.id === selectedCabId);
  const isOverCapacity = selectedCab ? selectedPaxCount > selectedCab.capacity : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h2 className="text-xl font-semibold">Unauthorized</h2>
          <p className="text-sm text-gray-400">You do not have access to admin operations. Please sign in with an admin-enabled session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-700/80 bg-gray-900/90 px-3 py-3 backdrop-blur sm:px-4">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">Dispatch Dashboard</h1>
              <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                {groups.reduce((sum, g) => sum + g.rides.length, 0)} pending · {availableCabs.length} cabs free
              </p>
            </div>
            <div className="hidden sm:inline text-xs text-gray-500 whitespace-nowrap">Updated {lastRefresh.toLocaleTimeString()}</div>
          </div>

          <div className="space-y-2 sm:space-y-0">
            <div className="flex items-center justify-between gap-2 sm:hidden">
              <button onClick={fetchData} className="inline-flex h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg bg-gray-800 px-3 transition hover:bg-gray-700" title="Refresh" type="button">
                <RefreshCw className="h-4 w-4" />
              </button>

              <span className={`inline-flex h-11 items-center gap-1 rounded-full px-3 text-xs font-medium ${
                adminPushEnabled ? 'bg-green-900/70 text-green-200' : adminPushPermission === 'denied' ? 'bg-red-900/70 text-red-200' : 'bg-yellow-900/70 text-yellow-200'
              }`}>
                {adminPushEnabled ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                {adminPushEnabled ? 'Alerts required' : adminPushPermission === 'denied' ? 'Blocked' : 'Pending'}
              </span>

              <div className="relative">
                <button onClick={() => setShowMobileHeaderMenu((c) => !c)} className="inline-flex h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg bg-gray-800 px-3 transition hover:bg-gray-700" title="More actions" type="button">
                  <MoreVertical className="h-4 w-4" />
                </button>

                {showMobileHeaderMenu && (
                  <div className="absolute right-0 top-12 z-30 w-48 space-y-1 rounded-xl border border-gray-700 bg-gray-800 p-1.5 shadow-xl">
                    <button onClick={() => { setShowComplaints((c) => !c); setShowMobileHeaderMenu(false); }} className="flex h-11 w-full touch-manipulation items-center justify-between rounded-lg px-3 text-sm hover:bg-gray-700" type="button">
                      <span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" />Complaints</span>
                      <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs">{openComplaintsCount}</span>
                    </button>
                    <button onClick={() => { setShowMobileHeaderMenu(false); void handleEnableAdminNotifications(); }} className="flex h-11 w-full touch-manipulation items-center gap-2 rounded-lg px-3 text-sm hover:bg-gray-700" type="button" disabled={adminPushPermission === 'unsupported' || enablingAdminPush}>
                      <Bell className="h-4 w-4" />
                      {enablingAdminPush ? 'Enabling alerts…' : adminPushEnabled ? 'Refresh alerts' : 'Enable alerts'}
                    </button>
                    <button onClick={() => { openSettingsModal(); setShowMobileHeaderMenu(false); }} className="flex h-11 w-full touch-manipulation items-center gap-2 rounded-lg px-3 text-sm hover:bg-gray-700" type="button">
                      <Settings className="h-4 w-4" />Settings
                    </button>
                    <button onClick={() => { setShowMobileHeaderMenu(false); void handleLogout(); }} className="flex h-11 w-full touch-manipulation items-center gap-2 rounded-lg px-3 text-sm text-red-300 hover:bg-gray-700" type="button">
                      <LogOut className="h-4 w-4" />Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {adminPushPermission === 'denied' && (
              <p className="text-xs text-red-300 sm:hidden">Admin alerts are mandatory. Re-enable browser notification permission.</p>
            )}

            <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
              <button onClick={() => setShowComplaints((c) => !c)} className="relative inline-flex h-11 touch-manipulation items-center justify-center rounded-lg bg-gray-800 px-3 text-sm font-medium transition hover:bg-gray-700" title="Complaints" type="button">
                <MessageSquare className="h-4 w-4" /><span>Complaints</span>
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${openComplaintsCount > 0 ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-600 text-gray-200'}`}>{openComplaintsCount}</span>
              </button>
              <button onClick={fetchData} className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg bg-gray-800 px-3 transition hover:bg-gray-700" title="Refresh" type="button"><RefreshCw className="h-4 w-4" /></button>
              <button onClick={openSettingsModal} className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg bg-gray-800 px-3 transition hover:bg-gray-700" title="Settings" type="button"><Settings className="h-4 w-4" /></button>
              <button onClick={() => { void handleLogout(); }} className="inline-flex h-11 touch-manipulation items-center justify-center rounded-lg bg-gray-800 px-3 text-sm font-medium transition hover:bg-gray-700" title="Logout" type="button"><LogOut className="h-4 w-4" /><span>Logout</span></button>

              <div className="col-span-4 mt-0.5 hidden flex-wrap items-center justify-between gap-1.5 sm:col-span-full sm:mt-0 sm:flex sm:justify-end sm:gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs ${
                  adminPushEnabled ? 'bg-green-900/70 text-green-200' : adminPushPermission === 'denied' ? 'bg-red-900/70 text-red-200' : 'bg-yellow-900/70 text-yellow-200'
                }`}>
                  {adminPushEnabled ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  {adminPushEnabled ? 'Alerts required' : adminPushPermission === 'denied' ? 'Blocked' : adminPushPermission === 'unsupported' ? 'Unsupported' : 'Pending'}
                </span>
                {adminPushPermission !== 'unsupported' && (
                  <button onClick={() => { void handleEnableAdminNotifications(); }} disabled={enablingAdminPush} title={adminPushEnabled ? 'Refresh alert subscription' : 'Enable notifications'} className="inline-flex h-9 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs" type="button">
                    <Bell className="h-3.5 w-3.5" />
                    {enablingAdminPush ? 'Enabling…' : adminPushEnabled ? 'Refresh alerts' : 'Enable alerts'}
                  </button>
                )}
                {adminPushPermission === 'denied' && <span className="text-xs text-red-300">Admin alerts are mandatory; enable browser notifications.</span>}
                <span className="text-[11px] text-gray-500 sm:hidden">Updated {lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Result Toast */}
      {assignResult && (
        <div className="bg-green-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>
              Dispatched! Status: <strong>OFFERED</strong> — awaiting driver acceptance.
              &nbsp;Magic Link: <code className="bg-green-700 px-2 py-0.5 rounded">/d/{assignResult.magicLinkId}</code>
              &nbsp;Guest OTP: <code className="bg-green-700 px-2 py-0.5 rounded font-mono">{assignResult.otp}</code>
              <em className="text-green-200 text-xs ml-2">(shown to guest at pickup)</em>
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Queue Column ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <ActiveTripsPanel ongoingRides={ongoingRides} fetchData={fetchData} />
          <CancelledQueuePanel
            cancelledRides={cancelledRides} showCancelledQueue={showCancelledQueue} setShowCancelledQueue={setShowCancelledQueue}
            selectedCancelledDate={selectedCancelledDate} setSelectedCancelledDate={setSelectedCancelledDate}
            cancelledDriverFilter={cancelledDriverFilter} setCancelledDriverFilter={setCancelledDriverFilter}
            cancelledStatusFilter={cancelledStatusFilter} setCancelledStatusFilter={setCancelledStatusFilter}
            handleExportCancelledQueue={handleExportCancelledQueue}
          />
          <RideQueuePanel groups={groups} selectedRides={selectedRides} toggleRide={toggleRide} fetchData={fetchData} />
        </div>

        {/* ── Fleet & Action Column ───────────────────────────── */}
        <div className="space-y-4">
          {/* Dispatch Panel */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-blue-400" />Dispatch</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Selected Rides</label>
                <div className="text-2xl font-bold">
                  {selectedRides.size}
                  {selectedRides.size > 0 && <span className="text-base font-normal text-yellow-400 ml-2">({selectedPaxCount} pax)</span>}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Assign to Cab</label>
                <select value={selectedCabId ?? ''} onChange={(e) => setSelectedCabId(Number(e.target.value) || null)} className="w-full py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select a cab...</option>
                  {availableCabs.map((cab) => <option key={cab.id} value={cab.id}>{cab.licensePlate} — {cab.driverName} (Cap: {cab.capacity})</option>)}
                </select>
              </div>
              {isOverCapacity && (
                <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-amber-300 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />{selectedPaxCount} pax exceeds cab capacity ({selectedCab?.capacity}). Assign fewer rides.
                </div>
              )}
              <button onClick={handleAssign} disabled={selectedRides.size === 0 || !selectedCabId || assigning} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 font-semibold rounded-lg transition">
                {assigning ? 'Dispatching…' : 'Assign & Dispatch'}
              </button>
              {selectedRides.size === 0 && groups.length > 0 && (
                <p className="text-xs text-gray-500 text-center">Select rides → pick a cab → dispatch. Rides move to OFFERED until driver accepts.</p>
              )}
            </div>
          </div>

          <FleetPanel cabs={cabs} handleExportDriverAnalytics={handleExportDriverAnalytics} onOpenAnalytics={setAnalyticsModal} />

          <CabsManagementPanel cabs={cabs} refresh={fetchData} />
          <LocationsManagementPanel locations={locations} refresh={fetchEvents} />

          <ComplaintsPanel
            complaints={complaints} showComplaints={showComplaints} setShowComplaints={setShowComplaints}
            complaintStatusFilter={complaintStatusFilter} setComplaintStatusFilter={setComplaintStatusFilter}
            complaintDateFilter={complaintDateFilter} setComplaintDateFilter={setComplaintDateFilter}
            handleExportComplaints={handleExportComplaints} handleCloseComplaint={handleCloseComplaint}
          />

          {/* Event Management */}
          <EventManagementPanel
            events={events} locations={locations} showEvents={showEvents} setShowEvents={setShowEvents}
            setShowEventForm={setShowEventForm} setEditingEventId={setEditingEventId} setEventForm={setEventForm}
            setEventImageFile={setEventImageFile} setEventImageError={setEventImageError} fetchEvents={fetchEvents}
          />
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <EventFormModal
          eventForm={eventForm} setEventForm={setEventForm} editingEventId={editingEventId}
          eventImageFile={eventImageFile} setEventImageFile={setEventImageFile}
          uploadingEventImage={uploadingEventImage} setUploadingEventImage={setUploadingEventImage}
          eventImageError={eventImageError} setEventImageError={setEventImageError}
          locations={locations} getDatePart={getDatePart} getTimePart={getTimePart}
          updateEventDateTime={updateEventDateTime}
          onClose={() => { setShowEventForm(false); setEventImageFile(null); setEventImageError(''); }}
          fetchEvents={fetchEvents}
        />
      )}

      {/* Analytics Modal */}
      {analyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Driver Analytics</h3>
              <button onClick={() => setAnalyticsModal(null)} className="p-1.5 rounded hover:bg-gray-700 transition"><X className="w-4 h-4 text-gray-300" /></button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p className="text-gray-200 font-medium">{analyticsModal.driverName}</p>
              <p className="text-gray-400">{analyticsModal.licensePlate}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-gray-700 rounded p-2"><p className="text-xs text-gray-400">Total Km</p><p className="text-lg font-semibold text-blue-300">{(analyticsModal.totalKm ?? 0).toFixed(1)}</p></div>
                <div className="bg-gray-700 rounded p-2"><p className="text-xs text-gray-400">Avg Acceptance</p><p className="text-lg font-semibold text-green-300">{formatAcceptanceTime(analyticsModal.averageAcceptanceTimeSeconds)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-gray-700 rounded p-2"><p className="text-xs text-gray-400">Trips Completed</p><p className="text-lg font-semibold text-purple-300">{analyticsModal.tripsCompleted}</p></div>
                <div className="bg-gray-700 rounded p-2"><p className="text-xs text-gray-400">Trips Denied</p><p className="text-lg font-semibold text-red-300">{analyticsModal.tripsDenied}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-gray-300" />Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded hover:bg-gray-700 transition" title="Close settings"><X className="w-4 h-4 text-gray-300" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Admin contact shown to guests and drivers.</p>
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-400 mb-1"><User className="w-3 h-3" /> Support Contacts (Name + Number)</label>
                <div className="space-y-2">
                  {supportContactInputs.map((contact, index) => (
                    <div key={`support-contact-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={e => updateSupportContactInput(index, 'name', e.target.value)}
                        placeholder={`Contact name ${index + 1}`}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={contact.phone}
                        onChange={e => updateSupportContactInput(index, 'phone', e.target.value)}
                        placeholder={`Support number ${index + 1}`}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        onClick={() => removeSupportContactInput(index)}
                        className="px-2.5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs font-semibold transition"
                        disabled={supportContactInputs.length === 1}
                        type="button"
                        title="Remove contact"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSupportContactInput}
                    className="w-full py-2 rounded-lg border border-dashed border-gray-600 text-xs text-gray-300 hover:bg-gray-700 transition"
                    type="button"
                  >
                    + Add another contact
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">Guests and drivers will see all saved names with their numbers.</p>
              </div>
              <button onClick={handleSaveSettings} disabled={savingSettings || supportContactInputs.every((entry) => !entry.name.trim() && !entry.phone.trim())} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" />{savingSettings ? 'Saving…' : settingsSaved ? '✓ Saved!' : 'Save Settings'}
              </button>
              {/* Push Notification Debug Panel */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><BellRing className="w-3.5 h-3.5" />Push Notification Debug</p>
                <p className="text-xs text-gray-500">Use these tools to verify push subscriptions are saved and that delivery works.</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => { void handleLoadPushSubCount(); }} disabled={loadingPushSubCount} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50" type="button">
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingPushSubCount ? 'animate-spin' : ''}`} />{loadingPushSubCount ? 'Checking…' : 'Check DB subscriptions'}
                  </button>
                  {pushSubCount !== null && (
                    <span className={`text-xs px-2 py-1 rounded-lg font-mono ${pushSubCount.adminCount > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {pushSubCount.adminCount} admin / {pushSubCount.total} total
                    </span>
                  )}
                </div>
                {pushSubCount !== null && pushSubCount.adminCount === 0 && (
                  <p className="text-xs text-red-300 bg-red-950 border border-red-800 rounded-lg px-2 py-1.5">⚠ No ADMIN subscription in DB. Close this panel, click <strong>"Enable alerts"</strong> in the header, then re-check.</p>
                )}
                {pushSubCount !== null && pushSubCount.subscriptions.length > 0 && (
                  <div className="rounded-lg border border-gray-700 bg-gray-900/40 px-2 py-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {pushSubCount.subscriptions
                      .filter((entry) => entry.userType === 'ADMIN')
                      .slice(0, 6)
                      .map((entry) => (
                        <div key={entry.id} className="text-[11px] text-gray-300 leading-snug">
                          <p className="font-mono text-gray-400">{entry.endpointSuffix}</p>
                          <p>
                            status: <span className="font-semibold">{entry.lastDeliveryStatus ?? 'PENDING'}</span>
                            {entry.lastDeliveryHttpStatus != null ? ` (${entry.lastDeliveryHttpStatus})` : ''}
                            {entry.lastDeliveryAt ? ` at ${new Date(entry.lastDeliveryAt).toLocaleTimeString()}` : ''}
                          </p>
                          {entry.lastDeliveryError && (
                            <p className="text-red-300">error: {entry.lastDeliveryError}</p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
                <button onClick={() => { void handleSendTestPush(); }} disabled={sendingTestPush} className="w-full py-1.5 bg-indigo-700 hover:bg-indigo-600 text-sm rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50" type="button">
                  <Send className="w-3.5 h-3.5" />{sendingTestPush ? 'Sending…' : 'Send test push to admin'}
                </button>
                {testPushResult && (
                  <p className={`text-xs px-2 py-1.5 rounded-lg border ${testPushResult.success ? 'bg-green-900 border-green-700 text-green-300' : 'bg-red-950 border-red-800 text-red-300'}`}>
                    {testPushResult.success ? '✓ ' : '✗ '}{testPushResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Inline sub-components ────────────────────────────────────────────── */

function EventManagementPanel({ events, locations, showEvents, setShowEvents, setShowEventForm, setEditingEventId, setEventForm, setEventImageFile, setEventImageError, fetchEvents }: {
  events: EventItinerary[]; locations: Location[]; showEvents: boolean; setShowEvents: (v: boolean) => void;
  setShowEventForm: (v: boolean) => void; setEditingEventId: (v: string | null) => void;
  setEventForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; imageUrl: string; startTime: string; endTime: string; locationId: string; notifyGuests: boolean }>>;
  setEventImageFile: (v: File | null) => void; setEventImageError: (v: string) => void;
  fetchEvents: () => Promise<void>;
}) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <button onClick={() => setShowEvents(!showEvents)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition rounded-xl">
        <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" />Events ({events.length})</h3>
        {showEvents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showEvents && (
        <div className="px-4 pb-4 space-y-2">
          <button onClick={() => { setShowEventForm(true); setEditingEventId(null); setEventImageFile(null); setEventImageError(''); setEventForm({ title: '', description: '', imageUrl: '', startTime: '', endTime: '', locationId: locations[0]?.id?.toString() || '', notifyGuests: false }); }} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">+ Add Event</button>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {events.map(ev => (
              <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50 text-sm">
                <div>
                  <p className="font-medium text-gray-200">{ev.title}</p>
                  <p className="text-xs text-gray-400">{new Date(ev.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })} - {new Date(ev.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingEventId(ev.id); setEventImageFile(null); setEventImageError(''); setEventForm({ title: ev.title, description: ev.description || '', imageUrl: ev.imageUrl || '', startTime: ev.startTime.slice(0, 16), endTime: ev.endTime.slice(0, 16), locationId: ev.location.id.toString(), notifyGuests: false }); setShowEventForm(true); }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Delete event "${ev.title}"? This cannot be undone.`)) return;
                      try {
                        await deleteEvent(ev.id);
                        await fetchEvents();
                      } catch {
                        alert('Failed to delete event');
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventFormModal({ eventForm, setEventForm, editingEventId, eventImageFile, setEventImageFile, uploadingEventImage, setUploadingEventImage, eventImageError, setEventImageError, locations, getDatePart, getTimePart, updateEventDateTime, onClose, fetchEvents }: {
  eventForm: { title: string; description: string; imageUrl: string; startTime: string; endTime: string; locationId: string; notifyGuests: boolean };
  setEventForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; imageUrl: string; startTime: string; endTime: string; locationId: string; notifyGuests: boolean }>>;
  editingEventId: string | null; eventImageFile: File | null; setEventImageFile: (v: File | null) => void;
  uploadingEventImage: boolean; setUploadingEventImage: (v: boolean) => void; eventImageError: string; setEventImageError: (v: string) => void;
  locations: Location[]; getDatePart: (v: string) => string; getTimePart: (v: string) => string;
  updateEventDateTime: (field: 'startTime' | 'endTime', part: 'date' | 'time', value: string) => void; onClose: () => void; fetchEvents: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold">{editingEventId ? 'Edit Event' : 'Add Event'}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-700 transition"><X className="w-4 h-4 text-gray-300" /></button>
        </div>
        <div className="p-4 space-y-3">
          <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Event Title" className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none" />
          <textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Description / more info" rows={4} className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none" />
          <div className="rounded-lg border border-gray-600 p-3 space-y-2">
            <p className="text-xs text-gray-400">Event image</p>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (!file) { setEventImageFile(null); setEventImageError(''); return; }
              if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setEventImageFile(null); setEventImageError('Only JPG, PNG, or WEBP images are allowed.'); return; }
              if (file.size > 5 * 1024 * 1024) { setEventImageFile(null); setEventImageError('Image exceeds max size of 5MB.'); return; }
              setEventImageFile(file); setEventImageError('');
            }} className="w-full text-xs text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-blue-500" />
            <div className="flex items-center gap-2">
              <button type="button" onClick={async () => {
                if (!eventImageFile) return;
                setUploadingEventImage(true); setEventImageError('');
                try { const res = await uploadEventImage(eventImageFile); setEventForm(f => ({ ...f, imageUrl: res.data.imageUrl })); }
                catch { setEventImageError('Failed to upload image. Please try again.'); }
                finally { setUploadingEventImage(false); }
              }} disabled={!eventImageFile || uploadingEventImage} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                {uploadingEventImage ? 'Uploading...' : 'Upload Image'}
              </button>
              {eventForm.imageUrl && <span className="text-xs text-green-400">Uploaded</span>}
            </div>
            {eventImageError && <p className="text-xs text-red-400">{eventImageError}</p>}
            {eventForm.imageUrl && <img src={eventForm.imageUrl} alt="Event preview" className="h-24 w-full object-cover rounded-md border border-gray-600" />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-400">Start date</label><input type="date" value={getDatePart(eventForm.startTime)} onChange={e => updateEventDateTime('startTime', 'date', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" /></div>
            <div><label className="text-xs text-gray-400">Start time</label><input type="time" value={getTimePart(eventForm.startTime)} onChange={e => updateEventDateTime('startTime', 'time', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-400">End date</label><input type="date" value={getDatePart(eventForm.endTime)} onChange={e => updateEventDateTime('endTime', 'date', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" /></div>
            <div><label className="text-xs text-gray-400">End time</label><input type="time" value={getTimePart(eventForm.endTime)} onChange={e => updateEventDateTime('endTime', 'time', e.target.value)} className="w-full py-2 px-2 bg-gray-700 rounded text-sm text-white outline-none" /></div>
          </div>
          <select value={eventForm.locationId} onChange={e => setEventForm(f => ({ ...f, locationId: e.target.value }))} className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white outline-none">
            {locations.filter(l => l.isMainVenue).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={eventForm.notifyGuests} onChange={e => setEventForm(f => ({ ...f, notifyGuests: e.target.checked }))} className="rounded bg-gray-700 border-gray-500" />
            Notify all guests (push notification)
          </label>
          <div className="flex gap-2">
            <button onClick={async () => {
              const payload = { title: eventForm.title, description: eventForm.description || null, imageUrl: eventForm.imageUrl || null, startTime: eventForm.startTime, endTime: eventForm.endTime, locationId: Number(eventForm.locationId), notifyGuests: eventForm.notifyGuests };
              try { if (editingEventId) { await updateEvent(editingEventId, payload); } else { await createEvent(payload); } onClose(); await fetchEvents(); }
              catch { alert('Failed to save event'); }
            }} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition">Save</button>
            <button onClick={onClose} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}