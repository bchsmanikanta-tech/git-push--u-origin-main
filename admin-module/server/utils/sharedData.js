const { Jobseeker, Company, Job, Application, Admin, SmartDoor, AuditLog, Report, Notification } = require('../../../db/models');
const mongoose = require('mongoose');

const adminEmailFromId = (id) =>
  typeof id === 'string' && id.toLowerCase().startsWith('admin_') ? id.slice(6) : id;

const userEmailFromId = (id) => {
  if (typeof id !== 'string') return id;
  if (id.toLowerCase().startsWith('jobseeker_')) return id.slice(10);
  if (id.toLowerCase().startsWith('company_')) return id.slice(8);
  return id;
};

// ---------- ADMINS ----------
const mapAdminRow = (r) => ({
  _id: `admin_${r.email}`,
  id: r._id ? r._id.toString() : '',
  name: r.name,
  email: r.email,
  role: r.role || 'Super Admin',
  status: r.status || 'Active',
  password: r.password,
  twoFactorEnabled: !!r.two_factor_enabled
});

const getSharedAdmins = async () => {
  const rows = await Admin.find().sort({ _id: 1 });
  return rows.map(mapAdminRow);
};

const getSharedAdminByEmail = async (email) => {
  const row = await Admin.findOne({ email: String(email || '').toLowerCase() });
  return row ? mapAdminRow(row) : null;
};

const getSharedAdminById = async (id) => {
  const emailCandidate = String(adminEmailFromId(id) || '').toLowerCase();
  const row = await Admin.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { email: emailCandidate }
    ]
  });
  return row ? mapAdminRow(row) : null;
};

const verifySharedAdmin = async (email, password) => {
  const admin = await getSharedAdminByEmail(email);
  if (!admin) return null;
  if (String(admin.password) !== String(password)) return null;
  return admin;
};

const updateSharedAdminPassword = async (id, password) => {
  const emailCandidate = String(adminEmailFromId(id) || '').toLowerCase();
  const row = await Admin.findOneAndUpdate({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { email: emailCandidate }
    ]
  }, { password }, { new: true });
  return row ? mapAdminRow(row) : null;
};

const updateSharedAdminTwoFactor = async (id, enabled) => {
  const emailCandidate = String(adminEmailFromId(id) || '').toLowerCase();
  const row = await Admin.findOneAndUpdate({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { email: emailCandidate }
    ]
  }, { two_factor_enabled: !!enabled }, { new: true });
  return row ? mapAdminRow(row) : null;
};

const mapStatusToFrontend = (dbStatus) => {
  if (!dbStatus) return 'Active';
  const s = dbStatus.toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'banned') return 'Blocked';
  if (s === 'suspended') return 'Suspended';
  return dbStatus;
};

const mapStatusToDb = (feStatus) => {
  if (!feStatus) return 'active';
  const s = feStatus.toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'blocked') return 'banned';
  if (s === 'suspended') return 'suspended';
  return feStatus;
};

// ---------- USERS ----------
const mapUserRow = (r, source) => ({
  _id: `${source}_${r.email}`,
  id: r._id ? r._id.toString() : '',
  name: r.name,
  email: r.email,
  role: source === 'company' ? 'Company' : 'Job Seeker',
  status: mapStatusToFrontend(r.status),
  phoneNumber: r.phone || r.phone_number || '',
  createdAt: r.created_at,
  password: r.password,
  source
});

const getSharedUsers = async () => {
  const [seekers, companies] = await Promise.all([
    Jobseeker.find().sort({ _id: 1 }),
    Company.find().sort({ _id: 1 })
  ]);
  return [
    ...seekers.map((r) => mapUserRow(r, 'jobseeker')),
    ...companies.map((r) => mapUserRow(r, 'company'))
  ];
};

const findUserRow = async (id) => {
  const emailCandidate = String(userEmailFromId(id) || '').toLowerCase();
  const q = {
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      { email: emailCandidate }
    ]
  };
  let row = await Jobseeker.findOne(q);
  if (row) return { row, source: 'jobseeker' };
  row = await Company.findOne(q);
  if (row) return { row, source: 'company' };
  return null;
};

const createSharedUser = async (payload) => {
  const role = payload.role || 'Job Seeker';
  const isCompany = role === 'Company' || role === 'Property Owner' || role === 'Tenant';
  const email = String(payload.email || '').toLowerCase();
  const now = payload.createdAt || new Date();

  if (isCompany) {
    const row = await Company.create({
      name: payload.name || 'New User',
      email,
      password: payload.password || 'changeme123',
      phone: payload.phoneNumber || '',
      status: mapStatusToDb(payload.status || 'Active'),
      created_at: now
    });
    return mapUserRow(row, 'company');
  }

  const row = await Jobseeker.create({
    name: payload.name || 'New User',
    email,
    password: payload.password || 'changeme123',
    status: mapStatusToDb(payload.status || 'Active'),
    created_at: now
  });
  return mapUserRow(row, 'jobseeker');
};

const updateSharedUser = async (id, payload) => {
  const found = await findUserRow(id);
  if (!found) return null;
  const { source } = found;
  const Model = source === 'company' ? Company : Jobseeker;

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.email) updateData.email = payload.email.toLowerCase();
  if (payload.status !== undefined) updateData.status = mapStatusToDb(payload.status);
  if (payload.phoneNumber !== undefined || payload.phone !== undefined) {
    updateData.phone = payload.phoneNumber !== undefined ? payload.phoneNumber : payload.phone;
  }

  if (Object.keys(updateData).length === 0) return mapUserRow(found.row, source);
  const row = await Model.findByIdAndUpdate(found.row._id, updateData, { new: true });
  return row ? mapUserRow(row, source) : null;
};

const deleteSharedUser = async (id) => {
  const found = await findUserRow(id);
  if (!found) return false;
  const Model = found.source === 'company' ? Company : Jobseeker;
  await Model.findByIdAndDelete(found.row._id);
  return true;
};

const setSharedUserStatus = async (id, status) => {
  const found = await findUserRow(id);
  if (!found) return null;
  const Model = found.source === 'company' ? Company : Jobseeker;
  const row = await Model.findByIdAndUpdate(found.row._id, { status: mapStatusToDb(status) }, { new: true });
  return row ? mapUserRow(row, found.source) : null;
};

const resetSharedUserPassword = async (id, newPassword) => {
  const found = await findUserRow(id);
  if (!found) return false;
  const Model = found.source === 'company' ? Company : Jobseeker;
  await Model.findByIdAndUpdate(found.row._id, { password: newPassword });
  return true;
};

const bulkSharedUserAction = async (ids, action, status) => {
  for (const id of ids) {
    if (action === 'delete') {
      await deleteSharedUser(id);
    } else if (action === 'status') {
      await setSharedUserStatus(id, status);
    }
  }
  return true;
};

// ---------- VACANCIES (shared jobs) ----------
const mapVacancyRow = (r) => ({
  _id: r._id,
  id: r._id,
  title: r.title,
  description: r.description,
  location: r.location,
  rent: r.salary,
  status: r.status || 'Active',
  smartDoor: r.smart_door ? JSON.parse(r.smart_door) : null,
  createdBy: { _id: r.company_email || 'admin', name: r.company_name || 'System' },
  createdAt: r.created_at,
  expiresAt: r.expires_at || null,
  source: 'shared-job'
});

const getSharedVacancies = async () => {
  const rows = await Job.find().sort({ created_at: -1 });
  return rows.map(mapVacancyRow);
};

const createSharedVacancy = async (payload) => {
  const createdBy = payload.createdBy || payload.createdByUser || { _id: payload.companyEmail || 'admin', name: payload.companyName || 'System' };
  const companyEmail = payload.companyEmail || createdBy.email || createdBy._id || 'admin@jobfinder.com';
  const companyName = payload.companyName || createdBy.name || 'System';
  const now = payload.createdAt ? new Date(payload.createdAt) : new Date();
  const id = payload.id || `job_${Date.now()}`;
  const rent = payload.rent !== undefined ? payload.rent : (payload.salary || 0);

  const row = await Job.create({
    _id: id,
    title: payload.title,
    company_email: String(companyEmail).toLowerCase(),
    company_name: companyName,
    location: payload.location || '',
    salary: String(rent),
    type: payload.type || 'Full Time',
    skills: payload.skills || '',
    description: payload.description || '',
    experience: payload.experience || 'Fresher',
    status: payload.status || 'Active',
    expires_at: payload.expiresAt || null,
    created_at: now
  });
  return mapVacancyRow(row);
};

const updateSharedVacancy = async (id, payload) => {
  const updateData = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.location !== undefined) updateData.location = payload.location;
  if (payload.rent !== undefined) updateData.salary = String(payload.rent);
  else if (payload.salary !== undefined) updateData.salary = String(payload.salary);
  if (payload.type !== undefined) updateData.type = payload.type;
  if (payload.skills !== undefined) updateData.skills = payload.skills;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.experience !== undefined) updateData.experience = payload.experience;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.expiresAt !== undefined) updateData.expires_at = payload.expiresAt;
  if (payload.smartDoor !== undefined) updateData.smart_door = JSON.stringify(payload.smartDoor);

  if (Object.keys(updateData).length === 0) {
    const row = await Job.findById(id);
    return row ? mapVacancyRow(row) : null;
  }
  const row = await Job.findByIdAndUpdate(id, updateData, { new: true });
  return row ? mapVacancyRow(row) : null;
};

const deleteSharedVacancy = async (id) => {
  await Application.deleteMany({ job_id: id });
  const row = await Job.findByIdAndDelete(id);
  return !!row;
};

const archiveSharedExpiredVacancies = async () => {
  const res = await Job.updateMany(
    { expires_at: { $ne: null, $lt: new Date() }, status: 'Active' },
    { status: 'Expired' }
  );
  return res.modifiedCount || 0;
};

// ---------- SMART DOORS ----------
const mapDoorRow = (r) => ({
  _id: r._id,
  id: r._id,
  doorId: r.door_id,
  name: r.name,
  status: r.status,
  isEnabled: !!r.is_enabled,
  lastSyncTime: r.last_sync_time
});

const getSmartDoors = async ({ status, isEnabled, search } = {}) => {
  const query = {};
  if (status) query.status = status;
  if (isEnabled !== undefined) query.is_enabled = (isEnabled === true || isEnabled === 'true');
  
  let rows = await SmartDoor.find(query).sort({ door_id: 1 });
  let doors = rows.map(mapDoorRow);
  if (search) {
    const term = String(search).toLowerCase();
    doors = doors.filter((d) => (d.doorId || '').toLowerCase().includes(term) || (d.name || '').toLowerCase().includes(term));
  }
  return doors;
};

const getSmartDoorById = async (id) => {
  const row = await SmartDoor.findById(id);
  return row ? mapDoorRow(row) : null;
};

const createSmartDoor = async ({ doorId, name, status, isEnabled }) => {
  const row = await SmartDoor.create({
    _id: `door_${Date.now()}`,
    door_id: doorId,
    name,
    status: status || 'Offline',
    is_enabled: isEnabled !== undefined ? isEnabled : true,
    last_sync_time: new Date()
  });
  return mapDoorRow(row);
};

const updateSmartDoor = async (id, { name, status, isEnabled, doorId }) => {
  const updateData = { last_sync_time: new Date() };
  if (name !== undefined) updateData.name = name;
  if (status !== undefined) updateData.status = status;
  if (doorId !== undefined) updateData.door_id = doorId;
  if (isEnabled !== undefined) updateData.is_enabled = isEnabled;

  const row = await SmartDoor.findByIdAndUpdate(id, updateData, { new: true });
  return row ? mapDoorRow(row) : null;
};

const deleteSmartDoor = async (id) => {
  const row = await SmartDoor.findByIdAndDelete(id);
  return !!row;
};

const toggleSmartDoor = async (id) => {
  const door = await SmartDoor.findById(id);
  if (!door) return null;
  door.is_enabled = !door.is_enabled;
  door.last_sync_time = new Date();
  await door.save();
  return mapDoorRow(door);
};

// ---------- AUDIT LOGS ----------
const mapLogRow = (r) => ({
  _id: r._id ? r._id.toString() : '',
  id: r._id ? r._id.toString() : '',
  adminId: r.admin_id,
  adminName: r.admin_name,
  action: r.action,
  details: r.details,
  ipAddress: r.ip_address,
  timestamp: r.timestamp
});

const appendAuditLog = async (req, action, details) => {
  try {
    const ipAddress = req && (req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress));
    const adminId = req && req.admin ? (req.admin._id || req.admin.id) : null;
    const adminName = req && req.admin ? req.admin.name : 'System/Anonymous';
    await AuditLog.create({
      admin_id: adminId,
      admin_name: adminName,
      action,
      details: details || '',
      ip_address: ipAddress || '',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to save audit log:', error.message);
  }
};

const getAuditLogs = async ({ search, action, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (action) query.action = action;
  if (search) {
    const term = new RegExp(String(search), 'i');
    query.$or = [{ admin_name: term }, { details: term }];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const rows = await AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit));
  const totalLogs = await AuditLog.countDocuments(query);
  return { logs: rows.map(mapLogRow), totalLogs, pages: Math.max(1, Math.ceil(totalLogs / parseInt(limit))), currentPage: parseInt(page) };
};

// ---------- REPORTS ----------
const mapReportRow = (r) => ({
  _id: r._id,
  id: r._id,
  title: r.title,
  description: r.description,
  type: r.type,
  status: r.status,
  createdAt: r.created_at
});

const listReports = async () => {
  const rows = await Report.find().sort({ created_at: -1 });
  return rows.map(mapReportRow);
};

const updateReportStatus = async (id, status) => {
  const row = await Report.findByIdAndUpdate(id, { status }, { new: true });
  return row ? mapReportRow(row) : null;
};

// ---------- NOTIFICATIONS ----------
const mapNotificationRow = (r) => ({
  _id: r._id,
  id: r._id,
  title: r.title,
  message: r.message,
  type: r.type,
  channels: r.channels || ['System'],
  targetUsers: r.target_users || [],
  sentBy: r.sent_by,
  createdAt: r.created_at
});

const createNotification = async ({ title, message, type, channels, targetUsers, sentBy }) => {
  const row = await Notification.create({
    _id: `notif_${Date.now()}`,
    title,
    message,
    type: type || 'Broadcast',
    channels: channels || ['System'],
    target_users: targetUsers || [],
    sent_by: sentBy || null,
    created_at: new Date()
  });
  return mapNotificationRow(row);
};

const listNotifications = async () => {
  const rows = await Notification.find().sort({ created_at: -1 });
  return rows.map(mapNotificationRow);
};

const readSharedDb = async () => {
  const [jobseekers, companies, jobs, applications, admins, doors, logs, reports, notifications] = await Promise.all([
    Jobseeker.find(),
    Company.find(),
    Job.find(),
    Application.find(),
    Admin.find(),
    SmartDoor.find(),
    AuditLog.find(),
    Report.find(),
    Notification.find()
  ]);
  return {
    jobseekers,
    companies,
    jobs,
    applications,
    admins,
    smartDoors: doors.map(mapDoorRow),
    auditLogs: logs.map(mapLogRow),
    reports: reports.map(mapReportRow),
    notifications: notifications.map(mapNotificationRow)
  };
};

const writeSharedDb = async () => true;

module.exports = {
  readSharedDb,
  writeSharedDb,
  getSharedAdmins,
  getSharedAdminByEmail,
  getSharedAdminById,
  verifySharedAdmin,
  updateSharedAdminPassword,
  updateSharedAdminTwoFactor,
  getSharedUsers,
  createSharedUser,
  updateSharedUser,
  deleteSharedUser,
  setSharedUserStatus,
  resetSharedUserPassword,
  bulkSharedUserAction,
  getSharedVacancies,
  createSharedVacancy,
  updateSharedVacancy,
  deleteSharedVacancy,
  archiveSharedExpiredVacancies,
  getSmartDoors,
  getSmartDoorById,
  createSmartDoor,
  updateSmartDoor,
  deleteSmartDoor,
  toggleSmartDoor,
  appendAuditLog,
  getAuditLogs,
  listReports,
  updateReportStatus,
  createNotification,
  listNotifications
};
