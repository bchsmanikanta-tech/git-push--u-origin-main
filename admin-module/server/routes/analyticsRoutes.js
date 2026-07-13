const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAuditLogs,
  sendNotification,
  getReports,
  updateReportStatus,
  exportCSV,
  getSettings,
  updateSettings
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes require admin authentication

router.get('/dashboard', getDashboardStats);
router.get('/audit-logs', getAuditLogs);
router.post('/notifications', sendNotification);
router.get('/reports', getReports);
router.patch('/reports/:id', updateReportStatus);
router.get('/export/:format', exportCSV);

router.route('/settings')
  .get(getSettings)
  .put(authorize('Super Admin'), updateSettings);

module.exports = router;
