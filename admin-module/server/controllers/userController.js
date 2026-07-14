const { logAction } = require('../utils/logger');
const bcrypt = require('bcryptjs');
const {
  getSharedUsers,
  createSharedUser,
  updateSharedUser,
  deleteSharedUser,
  setSharedUserStatus,
  resetSharedUserPassword,
  bulkSharedUserAction
} = require('../utils/sharedData');

// @desc    Get all users with filter, search, sort, pagination
// @route   GET /api/users
// @access  Private (Admin/SuperAdmin)
exports.getUsers = async (req, res) => {
  try {
    const { search, role, status, sortBy, order, page = 1, limit = 10 } = req.query;

    const query = {};

    // Search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filters
    if (role) query.role = role;
    if (status) query.status = status;

    // Sorting
    let sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions['createdAt'] = -1; // default newest first
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sharedUsers = await getSharedUsers();
    const filteredUsers = sharedUsers.filter((user) => {
      if (search) {
        const term = search.toLowerCase();
        if (!user.name?.toLowerCase().includes(term) && !user.email?.toLowerCase().includes(term)) {
          return false;
        }
      }
      if (role && user.role !== role) return false;
      if (status && user.status !== status) return false;
      return true;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
      const direction = order === 'desc' ? -1 : 1;
      if (sortBy === 'name') return direction * String(a.name || '').localeCompare(String(b.name || ''));
      return direction * new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const pagedUsers = sortedUsers.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      totalUsers: sortedUsers.length,
      pages: Math.max(1, Math.ceil(sortedUsers.length / parseInt(limit))),
      currentPage: parseInt(page),
      users: pagedUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single user details
// @route   GET /api/users/:id
// @access  Private (Admin/SuperAdmin)
exports.getUser = async (req, res) => {
  try {
    const sharedUsers = await getSharedUsers();
    const user = sharedUsers.find((entry) => entry._id === req.params.id || entry.email === req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user,
      activity: []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create User manually (Admin Action)
// @route   POST /api/users
// @access  Private (Admin/SuperAdmin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body;

    const normalizedEmail = email.toLowerCase();
    const sharedUsers = await getSharedUsers();
    const userExists = sharedUsers.some((user) => user.email.toLowerCase() === normalizedEmail);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await createSharedUser({ name, email: normalizedEmail, password, role, phoneNumber, status: 'Active' });

    await logAction(req, 'USER_CREATE', `Created user account: ${normalizedEmail}`);

    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update user info
// @route   PUT /api/users/:id
// @access  Private (Admin/SuperAdmin)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, phoneNumber, status } = req.body;
    const user = await updateSharedUser(req.params.id, { name, email, role, phoneNumber, status });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAction(req, 'USER_UPDATE', `Updated details for user: ${user.email}`);

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (SuperAdmin Only)
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await deleteSharedUser(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAction(req, 'USER_DELETE', `Deleted user account: ${req.params.id}`);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Change User Status (Block/Unblock/Suspend/Activate)
// @route   PATCH /api/users/:id/status
// @access  Private (Admin/SuperAdmin)
exports.changeUserStatus = async (req, res) => {
  const { status } = req.body;

  if (!['Active', 'Suspended', 'Blocked'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const user = await setSharedUserStatus(req.params.id, status);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAction(req, 'USER_STATUS_CHANGE', `Changed user status for ${user.email} to ${status}`);

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Reset User Password
// @route   PATCH /api/users/:id/reset-password
// @access  Private (Admin/SuperAdmin)
exports.resetUserPassword = async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  try {
    const user = await resetSharedUserPassword(req.params.id, newPassword);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await logAction(req, 'USER_PASSWORD_RESET', `Admin reset password for user: ${req.params.id}`);

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Bulk user actions (Block, Unblock, Delete)
// @route   POST /api/users/bulk
// @access  Private (Admin/SuperAdmin)
exports.bulkUserAction = async (req, res) => {
  const { ids, action, status } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide user IDs' });
  }

  try {
    if (action === 'delete') {
      if (req.admin.role !== 'Super Admin') {
        return res.status(403).json({ success: false, message: 'Only Super Admin can delete users' });
      }
      await bulkSharedUserAction(ids, 'delete');
      await logAction(req, 'USER_BULK_DELETE', `Bulk deleted ${ids.length} users`);
      return res.status(200).json({ success: true, message: 'Users deleted successfully' });
    }

    if (action === 'status') {
      if (!['Active', 'Suspended', 'Blocked'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      await bulkSharedUserAction(ids, 'status', status);
      await logAction(req, 'USER_BULK_STATUS', `Bulk updated status of ${ids.length} users to ${status}`);
      return res.status(200).json({ success: true, message: `Users status updated to ${status}` });
    }

    res.status(400).json({ success: false, message: 'Invalid bulk action' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
