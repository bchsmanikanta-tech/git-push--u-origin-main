const jwt = require('jsonwebtoken');
const { logAction } = require('../utils/logger');
const {
  getSharedAdminByEmail,
  getSharedAdminById,
  verifySharedAdmin,
  updateSharedAdminPassword,
  updateSharedAdminTwoFactor
} = require('../utils/sharedData');

// Generate JWT token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'dev-admin-secret';
  const expiresIn = process.env.JWT_EXPIRE || '8h';

  return jwt.sign({ id }, secret, {
    expiresIn
  });
};

// @desc    Admin Login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    const admin = await verifySharedAdmin(email, password);

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (admin.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is suspended.' });
    }

    const token = generateToken(admin._id);

    req.admin = admin; // set req.admin for audit log
    await logAction(req, 'LOGIN_SUCCESS', `Admin logged in successfully: ${admin.email}`);

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        twoFactorEnabled: admin.twoFactorEnabled
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get Current Logged in Admin
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const admin = await getSharedAdminById(req.admin._id || req.admin.id);
    res.status(200).json({
      success: true,
      admin
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Change Admin Password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
  }

  try {
    const admin = await getSharedAdminById(req.admin._id || req.admin.id);

    if (!admin || String(admin.password) !== String(currentPassword)) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    await updateSharedAdminPassword(req.admin._id || req.admin.id, newPassword);

    await logAction(req, 'PASSWORD_CHANGE', `Admin changed password successfully: ${admin.email}`);

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Forgot Password Request
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const admin = await getSharedAdminByEmail(email);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'No admin found with that email' });
    }

    // Mock reset email
    await logAction(req, 'PASSWORD_RESET_REQUEST', `Forgot password requested for: ${email}`);

    res.status(200).json({ 
      success: true, 
      message: 'Password reset link sent (Mocking: Reset instruction sent to email)' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Toggle Two Factor Auth
// @route   PUT /api/auth/toggle-2fa
// @access  Private
exports.toggle2FA = async (req, res) => {
  try {
    const admin = await getSharedAdminById(req.admin._id || req.admin.id);
    const nextValue = !admin.twoFactorEnabled;
    await updateSharedAdminTwoFactor(req.admin._id || req.admin.id, nextValue);

    await logAction(req, '2FA_TOGGLE', `Admin 2FA set to ${nextValue}`);

    res.status(200).json({ 
      success: true, 
      message: `2FA ${nextValue ? 'enabled' : 'disabled'} successfully`,
      twoFactorEnabled: nextValue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
