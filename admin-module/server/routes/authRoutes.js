const express = require('express');
const router = express.Router();
const { login, getMe, changePassword, forgotPassword, toggle2FA } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/change-password', changePassword);
router.put('/toggle-2fa', toggle2FA);

module.exports = router;
