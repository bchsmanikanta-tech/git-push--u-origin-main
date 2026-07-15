import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminShell from '../components/AdminShell';
import { FileText, Search, PlusCircle, CheckCircle2, CircleOff, Trash2, RefreshCw } from 'lucide-react';

const VACANCY_STATUS = ['Pending', 'Active', 'Filled', 'Expired', 'Rejected'];

const Vacancies = () => {
  const [vacancies, setVacancies] = useState([]);
  const [users, setUsers] = useState([]);
  const [smartDoors, setSmartDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    rent: '',
    status: 'Pending',
    smartDoor: '',
    createdBy: '',
    expiresAt: ''
  });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2600);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vacancyRes, userRes, doorRes] = await Promise.all([
        axios.get('/api/vacancies', { params: { search, status, limit: 20 } }),
        axios.get('/api/users', { params: { limit: 50 } }),
        axios.get('/api/smart-doors', { params: { limit: 50 } })
      ]);
      if (vacancyRes.data.success) setVacancies(vacancyRes.data.vacancies || []);
      if (userRes.data.success) setUsers(userRes.data.users || []);
      if (doorRes.data.success) setSmartDoors(doorRes.data.doors || []);
    } catch (error) {
      triggerToast('Unable to load vacancies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, status]);

  const filteredVacancies = useMemo(() => vacancies, [vacancies]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      location: '',
      rent: '',
      status: 'Pending',
      smartDoor: '',
      createdBy: users[0]?._id || '',
      expiresAt: ''
    });
  };

  const openModal = (vacancy = null) => {
    if (vacancy) {
      setEditingId(vacancy._id);
      setFormData({
        title: vacancy.title || '',
        description: vacancy.description || '',
        location: vacancy.location || '',
        rent: vacancy.rent || '',
        status: vacancy.status || 'Pending',
        smartDoor: vacancy.smartDoor?._id || '',
        createdBy: vacancy.createdBy?._id || users[0]?._id || '',
        expiresAt: vacancy.expiresAt ? new Date(vacancy.expiresAt).toISOString().slice(0, 10) : ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const saveVacancy = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        rent: Number(formData.rent),
        createdBy: formData.createdBy || users[0]?._id,
        smartDoor: formData.smartDoor || null,
        expiresAt: formData.expiresAt || null
      };
      if (editingId) {
        await axios.put(`/api/vacancies/${editingId}`, payload);
        triggerToast('Vacancy updated');
      } else {
        await axios.post('/api/vacancies', payload);
        triggerToast('Vacancy created');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      triggerToast(error.response?.data?.message || 'Unable to save vacancy', 'error');
    }
  };

  const handleApproval = async (vacancy, nextStatus) => {
    try {
      await axios.patch(`/api/vacancies/${vacancy._id}/approval`, { status: nextStatus });
      triggerToast(`Vacancy ${nextStatus.toLowerCase()}`);
      fetchData();
    } catch (error) {
      triggerToast('Approval failed', 'error');
    }
  };

  const markFilled = async (id) => {
    try {
      await axios.patch(`/api/vacancies/${id}/filled`);
      triggerToast('Vacancy marked filled');
      fetchData();
    } catch (error) {
      triggerToast('Unable to mark filled', 'error');
    }
  };

  const deleteVacancy = async (id) => {
    if (!window.confirm('Delete this vacancy?')) return;
    try {
      await axios.delete(`/api/vacancies/${id}`);
      triggerToast('Vacancy deleted');
      fetchData();
    } catch (error) {
      triggerToast('Unable to delete vacancy', 'error');
    }
  };

  return (
    <AdminShell title="Vacancy Management">
      <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-900">
        {toast.show && (
          <div className={`fixed right-4 top-20 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {toast.message}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vacancy operations</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Review, approve, and manage property and job listings.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              <PlusCircle className="h-4 w-4" /> Add vacancy
            </button>
            <button onClick={fetchData} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or location" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 text-sm dark:border-slate-800 dark:bg-slate-900" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
            <option value="">All statuses</option>
            {VACANCY_STATUS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading vacancies…</div>
          ) : filteredVacancies.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No vacancies found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Rent</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVacancies.map((vacancy) => (
                    <tr key={vacancy._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{vacancy.title}</div>
                        <div className="text-xs text-slate-500">{vacancy.description?.slice(0, 90)}{vacancy.description?.length > 90 ? '…' : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{vacancy.location}</td>
                      <td className="px-4 py-3">${vacancy.rent}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vacancy.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : vacancy.status === 'Pending' ? 'bg-amber-100 text-amber-700' : vacancy.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                          {vacancy.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {vacancy.status === 'Pending' && <button onClick={() => handleApproval(vacancy, 'Active')} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Approve</button>}
                          {vacancy.status === 'Pending' && <button onClick={() => handleApproval(vacancy, 'Rejected')} className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white">Reject</button>}
                          {vacancy.status !== 'Filled' && <button onClick={() => markFilled(vacancy._id)} className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white">Mark filled</button>}
                          <button onClick={() => openModal(vacancy)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Edit</button>
                          <button onClick={() => deleteVacancy(vacancy._id)} className="rounded-lg bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Edit vacancy' : 'Create vacancy'}</h3>
                  <p className="text-sm text-slate-500">Keep vacancy details consistent for approvals and alerts.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-sm font-semibold text-slate-500">Close</button>
              </div>
              <form onSubmit={saveVacancy} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Title" />
                  <input required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Location" />
                  <input required type="number" value={formData.rent} onChange={(e) => setFormData({ ...formData, rent: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Rent" />
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950">
                    {VACANCY_STATUS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={formData.createdBy} onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950">
                    {users.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
                  </select>
                  <select value={formData.smartDoor} onChange={(e) => setFormData({ ...formData, smartDoor: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <option value="">No smart door</option>
                    {smartDoors.map((door) => <option key={door._id} value={door._id}>{door.name}</option>)}
                  </select>
                </div>
                <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="4" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Description" />
                <input type="date" value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" />
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                  <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save vacancy</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export default Vacancies;
