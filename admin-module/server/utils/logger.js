const { appendAuditLog } = require('./sharedData');

const logAction = async (req, action, details) => {
  try {
    await appendAuditLog(req, action, details);
  } catch (error) {
    console.error('Failed to save audit log:', error.message);
  }
};

module.exports = { logAction };
