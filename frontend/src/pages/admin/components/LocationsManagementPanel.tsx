import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Plus, Pencil, Trash2, X } from 'lucide-react';
import { createLocation, updateLocation, deleteLocation, type Location } from '../../../api/client';

interface Props {
  locations: Location[];
  refresh: () => Promise<void>;
}

interface LocationForm {
  name: string;
  isMainVenue: boolean;
  distanceFromMainVenue: string;
}

const emptyForm: LocationForm = { name: '', isMainVenue: false, distanceFromMainVenue: '0' };

export default function LocationsManagementPanel({ locations, refresh }: Props) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const hotels = locations.filter(l => !l.isMainVenue);
  const venues = locations.filter(l => l.isMainVenue);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (loc: Location) => {
    setEditId(loc.id);
    setForm({ name: loc.name, isMainVenue: loc.isMainVenue, distanceFromMainVenue: String(loc.distanceFromMainVenue) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), isMainVenue: form.isMainVenue, distanceFromMainVenue: parseFloat(form.distanceFromMainVenue) || 0 };
      if (editId) { await updateLocation(editId, payload); } else { await createLocation(payload); }
      setShowForm(false);
      await refresh();
    } catch (err) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save location');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete location "${name}"?`)) return;
    try { await deleteLocation(id); await refresh(); }
    catch { alert('Failed to delete location. It may be referenced by rides or events.'); }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition rounded-xl">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          Locations ({venues.length} venue · {hotels.length} hotels)
        </h3>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <button onClick={openAdd} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> Add Location
          </button>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-200 flex items-center gap-1.5">
                    {loc.name}
                    {loc.isMainVenue && <span className="text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">VENUE</span>}
                  </p>
                  {!loc.isMainVenue && loc.distanceFromMainVenue > 0 && (
                    <p className="text-xs text-gray-400">{loc.distanceFromMainVenue} km from venue</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(loc)} className="p-1.5 rounded hover:bg-gray-600 transition" title="Edit">
                    <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <button onClick={() => handleDelete(loc.id, loc.name)} className="p-1.5 rounded hover:bg-gray-600 transition" title="Delete">
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
              <h3 className="font-semibold">{editId ? 'Edit Location' : 'Add Location'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-gray-700 transition"><X className="w-4 h-4 text-gray-300" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Taj West End" className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Distance from venue (km)</label>
                <input type="number" step="0.1" min="0" value={form.distanceFromMainVenue} onChange={e => setForm(f => ({ ...f, distanceFromMainVenue: e.target.value }))} className="w-full py-2 px-3 bg-gray-700 rounded text-sm text-white outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isMainVenue} onChange={e => setForm(f => ({ ...f, isMainVenue: e.target.checked }))} className="rounded bg-gray-700 border-gray-500" />
                Main Venue
              </label>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-medium transition disabled:opacity-50">
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

