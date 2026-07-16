const mongoose = require('mongoose');
const { Schema } = mongoose;

const JobseekerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  qualification: { type: String, default: '' },
  skills: { type: String, default: '' },
  resume: { type: String, default: '' },
  photo: { type: String, default: '' },
  cover_letter: { type: String, default: '' },
  status: { type: String, default: 'active' },
  saved_jobs: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now }
}, { collection: 'jobseekers' });

const CompanySchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  industry: { type: String, default: '' },
  about: { type: String, default: '' },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'companies' });

const JobSchema = new Schema({
  _id: { type: String, required: true }, // mapping to id
  title: { type: String, required: true },
  company_email: { type: String, required: true, index: true },
  company_name: { type: String, required: true },
  location: { type: String, default: '' },
  salary: { type: String, default: '' },
  type: { type: String, default: 'Full Time' },
  skills: { type: String, default: '' },
  description: { type: String, default: '' },
  experience: { type: String, default: 'Fresher' },
  status: { type: String, default: 'Active' },
  featured: { type: Boolean, default: false },
  expires_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  smart_door: { type: String, default: null } // from sharedData.js
}, { collection: 'jobs' });

const ApplicationSchema = new Schema({
  _id: { type: String, required: true }, // mapping to id
  job_id: { type: String, required: true, index: true },
  job_title: { type: String, default: '' },
  company_email: { type: String, default: '', index: true },
  company_name: { type: String, default: '' },
  seeker_email: { type: String, default: '', index: true },
  seeker_name: { type: String, default: '' },
  applied_date: { type: String, default: '' },
  resume: { type: String, default: '' },
  cover_letter: { type: String, default: '' },
  status: { type: String, default: 'Pending' },
  cgpa: { type: String, default: '' },
  certification: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' }
}, { collection: 'applications' });

const AdminSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, default: 'Super Admin' },
  status: { type: String, default: 'Active' },
  two_factor_enabled: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, { collection: 'admins' });

const SmartDoorSchema = new Schema({
  _id: { type: String, required: true }, // mapping to id
  door_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, default: 'Offline' },
  is_enabled: { type: Boolean, default: true },
  last_sync_time: { type: Date, default: Date.now }
}, { collection: 'smart_doors' });

const AuditLogSchema = new Schema({
  admin_id: { type: String },
  admin_name: { type: String, default: 'System/Anonymous' },
  action: { type: String, required: true },
  details: { type: String, default: '' },
  ip_address: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'audit_logs' });

const ReportSchema = new Schema({
  _id: { type: String, required: true }, // mapping to id
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  type: { type: String, default: 'General' },
  status: { type: String, default: 'Pending' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'reports' });

const NotificationSchema = new Schema({
  _id: { type: String, required: true }, // mapping to id
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'Broadcast' },
  channels: { type: [String], default: ['System'] },
  target_users: { type: [String], default: [] },
  sent_by: { type: String },
  created_at: { type: Date, default: Date.now }
}, { collection: 'notifications' });

const UserNotificationSchema = new Schema({
  _id: { type: String, required: true },
  recipient_email: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, { collection: 'user_notifications' });

module.exports = {
  Jobseeker: mongoose.model('Jobseeker', JobseekerSchema),
  Company: mongoose.model('Company', CompanySchema),
  Job: mongoose.model('Job', JobSchema),
  Application: mongoose.model('Application', ApplicationSchema),
  Admin: mongoose.model('Admin', AdminSchema),
  SmartDoor: mongoose.model('SmartDoor', SmartDoorSchema),
  AuditLog: mongoose.model('AuditLog', AuditLogSchema),
  Report: mongoose.model('Report', ReportSchema),
  Notification: mongoose.model('Notification', NotificationSchema),
  UserNotification: mongoose.model('UserNotification', UserNotificationSchema)
};
