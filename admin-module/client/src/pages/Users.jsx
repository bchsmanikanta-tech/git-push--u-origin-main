import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminShell from '../components/AdminShell';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  Trash2, 
  ShieldAlert, 
  Check, 
  X, 
  UserPlus, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  UserX,
  KeyRound
} from 'lucide-react';

const Users = () => {
  const { admin } = useAuth();

  // State variables
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Job Seeker',
    phoneNumber: '',
    status: 'Active'
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Alerts
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/users', {
        params: { search, role, status, sortBy, order, page, limit: 8 }
      });
      if (response.data.success) {
        setUsers(response.data.users);
        setTotal(response.data.totalUsers);
        setPages(response.data.pages);
      }
    } catch (error) {
      console.error(error);
      triggerToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, role, status, sortBy, order]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Checkbox Selection
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map(u => u._id));
    }
  };

  // Single Status Toggle
  const handleToggleStatus = async (id, currentStatus) => {
    let nextStatus = 'Active';
    if (currentStatus === 'Active') {
      nextStatus = 'Blocked';
    }
    
    try {
      const response = await axios.patch(`/api/users/${id}/status`, { status: nextStatus });
      if (response.data.success) {
        triggerToast(`User status updated to ${nextStatus}`, 'success');
        fetchUsers();
      }
    } catch (error) {
      triggerToast('Failed to update status', 'error');
    }
  };

  // Delete User
  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      const response = await axios.delete(`/api/users/${id}`);
      if (response.data.success) {
        triggerToast('User deleted successfully', 'success');
        fetchUsers();
      }
    } catch (error) {
      triggerToast(error.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  // Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.patch(`/api/users/${resetUserId}/reset-password`, { newPassword });
      if (response.data.success) {
        triggerToast('Password reset successfully', 'success');
        setShowResetModal(false);
        setNewPassword('');
      }
    } catch (error) {
      triggerToast('Failed to reset password', 'error');
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action, targetStatus = '') => {
    if (action === 'delete' && admin.role !== 'Super Admin') {
      triggerToast('Only Super Admin can perform bulk deletion', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to execute bulk ${action}?`)) return;

    try {
      const response = await axios.post('/api/users/bulk', {
        ids: selectedIds,
        action,
        status: targetStatus
      });
      if (response.data.success) {
        triggerToast(`Bulk ${action} execution completed`, 'success');
        setSelectedIds([]);
        fetchUsers();
      }
    } catch (error) {
      triggerToast('Bulk action failed', 'error');
    }
  };

  // Open Create/Edit Modal
  const openModal = (user = null) => {
    if (user) {
      setIsEditMode(true);
      setCurrentUserId(user._id);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Do not populate password
        role: user.role,
        phoneNumber: user.phoneNumber || '',
        status: user.status
      });
    } else {
      setIsEditMode(false);
      setCurrentUserId(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'Job Seeker',
        phoneNumber: '',
        status: 'Active'
      });
    }
    setShowModal(true);
  };

  // Handle Save
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        const response = await axios.put(`/api/users/${currentUserId}`, formData);
        if (response.data.success) {
          triggerToast('User updated successfully', 'success');
          setShowModal(false);
          fetchUsers();
        }
      } else {
        const response = await axios.post('/api/users', formData);
        if (response.data.success) {
          triggerToast('User created successfully', 'success');
          setShowModal(false);
          fetchUsers();
        }
      }
    } catch (error) {
      triggerToast(error.response?.data?.message || 'Error saving user', 'error');
    }
  };

  return (
    <AdminShell title="User Management">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed right-4 top-20 z-50 rounded-lg p-4 shadow-lg text-sm font-bold text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'
        }`}>
          {toast.message}
        </div>
      )}

      <main className="p-8 space-y-6">
        
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </form>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              Add System User
            </button>
          </div>
        </div>

        {/* Filters and Sorting bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
              <Filter className="h-4 w-4" />
              Filter By:
            </div>
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">All Roles</option>
              <option value="Job Seeker">Job Seeker</option>
              <option value="Tenant">Tenant</option>
              <option value="Property Owner">Property Owner</option>
              <option value="Company">Company</option>
            </select>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Sort By:</span>
            <select
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-');
                setSortBy(field);
                setOrder(dir);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Header */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 p-4 dark:bg-indigo-950/20">
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              {selectedIds.length} users selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBulkAction('status', 'Active')}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('status', 'Blocked')}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
              >
                <UserX className="h-3.5 w-3.5" />
                Block
              </button>
              {admin.role === 'Super Admin' && (
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Permanent
                </button>
              )}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedIds.length === users.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 accent-indigo-600"
                    />
                  </th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user._id} className="text-sm font-semibold text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user._id)}
                        onChange={() => handleSelectOne(user._id)}
                        className="rounded border-slate-300 accent-indigo-600"
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{user.name}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{user.email}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        user.status === 'Blocked' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                        'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          user.status === 'Active' ? 'bg-emerald-500' :
                          user.status === 'Blocked' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{user.phoneNumber || '-'}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setResetUserId(user._id); setShowResetModal(true); }}
                          title="Reset Password"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 dark:hover:bg-slate-900"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openModal(user)}
                          title="Edit User"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 dark:hover:bg-slate-900"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user._id, user.status)}
                          title={user.status === 'Active' ? 'Block User' : 'Unblock User'}
                          className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 ${
                            user.status === 'Active' ? 'hover:text-red-500' : 'hover:text-emerald-500'
                          }`}
                        >
                          {user.status === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        {admin.role === 'Super Admin' && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            title="Delete Permanently"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-red-600 dark:hover:bg-slate-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-sm font-medium text-slate-400 bg-white dark:bg-slate-950">
                      No system users found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400">
              Showing page {page} of {pages} ({total} entries total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, pages))}
                disabled={page === pages}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {isEditMode ? 'Edit User Information' : 'Add System User Account'}
            </h3>
            
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                />
              </div>

              {!isEditMode && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Job Seeker">Job Seeker</option>
                    <option value="Tenant">Tenant</option>
                    <option value="Property Owner">Property Owner</option>
                    <option value="Company">Company</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-450 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Reset User Password</h3>
            <p className="text-sm font-semibold text-slate-400 mb-4">
              Enter the new password for this user. Make sure it is at least 6 characters long.
            </p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-450 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminShell>
  );
};

export default Users;
