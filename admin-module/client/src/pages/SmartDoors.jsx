import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminShell from '../components/AdminShell';
import { DoorClosed, PlusCircle, Power, RefreshCw } from 'lucide-react';

const SmartDoors = () => {
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ doorId: '', name: '', status: 'Offline', isEnabled: true });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2600);
  };

  const fetchDoors = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/smart-doors');
      if (response.data.success) setDoors(response.data.doors || []);
    } catch (error) {
      triggerToast('Unable to load smart doors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoors();
  }, []);

  const openModal = (door = null) => {
    if (door) {
      setEditingId(door._id);
      setFormData({ doorId: door.doorId, name: door.name, status: door.status, isEnabled: door.isEnabled });
    } else {
      setEditingId(null);
      setFormData({ doorId: '', name: '', status: 'Offline', isEnabled: true });
    }
    setShowModal(true);
  };

  const saveDoor = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/smart-doors/${editingId}`, formData);
        triggerToast('Smart door updated');
      } else {
        await axios.post('http://localhost:5000/api/smart-doors', formData);
        triggerToast('Smart door created');
      }
      setShowModal(false);
      fetchDoors();
    } catch (error) {
      triggerToast(error.response?.data?.message || 'Unable to save smart door', 'error');
    }
  };

  const toggleDoor = async (door) => {
    try {
      await axios.patch(`http://localhost:5000/api/smart-doors/${door._id}/toggle`);
      triggerToast(`Door ${door.isEnabled ? 'disabled' : 'enabled'}`);
      fetchDoors();
    } catch (error) {
      triggerToast('Unable to toggle status', 'error');
    }
  };

  const deleteDoor = async (id) => {
    if (!window.confirm('Delete this smart door record?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/smart-doors/${id}`);
      triggerToast('Smart door removed');
      fetchDoors();
    } catch (error) {
      triggerToast('Unable to delete smart door', 'error');
    }
  };

  return (
    <AdminShell title="Smart Door Management">
      <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-900">
        {toast.show && <div className={`fixed right-4 top-20 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.message}</div>}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Door registry overview</h2>
            <p className="text-sm text-slate-500">Monitor availability, status, and synchronization.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => openModal()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><PlusCircle className="h-4 w-4" /> Add door</button>
            <button onClick={fetchDoors} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">Loading doors…</div> : doors.map((door) => (
            <div key={door._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <DoorClosed className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-semibold">{door.name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{door.doorId}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${door.status === 'Online' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{door.status}</span>
              </div>
              <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                <p>Enabled: {door.isEnabled ? 'Yes' : 'No'}</p>
                <p>Last sync: {door.lastSyncTime ? new Date(door.lastSyncTime).toLocaleString() : 'Pending'}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => toggleDoor(door)} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Power className="h-4 w-4" />{door.isEnabled ? 'Disable' : 'Enable'}</button>
                <button onClick={() => openModal(door)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Edit</button>
                <button onClick={() => deleteDoor(door._id)} className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Update smart door' : 'Register smart door'}</h3>
              <form onSubmit={saveDoor} className="space-y-4">
                <input required value={formData.doorId} onChange={(e) => setFormData({ ...formData, doorId: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Door ID" />
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Door name" />
                <div className="grid gap-4 md:grid-cols-2">
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                  <select value={formData.isEnabled ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isEnabled: e.target.value === 'true' })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                  <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save door</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export default SmartDoors;
