const mongoose = require('mongoose');

// ─── Jobseeker ───────────────────────────────────────────────────────────────
const jobseekerSchema = new mongoose.Schema({
    name:          { type: String, required: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    password:      { type: String, required: true },
    qualification: { type: String, default: '' },
    cgpa:          { type: String, default: '' },
    skills:        { type: String, default: '' },
    photo:         { type: String, default: '' },
    resume:        { type: String, default: '' },
    status:        { type: String, default: 'active' },
    savedJobs:     { type: [String], default: [] }
}, { timestamps: true });

// ─── Company ─────────────────────────────────────────────────────────────────
const companySchema = new mongoose.Schema({
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone:    { type: String, default: '' },
    location: { type: String, default: '' },
    industry: { type: String, default: '' },
    about:    { type: String, default: '' },
    status:   { type: String, default: 'active' }
}, { timestamps: true });

// ─── Job ─────────────────────────────────────────────────────────────────────
const jobSchema = new mongoose.Schema({
    _id:         { type: String },
    title:       { type: String, required: true },
    companyEmail:{ type: String, required: true, lowercase: true },
    companyName: { type: String, required: true },
    location:    { type: String, default: '' },
    salary:      { type: String, default: '' },
    type:        { type: String, default: 'Full Time' },
    skills:      { type: String, default: '' },
    description: { type: String, default: '' },
    experience:  { type: String, default: 'Fresher' },
    status:      { type: String, default: 'Active' },
    featured:    { type: Boolean, default: false },
    createdAt:   { type: String, default: () => new Date().toISOString() }
}, { _id: false });

// ─── Application ─────────────────────────────────────────────────────────────
const applicationSchema = new mongoose.Schema({
    _id:          { type: String },
    jobId:        { type: String, required: true },
    jobTitle:     { type: String, required: true },
    companyEmail: { type: String, required: true, lowercase: true },
    companyName:  { type: String, default: '' },
    seekerEmail:  { type: String, required: true, lowercase: true },
    seekerName:   { type: String, required: true },
    appliedDate:  { type: String, default: '' },
    resume:       { type: String, default: '' },
    coverLetter:  { type: String, default: '' },
    status:       { type: String, default: 'Pending' },
    cgpa:         { type: String, default: '' },
    certification:{ type: String, default: '' },
    address:      { type: String, default: '' },
    city:         { type: String, default: '' },
    state:        { type: String, default: '' },
    githubProfile:{ type: String, default: '' },
    linkedinProfile:{ type: String, default: '' },
    experienceYears:{ type: String, default: '' },
    qualification:{ type: String, default: '' },
    expectedSalary:{ type: String, default: '' }
}, { _id: false, timestamps: true });

// ─── Admin ───────────────────────────────────────────────────────────────────
const adminSchema = new mongoose.Schema({
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role:     { type: String, default: 'Super Admin' },
    status:   { type: String, default: 'Active' }
}, { timestamps: true });

// ─── Notification ─────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
    recipientEmail: { type: String, required: true, lowercase: true },
    title:          { type: String, required: true },
    message:        { type: String, required: true },
    isRead:         { type: Boolean, default: false }
}, { timestamps: true });

// ─── Chat Message ──────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
    senderEmail:   { type: String, required: true, lowercase: true },
    receiverEmail: { type: String, required: true, lowercase: true },
    message:       { type: String, required: true },
    isRead:        { type: Boolean, default: false }
}, { timestamps: true });

// ─── Interview Schedule ───────────────────────────────────────────────────────
const interviewSchema = new mongoose.Schema({
    companyEmail:  { type: String, required: true, lowercase: true },
    seekerEmail:   { type: String, required: true, lowercase: true },
    seekerName:    { type: String, required: true },
    jobTitle:      { type: String, required: true },
    scheduledDate: { type: String, required: true },
    scheduledTime: { type: String, required: true },
    meetLink:      { type: String, default: '' },
    notes:         { type: String, default: '' },
    status:        { type: String, default: 'Scheduled' }
}, { timestamps: true });

// ─── Company Review Schema ───────────────────────────────────────────────────
const companyReviewSchema = new mongoose.Schema({
    companyEmail: { type: String, required: true, lowercase: true },
    seekerEmail:  { type: String, required: true, lowercase: true },
    seekerName:   { type: String, default: 'Anonymous Jobseeker' },
    rating:       { type: Number, required: true, min: 1, max: 5 },
    reviewTitle:  { type: String, required: true },
    pros:         { type: String, default: '' },
    cons:         { type: String, default: '' },
    workLifeRating: { type: Number, default: 4 },
    cultureRating:  { type: Number, default: 4 }
}, { timestamps: true });

// ─── Audit Log Schema ────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema({
    adminEmail: { type: String, default: 'admin@smartjob.com' },
    adminName:  { type: String, default: 'Super Admin' },
    action:     { type: String, required: true },
    details:    { type: String, default: '' },
    target:     { type: String, default: 'System' },
    ipAddress:  { type: String, default: '127.0.0.1' },
    severity:   { type: String, enum: ['info', 'warning', 'critical'], default: 'info' }
}, { timestamps: true });

// ─── System Settings Schema ──────────────────────────────────────────────────
const systemSettingsSchema = new mongoose.Schema({
    siteName:            { type: String, default: 'Smart Job Vacancy Finder' },
    supportEmail:        { type: String, default: 'support@smartjobfinder.com' },
    maintenanceMode:     { type: Boolean, default: false },
    autoApproveJobs:     { type: Boolean, default: true },
    emailNotifications:  { type: Boolean, default: true },
    maxUploadSizeMB:     { type: Number, default: 10 },
    allowedJobCategories:{ type: String, default: 'IT, Engineering, Design, Finance, Marketing, Healthcare, Sales, Data Science' }
}, { timestamps: true });

// ─── Export Models ────────────────────────────────────────────────────────────
const Jobseeker      = mongoose.models.Jobseeker      || mongoose.model('Jobseeker', jobseekerSchema);
const Company        = mongoose.models.Company        || mongoose.model('Company', companySchema);
const Job            = mongoose.models.Job            || mongoose.model('Job', jobSchema);
const Application    = mongoose.models.Application    || mongoose.model('Application', applicationSchema);
const Admin          = mongoose.models.Admin          || mongoose.model('Admin', adminSchema);
const Notification   = mongoose.models.Notification   || mongoose.model('Notification', notificationSchema);
const Message        = mongoose.models.Message        || mongoose.model('Message', messageSchema);
const Interview      = mongoose.models.Interview      || mongoose.model('Interview', interviewSchema);
const CompanyReview  = mongoose.models.CompanyReview  || mongoose.model('CompanyReview', companyReviewSchema);
const AuditLog       = mongoose.models.AuditLog       || mongoose.model('AuditLog', auditLogSchema);
const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = { Jobseeker, Company, Job, Application, Admin, Notification, Message, Interview, CompanyReview, AuditLog, SystemSettings };

