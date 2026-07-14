const { Jobseeker, Company, Job, Application, Admin } = require('./models');

// ---------- Row mappers (to keep controller responses identical) ----------
const mapJobseeker = (r) => ({
  id: r._id.toString(),
  name: r.name,
  email: r.email,
  password: r.password,
  qualification: r.qualification,
  skills: r.skills,
  resume: r.resume,
  photo: r.photo || '',
  coverLetter: r.cover_letter,
  status: r.status,
  createdAt: r.created_at
});

const mapCompany = (r) => ({
  id: r._id.toString(),
  name: r.name,
  email: r.email,
  password: r.password,
  phone: r.phone,
  location: r.location,
  industry: r.industry,
  about: r.about,
  status: r.status,
  createdAt: r.created_at
});

const mapJob = (r) => ({
  id: r._id.toString(),
  title: r.title,
  companyEmail: r.company_email,
  companyName: r.company_name,
  location: r.location,
  salary: r.salary,
  type: r.type,
  skills: r.skills,
  description: r.description,
  experience: r.experience,
  status: r.status,
  featured: !!r.featured,
  createdAt: r.created_at
});

const mapApplication = (r) => ({
  id: r._id.toString(),
  jobId: r.job_id,
  jobTitle: r.job_title,
  companyEmail: r.company_email,
  companyName: r.company_name,
  seekerEmail: r.seeker_email,
  seekerName: r.seeker_name,
  appliedDate: r.applied_date,
  resume: r.resume,
  coverLetter: r.cover_letter,
  status: r.status
});

const mapAdmin = (r) => ({
  id: r._id.toString(),
  name: r.name,
  email: r.email,
  password: r.password,
  role: r.role,
  status: r.status,
  twoFactorEnabled: !!r.two_factor_enabled,
  createdAt: r.created_at
});

// ---------- Job Seekers ----------
const listJobseekers = async () => {
  const rows = await Jobseeker.find().sort({ _id: 1 });
  return rows.map(mapJobseeker);
};

const getJobseekerByEmail = async (email) => {
  const row = await Jobseeker.findOne({ email: email.toLowerCase() });
  return row ? mapJobseeker(row) : null;
};

const createJobseeker = async (data) => {
  const row = await Jobseeker.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password || '',
    qualification: data.qualification || '',
    skills: data.skills || '',
    resume: data.resume || '',
    cover_letter: data.coverLetter || '',
    status: data.status || 'active'
  });
  return mapJobseeker(row);
};

const updateJobseeker = async (email, fields) => {
  const updateData = {};
  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.qualification !== undefined) updateData.qualification = fields.qualification;
  if (fields.skills !== undefined) updateData.skills = fields.skills;
  if (fields.resume !== undefined) updateData.resume = fields.resume;
  if (fields.photo !== undefined) updateData.photo = fields.photo;
  if (fields.coverLetter !== undefined) updateData.cover_letter = fields.coverLetter;
  if (fields.status !== undefined) updateData.status = fields.status;
  
  if (Object.keys(updateData).length === 0) return getJobseekerByEmail(email);
  
  const row = await Jobseeker.findOneAndUpdate({ email: email.toLowerCase() }, updateData, { returnDocument: 'after' });
  return row ? mapJobseeker(row) : null;
};

const setJobseekerStatus = async (email, status) => {
  const row = await Jobseeker.findOneAndUpdate({ email: email.toLowerCase() }, { status }, { returnDocument: 'after' });
  return row ? mapJobseeker(row) : null;
};

// ---------- Companies ----------
const listCompanies = async () => {
  const rows = await Company.find().sort({ _id: 1 });
  return rows.map(mapCompany);
};

const getCompanyByEmail = async (email) => {
  const row = await Company.findOne({ email: email.toLowerCase() });
  return row ? mapCompany(row) : null;
};

const createCompany = async (data) => {
  const row = await Company.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password || '',
    phone: data.phone || '',
    location: data.location || '',
    industry: data.industry || '',
    about: data.about || '',
    status: data.status || 'active'
  });
  return mapCompany(row);
};

const updateCompany = async (email, fields) => {
  const updateData = {};
  if (fields.name !== undefined) updateData.name = fields.name;
  if (fields.phone !== undefined) updateData.phone = fields.phone;
  if (fields.location !== undefined) updateData.location = fields.location;
  if (fields.industry !== undefined) updateData.industry = fields.industry;
  if (fields.about !== undefined) updateData.about = fields.about;
  if (fields.status !== undefined) updateData.status = fields.status;

  if (Object.keys(updateData).length === 0) return getCompanyByEmail(email);
  const row = await Company.findOneAndUpdate({ email: email.toLowerCase() }, updateData, { returnDocument: 'after' });
  return row ? mapCompany(row) : null;
};

const setCompanyStatus = async (email, status) => {
  const row = await Company.findOneAndUpdate({ email: email.toLowerCase() }, { status }, { returnDocument: 'after' });
  return row ? mapCompany(row) : null;
};

// ---------- Jobs ----------
const listJobs = async () => {
  const rows = await Job.find().sort({ created_at: -1 });
  return rows.map(mapJob);
};

const getJobById = async (id) => {
  const row = await Job.findById(id);
  return row ? mapJob(row) : null;
};

const createJob = async (data) => {
  const row = await Job.create({
    _id: data.id,
    title: data.title,
    company_email: data.companyEmail.toLowerCase(),
    company_name: data.companyName,
    location: data.location || '',
    salary: data.salary || '',
    type: data.type || 'Full Time',
    skills: data.skills || '',
    description: data.description || '',
    experience: data.experience || 'Fresher',
    status: data.status || 'Active',
    featured: !!data.featured,
    created_at: data.createdAt ? new Date(data.createdAt) : new Date()
  });
  return mapJob(row);
};

const updateJob = async (id, fields) => {
  const updateData = {};
  if (fields.title !== undefined) updateData.title = fields.title;
  if (fields.location !== undefined) updateData.location = fields.location;
  if (fields.salary !== undefined) updateData.salary = fields.salary;
  if (fields.type !== undefined) updateData.type = fields.type;
  if (fields.skills !== undefined) updateData.skills = fields.skills;
  if (fields.description !== undefined) updateData.description = fields.description;
  if (fields.experience !== undefined) updateData.experience = fields.experience;
  if (fields.status !== undefined) updateData.status = fields.status;
  if (fields.featured !== undefined) updateData.featured = !!fields.featured;
  
  if (Object.keys(updateData).length === 0) return getJobById(id);
  const row = await Job.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
  return row ? mapJob(row) : null;
};

const deleteJob = async (id) => {
  await Application.deleteMany({ job_id: id });
  const result = await Job.findByIdAndDelete(id);
  return !!result;
};

const setJobStatus = async (id, status) => {
  const row = await Job.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });
  return row ? mapJob(row) : null;
};

const toggleJobFeatured = async (id) => {
  const job = await Job.findById(id);
  if (!job) return null;
  job.featured = !job.featured;
  await job.save();
  return mapJob(job);
};

// ---------- Applications ----------
const listApplications = async () => {
  const rows = await Application.find().sort({ _id: 1 });
  return rows.map(mapApplication);
};

const getApplicationsBySeeker = async (email) => {
  const rows = await Application.find({ seeker_email: email.toLowerCase() });
  return rows.map(mapApplication);
};

const getApplicationsByCompany = async (email) => {
  const rows = await Application.find({ company_email: email.toLowerCase() });
  return rows.map(mapApplication);
};

const getApplicationById = async (id) => {
  const row = await Application.findById(id);
  return row ? mapApplication(row) : null;
};

const applicationExists = async (jobId, seekerEmail) => {
  const row = await Application.findOne({ job_id: jobId, seeker_email: seekerEmail.toLowerCase() });
  return !!row;
};

const createApplication = async (data) => {
  const row = await Application.create({
    _id: data.id,
    job_id: data.jobId,
    job_title: data.jobTitle || '',
    company_email: (data.companyEmail || '').toLowerCase(),
    company_name: data.companyName || '',
    seeker_email: (data.seekerEmail || '').toLowerCase(),
    seeker_name: data.seekerName || '',
    applied_date: data.appliedDate || '',
    resume: data.resume || '',
    cover_letter: data.coverLetter || '',
    status: data.status || 'Pending'
  });
  return mapApplication(row);
};

const setApplicationStatus = async (id, status) => {
  const row = await Application.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });
  return row ? mapApplication(row) : null;
};

// ---------- Admins ----------
const listAdmins = async () => {
  const rows = await Admin.find().sort({ _id: 1 });
  return rows.map(mapAdmin);
};

const getAdminByEmail = async (email) => {
  const row = await Admin.findOne({ email: email.toLowerCase() });
  return row ? mapAdmin(row) : null;
};

const ensureDefaultAdmins = async () => {
  const { DEFAULT_ADMINS } = require('./pool');
  for (const admin of DEFAULT_ADMINS) {
    try {
      const existing = await Admin.findOne({ email: admin.email.toLowerCase() });
      if (!existing) {
        await Admin.create({
          name: admin.name,
          email: admin.email.toLowerCase(),
          password: admin.password,
          role: 'Super Admin',
          status: 'Active'
        });
      }
    } catch (e) {
      // Ignore
    }
  }
};

module.exports = {
  // jobseekers
  listJobseekers,
  getJobseekerByEmail,
  createJobseeker,
  updateJobseeker,
  setJobseekerStatus,
  // companies
  listCompanies,
  getCompanyByEmail,
  createCompany,
  updateCompany,
  setCompanyStatus,
  // jobs
  listJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  setJobStatus,
  toggleJobFeatured,
  // applications
  listApplications,
  getApplicationsBySeeker,
  getApplicationsByCompany,
  getApplicationById,
  applicationExists,
  createApplication,
  setApplicationStatus,
  // admins
  listAdmins,
  getAdminByEmail,
  ensureDefaultAdmins
};
