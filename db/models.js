const mongoose = require('mongoose');

// ─── Jobseeker ───────────────────────────────────────────────────────────────
const jobseekerSchema = new mongoose.Schema({
    name:          { type: String, required: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    password:      { type: String, required: true },
    qualification: { type: String, default: '' },
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
    state:        { type: String, default: '' }
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

// ─── Export Models ────────────────────────────────────────────────────────────
const Jobseeker    = mongoose.models.Jobseeker    || mongoose.model('Jobseeker', jobseekerSchema);
const Company      = mongoose.models.Company      || mongoose.model('Company', companySchema);
const Job          = mongoose.models.Job          || mongoose.model('Job', jobSchema);
const Application  = mongoose.models.Application  || mongoose.model('Application', applicationSchema);
const Admin        = mongoose.models.Admin        || mongoose.model('Admin', adminSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = { Jobseeker, Company, Job, Application, Admin, Notification };
