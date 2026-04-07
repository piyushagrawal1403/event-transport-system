import { useState } from 'react';
import { Truck, ChevronDown, ChevronUp, Plus, Pencil, Trash2, X } from 'lucide-react';
import { createCab, updateCab, deleteCab, type Cab } from '../../../api/client';

interface Props {
  cabs: Cab[];
  refresh: () => Promise<void>;
}

interface CabForm {
  licensePlate: string;
  driverName: string;
  driverPhone: string;
  capacity: string;
}

const emptyForm: CabForm = { licensePlate: '', driverName: '', driverPhone: '', capacity: '4' };

export default function CabsManagementPanel({ cabs, refresh }: Props) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CabForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (cab: Cab) => {
    setEditId(cab.id);
    setForm({ licensePlate: cab.licensePlate, driverName: cab.driverName, driverPhone: cab.driverPhone, capacity: String(cab.capacity) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.licensePlate.trim() || !form.driverName.trim() || !form.driverPhone.trim()) return;
    setSaving(true);
    try {
      const payload = { licensePlate: form.licensePlate.trim(), driverName: form.driverName.trim(), driverPhone: form.driverPhone.trim(), capacity: parseInt(form.capacity) || 4 };
      if (editId) { await updateCab(editId, payload); } else { await createCab(payload); }
      setShowForm(false);
      await refresh();
    } catch (err) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save cab');
    } finally { setSaving(false); }
  };

  const handleDelete = async (cab: Cab) => {
    if (cab.status === 'BUSY') { alert('Cannot delete a cab that is currently on a trip.'); return; }
    if (!confirm(`Delete cab ${cab.licensePlate} (${cab.driverName})?`)) return;
    try { await deleteCab(cab.id); await refresh(); }
    catch { alert('Failed to delete cab.'); }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition rounded-xl">
        <h3 className="font-semibold flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-400" />
          Manage Cabs & Drivers ({cabs.length})
        </h3>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <button onClick={openAdd} className="w-full py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> Add Cab / Driver
          </button>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {cabs.map(cab => (
              <div key={cab.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                cab.status === 'AVAILABLE' ? 'bg-green-900/20' : cab.status === 'OFFLINE' ? 'bg-gray-900/30 opacity-60' : 'bg-red-900/20'
              }`}>
                <div className="min-w-0">
                  <p className="font-medium text-gray-200">
                    <span className="font-mono">{cab.licensePlate}</span> — {cab.driverName}
                  </p>
                  <p className="text-xs text-gray-400">{cab.driverPhone} · Cap: {cab.capacity} · {cab.status}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(cab)} className="p-1.5 rounded hover:bg-gray-600 transition" title="Edit">
                    <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <button onClick={() => handleDelete(cab)} disabled={cab.status === 'BUSY'} className="p-1.5 rounded hover:bg-gray-600 transition disabled:opacity-30" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">{editId ? 'Edit Cab / Driver' : 'Add Cab / Driver'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-gray-700 transition"><X className="w-4 h-4 text-gray-300" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">License Plate</label>
                <input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} placeholder="e.g. KA-01-AB-1234" className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Driver Name</label>
                <input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} placeholder="e.g. Rajesh Kumar" className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Driver Phone</label>
                <input value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="e.g. 9876510001" className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Capacity</label>
                <input type="number" min="1" max="20" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving || !form.licensePlate.trim() || !form.driverName.trim() || !form.driverPhone.trim()} className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium transition disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

