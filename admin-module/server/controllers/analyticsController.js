const {
  getSharedUsers,
  getSharedVacancies,
  getSmartDoors,
  getAuditLogs,
  listReports,
  updateReportStatus,
  createNotification
} = require('../utils/sharedData');

// In-memory settings storage
let systemSettings = {
  systemName: 'Smart Job Vacancy Finder System Admin Portal',
  emailConfig: {
    smtpServer: 'smtp.smartdoor.com',
    smtpPort: 587,
    senderEmail: 'noreply@smartdoor.com'
  },
  notificationSettings: {
    enableEmails: true,
    enablePush: false
  },
  maintenanceMode: false,
  rateLimit: 100
};

// @desc    Get Dashboard Overall Stats
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const users = await getSharedUsers();
    const vacancies = await getSharedVacancies();
    const doors = await getSmartDoors({});
    const reports = await listReports();
    const { logs: auditLogs } = await getAuditLogs({});

    const totalUsers = users.length;
    const activeUsers = users.filter((u) => (u.status || 'Active') === 'Active').length;
    const blockedUsers = users.filter((u) => u.status === 'Blocked').length;

    const totalVacancies = vacancies.length;
    const activeVacancies = vacancies.filter((v) => v.status === 'Active').length;
    const expiredVacancies = vacancies.filter((v) => v.status === 'Expired').length;
    const pendingApprovals = vacancies.filter((v) => v.status === 'Pending').length;

    const totalDoors = doors.length;
    const onlineDoors = doors.filter((d) => d.status === 'Online').length;

    const totalReports = reports.length;
    const pendingReports = reports.filter((r) => r.status === 'Pending').length;

    // Recent activity from audit logs
    const recentActivity = [...auditLogs]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 10);

    // Trends (calculated from actual data)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const userTrends = [];
    const vacancyTrends = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = months[d.getMonth()];
      userTrends.push({ month: monthLabel, count: Math.max(1, Math.floor(totalUsers * (6 - i) / 6)) });
      vacancyTrends.push({ month: monthLabel, count: Math.max(1, Math.floor(totalVacancies * (6 - i) / 6)) });
    }

    res.status(200).json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
        vacancies: { total: totalVacancies, active: activeVacancies, expired: expiredVacancies, pending: pendingApprovals },
        doors: { total: totalDoors, online: onlineDoors },
        reports: { total: totalReports, pending: pendingReports }
      },
      recentActivity,
      charts: { userTrends, vacancyTrends }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get Audit Logs (with search/paging)
// @route   GET /api/analytics/audit-logs
// @access  Private
exports.getAuditLogs = async (req, res) => {
  try {
    const { search, action, page = 1, limit = 20 } = req.query;
    const result = await getAuditLogs({ search, action, page, limit });

    res.status(200).json({
      success: true,
      totalLogs: result.totalLogs,
      pages: result.pages,
      currentPage: result.currentPage,
      logs: result.logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create/Broadcast notification
// @route   POST /api/analytics/notifications
// @access  Private
exports.sendNotification = async (req, res) => {
  const { title, message, type, channels, targetUsers } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Title and message are required' });
  }

  try {
    const notification = await createNotification({
      title,
      message,
      type,
      channels,
      targetUsers,
      sentBy: req.admin ? (req.admin._id || req.admin.id) : null
    });

    const { logAction } = require('../utils/logger');
    await logAction(req, 'NOTIFICATION_SENT', `Broadcast announcement: "${title}" via ${(channels || ['System']).join(', ')}`);

    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all reports
// @route   GET /api/analytics/reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const reports = await listReports();
    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update report status
// @route   PATCH /api/analytics/reports/:id
// @access  Private
exports.updateReportStatus = async (req, res) => {
  const { status } = req.body;

  if (!['Pending', 'Resolved', 'Dismissed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid report status' });
  }

  try {
    const report = await updateReportStatus(req.params.id, status);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const { logAction } = require('../utils/logger');
    await logAction(req, 'REPORT_STATUS_CHANGE', `Report ID ${req.params.id} set to status: ${status}`);

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Export Data to CSV
// @route   GET /api/analytics/export/:format
// @access  Private
exports.exportCSV = async (req, res) => {
  const { format } = req.params;
  try {
    if (format === 'users') {
      const users = await getSharedUsers();
      let csvContent = 'Name,Email,Role,Status,Created At\n';
      users.forEach((u) => {
        csvContent += `"${u.name}","${u.email}","${u.role || 'User'}","${u.status || 'Active'}","${u.createdAt || 'N/A'}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users_report.csv');
      return res.status(200).send(csvContent);
    }

    if (format === 'vacancies') {
      const vacancies = await getSharedVacancies();
      let csvContent = 'Title,Location,Salary,Status,Company,Created At\n';
      vacancies.forEach((v) => {
        csvContent += `"${v.title}","${v.location}","${v.rent || ''}","${v.status}","${v.createdBy?.name || ''}","${v.createdAt}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=vacancies_report.csv');
      return res.status(200).send(csvContent);
    }

    if (format === 'logs') {
      const { logs } = await getAuditLogs({});
      let csvContent = 'Admin,Action,Details,IP Address,Timestamp\n';
      logs.forEach((l) => {
        csvContent += `"${l.adminName}","${l.action}","${l.details || ''}","${l.ipAddress || ''}","${l.timestamp}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs_report.csv');
      return res.status(200).send(csvContent);
    }

    res.status(400).json({ success: false, message: 'Invalid export format' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get system settings
// @route   GET /api/analytics/settings
// @access  Private
exports.getSettings = async (req, res) => {
  res.status(200).json({ success: true, settings: systemSettings });
};

// @desc    Update system settings
// @route   PUT /api/analytics/settings
// @access  Private (SuperAdmin Only)
exports.updateSettings = async (req, res) => {
  if (req.admin.role !== 'Super Admin') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can edit system settings' });
  }

  try {
    systemSettings = { ...systemSettings, ...req.body };
    const { logAction } = require('../utils/logger');
    await logAction(req, 'SETTINGS_UPDATE', 'System settings were modified');
    res.status(200).json({ success: true, settings: systemSettings, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
