// Force Google DNS to ensure MongoDB Atlas SRV record resolves on any network
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Admin-module route imports
const adminModuleAuthRoutes = require('./admin-module/server/routes/authRoutes');
const adminModuleUserRoutes = require('./admin-module/server/routes/userRoutes');
const adminModuleVacancyRoutes = require('./admin-module/server/routes/vacancyRoutes');
const adminModuleSmartDoorRoutes = require('./admin-module/server/routes/smartDoorRoutes');
const adminModuleAnalyticsRoutes = require('./admin-module/server/routes/analyticsRoutes');

// PostgreSQL data-access layer
const db = require('./db/queries');
const { initDatabase, testConnection } = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & logging middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
}));
app.use(morgan('dev'));

// Enable CORS for Netlify frontend and local development
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || origin === 'null') return callback(null, true);
        // Allow localhost for local dev
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        // Allow Netlify domains (e.g., https://your-app.netlify.app)
        if (origin.includes('.netlify.app') || origin.includes('netlify.app')) {
            return callback(null, true);
        }
        // You can add your custom domain here if you have one
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Paths
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
try {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR);
    }
} catch (error) {
    console.warn('[SERVER] Warning: Could not create uploads directory (filesystem is read-only):', error.message);
}

// Multer setup for memory storage (Netlify compatible)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit (ideal for serverless)
});

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve main frontend statically from the root
app.use(express.static(__dirname));

/* --- API ENDPOINTS --- */

// --- Authentication APIs ---

// Job Seeker Register
app.post('/api/auth/register-seeker', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    try {
        const existing = await db.getJobseekerByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, message: "Email already registered." });
        }

        const newSeeker = await db.createJobseeker({ name, email: email.toLowerCase(), password });
        res.status(201).json({ success: true, message: "Registration successful!", user: { name, email: email.toLowerCase(), role: 'seeker' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Job Seeker Login
app.post('/api/auth/login-seeker', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please enter email and password." });
    }

    try {
        const seeker = await db.getJobseekerByEmail(email);
        if (!seeker || seeker.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        if (seeker.status === 'banned' || seeker.status === 'suspended') {
            return res.status(403).json({ success: false, message: "Your account has been " + seeker.status + " by the administrator." });
        }

        res.json({ success: true, message: "Login successful!", user: { name: seeker.name, email: seeker.email, role: 'seeker' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Company Register
app.post('/api/auth/register-company', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    try {
        const existing = await db.getCompanyByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, message: "Company email already registered." });
        }

        await db.createCompany({ name, email: email.toLowerCase(), password });
        res.status(201).json({ success: true, message: "Registration successful!", user: { name, email: email.toLowerCase(), role: 'company' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Company Login
app.post('/api/auth/login-company', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please enter email and password." });
    }

    try {
        const company = await db.getCompanyByEmail(email);
        if (!company || company.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        if (company.status === 'banned' || company.status === 'suspended') {
            return res.status(403).json({ success: false, message: "Your account has been " + company.status + " by the administrator." });
        }

        res.json({ success: true, message: "Login successful!", user: { name: company.name, email: company.email, role: 'company' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});


// --- Profile APIs ---

// Get Job Seeker Profile
app.get('/api/profile/seeker/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    try {
        const seeker = await db.getJobseekerByEmail(email);
        if (!seeker) {
            return res.status(404).json({ success: false, message: "Job seeker not found." });
        }
        const { password, ...profile } = seeker;
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Update Job Seeker Profile
app.put('/api/profile/seeker/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    const { name, qualification, skills, photo } = req.body;

    try {
        const updated = await db.updateJobseeker(email, { name, qualification, skills, photo });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Job seeker not found." });
        }
        const { password, ...profile } = updated;
        res.json({ success: true, message: "Profile updated successfully!", profile });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Get Company Profile
app.get('/api/profile/company/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    try {
        const company = await db.getCompanyByEmail(email);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found." });
        }
        const { password, ...profile } = company;
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Update Company Profile
app.put('/api/profile/company/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    const { name, phone, location, industry, about } = req.body;

    try {
        const updated = await db.updateCompany(email, { name, phone, location, industry, about });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Company not found." });
        }

        // Update companyName in active job postings
        if (name) {
            const jobs = await db.listJobs();
            for (const job of jobs) {
                if (job.companyEmail === email && job.companyName !== name) {
                    await db.updateJob(job.id, { companyName: name });
                }
            }
        }

        const { password, ...profile } = updated;
        res.json({ success: true, message: "Company profile updated successfully!", profile });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Upload Resume API with custom error handling
app.post('/api/profile/upload-resume', (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ success: false, message: "File size limit exceeded. Max limit is 10MB." });
                }
                return res.status(400).json({ success: false, message: err.message });
            }
            return res.status(500).json({ success: false, message: err.message || "An error occurred during upload." });
        }
        next();
    });
}, async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Job seeker email is required." });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    try {
        const base64Data = req.file.buffer.toString('base64');
        const resumeDataUrl = `data:${req.file.mimetype};base64,${base64Data}`;

        const updated = await db.updateJobseeker(email.toLowerCase(), { resume: resumeDataUrl });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Job seeker not found." });
        }

        res.json({
            success: true,
            message: "Resume uploaded successfully!",
            filename: req.file.originalname,
            url: resumeDataUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});


// --- Jobs APIs ---

// Get All Active Jobs (Supports filtering)
app.get('/api/jobs', async (req, res) => {
    const { title, location } = req.query;
    try {
        let filteredJobs = (await db.listJobs()).filter(job => job.status === "Active");

        if (title) {
            const titleQuery = title.toLowerCase();
            filteredJobs = filteredJobs.filter(job =>
                job.title.toLowerCase().includes(titleQuery) ||
                job.companyName.toLowerCase().includes(titleQuery) ||
                job.skills.toLowerCase().includes(titleQuery)
            );
        }

        if (location) {
            const locQuery = location.toLowerCase();
            filteredJobs = filteredJobs.filter(job =>
                job.location.toLowerCase().includes(locQuery)
            );
        }

        res.json({ success: true, jobs: filteredJobs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Get Specific Job Details
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const job = await db.getJobById(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found." });
        }
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Post New Job (Company only)
app.post('/api/jobs', async (req, res) => {
    const { title, companyEmail, companyName, location, salary, type, skills, description, experience } = req.body;
    if (!title || !companyEmail || !companyName || !location || !salary || !type || !description) {
        return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    try {
        const newJob = await db.createJob({
            id: 'job_' + Date.now(),
            title,
            companyEmail: companyEmail.toLowerCase(),
            companyName,
            location,
            salary,
            type,
            skills: skills || "",
            description,
            experience: experience || "Fresher",
            status: "Active",
            createdAt: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: "Job posted successfully!", job: newJob });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Edit Job
app.put('/api/jobs/:id', async (req, res) => {
    const { title, location, salary, type, skills, description, experience, status } = req.body;
    try {
        const updated = await db.updateJob(req.params.id, {
            title, location, salary, type, skills, description, experience, status
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: "Job vacancy not found." });
        }

        res.json({ success: true, message: "Job details updated successfully!", job: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Delete Job
app.delete('/api/jobs/:id', async (req, res) => {
    const jobId = req.params.id;
    try {
        const removed = await db.deleteJob(jobId);
        if (!removed) {
            return res.status(404).json({ success: false, message: "Job vacancy not found." });
        }
        res.json({ success: true, message: "Job vacancy deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});


// --- Applications APIs ---

// Submit Job Application (Job Seeker only)
app.post('/api/applications', async (req, res) => {
    const { jobId, jobTitle, companyEmail, companyName, seekerEmail, seekerName, coverLetter, resume } = req.body;

    if (!jobId || !jobTitle || !companyEmail || !seekerEmail || !seekerName) {
        return res.status(400).json({ success: false, message: "Invalid application details." });
    }

    try {
        const alreadyApplied = await db.applicationExists(jobId, seekerEmail);
        if (alreadyApplied) {
            return res.status(400).json({ success: false, message: "You have already applied for this job." });
        }

        // Get current seeker's default resume if not overridden in form
        let finalResume = resume;
        if (!finalResume) {
            const seeker = await db.getJobseekerByEmail(seekerEmail);
            if (seeker && seeker.resume) {
                finalResume = seeker.resume;
            }
        }

        const newApp = await db.createApplication({
            id: 'app_' + Date.now(),
            jobId,
            jobTitle,
            companyEmail: companyEmail.toLowerCase(),
            companyName,
            seekerEmail: seekerEmail.toLowerCase(),
            seekerName,
            appliedDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
            resume: finalResume || "",
            coverLetter: coverLetter || "",
            status: "Pending"
        });

        res.status(201).json({ success: true, message: "Application submitted successfully!", application: newApp });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Get Applications for a Seeker
app.get('/api/applications/seeker/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    try {
        const seekerApps = await db.getApplicationsBySeeker(email);
        res.json({ success: true, applications: seekerApps });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Get Applications for a Company
app.get('/api/applications/company/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    try {
        const companyApps = await db.getApplicationsByCompany(email);
        res.json({ success: true, applications: companyApps });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Update Application Status (Accept / Reject)
app.patch('/api/applications/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status || !['Pending', 'Selected', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid application status." });
    }

    try {
        const updated = await db.setApplicationStatus(req.params.id, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Application not found." });
        }

        res.json({ success: true, message: `Application state updated to ${status}.`, application: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// System Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: "Smart Job Vacancy Finder API is online!" });
});


/* ============================================================ */
/* --- ADMIN API ENDPOINTS ---                                  */
/* ============================================================ */

// Simple token generation (for demo purposes)
function generateAdminToken(admin) {
    return Buffer.from(JSON.stringify({ email: admin.email, role: admin.role, ts: Date.now() })).toString('base64');
}

// Simple admin auth middleware
async function adminAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        const admin = await db.getAdminByEmail(decoded.email);
        if (!admin) {
            return res.status(403).json({ success: false, message: 'Invalid admin token.' });
        }
        req.admin = admin;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
}

// 1. Admin Login
app.post('/api/admin/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please enter email and password.' });
    }

    try {
        const admin = await db.getAdminByEmail(email);
        if (!admin || admin.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
        }

        const token = generateAdminToken(admin);
        res.json({
            success: true,
            message: 'Admin login successful!',
            admin: { name: admin.name, email: admin.email, role: admin.role },
            token
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 2. Dashboard Stats
app.get('/api/admin/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const [jobs, seekers, companies, applications] = await Promise.all([
            db.listJobs(),
            db.listJobseekers(),
            db.listCompanies(),
            db.listApplications()
        ]);

        const totalJobs = jobs.length;
        const activeJobs = jobs.filter(j => j.status === 'Active').length;
        const totalSeekers = seekers.length;
        const totalCompanies = companies.length;
        const totalApplications = applications.length;
        const pendingApplications = applications.filter(a => a.status === 'Pending').length;
        const selectedApplications = applications.filter(a => a.status === 'Selected').length;
        const rejectedApplications = applications.filter(a => a.status === 'Rejected').length;

        // Jobs by day (last 7 days)
        const jobsByDay = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEnd = new Date(dayStart.getTime() + 86400000);
            const count = jobs.filter(j => {
                const created = new Date(j.createdAt);
                return created >= dayStart && created < dayEnd;
            }).length;
            jobsByDay.push({ date: dateStr, count });
        }

        // Recent activity feed
        const recentActivity = [];

        const sortedJobs = [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
        sortedJobs.forEach(j => {
            recentActivity.push({
                type: 'job',
                text: `"${j.title}" posted by ${j.companyName}`,
                time: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN') : 'Recently'
            });
        });

        const sortedApps = [...applications].sort((a, b) => {
            const parseDate = (d) => { const p = d.split('-'); return new Date(p[2], p[1] - 1, p[0]); };
            return parseDate(b.appliedDate) - parseDate(a.appliedDate);
        }).slice(0, 3);
        sortedApps.forEach(a => {
            recentActivity.push({
                type: 'application',
                text: `${a.seekerName} applied for "${a.jobTitle}"`,
                time: a.appliedDate
            });
        });

        if (seekers.length > 0) {
            const latestSeeker = seekers[seekers.length - 1];
            recentActivity.push({
                type: 'user',
                text: `New job seeker registered: ${latestSeeker.name}`,
                time: 'Recently'
            });
        }

        res.json({
            success: true,
            stats: {
                totalJobs,
                activeJobs,
                totalSeekers,
                totalCompanies,
                totalApplications,
                pendingApplications,
                selectedApplications,
                rejectedApplications,
                jobsByDay,
                recentActivity
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 3. Analytics Export Summary
app.get('/api/admin/analytics/export-summary', adminAuth, async (req, res) => {
    try {
        const [jobs, seekers, companies, applications] = await Promise.all([
            db.listJobs(),
            db.listJobseekers(),
            db.listCompanies(),
            db.listApplications()
        ]);

        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Jobs', jobs.length],
            ['Active Jobs', jobs.filter(j => j.status === 'Active').length],
            ['Total Job Seekers', seekers.length],
            ['Total Companies', companies.length],
            ['Total Applications', applications.length],
            ['Pending Applications', applications.filter(a => a.status === 'Pending').length],
            ['Selected Applications', applications.filter(a => a.status === 'Selected').length],
            ['Rejected Applications', applications.filter(a => a.status === 'Rejected').length],
            ['Report Generated', new Date().toLocaleString('en-IN')]
        ];

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        res.json({ success: true, csv });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 4. Admin – Get All Jobs
app.get('/api/admin/jobs', adminAuth, async (req, res) => {
    try {
        const jobs = await db.listJobs();
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 5. Admin – Update Job Status
app.patch('/api/admin/jobs/:id/status', adminAuth, async (req, res) => {
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    try {
        const updated = await db.setJobStatus(req.params.id, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        res.json({ success: true, message: `Job status updated to ${status}.`, job: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 6. Admin – Toggle Featured
app.patch('/api/admin/jobs/:id/featured', adminAuth, async (req, res) => {
    try {
        const updated = await db.toggleJobFeatured(req.params.id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        const state = updated.featured ? 'marked as Featured' : 'removed from Featured';
        res.json({ success: true, message: `Job ${state}.`, job: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 7. Admin – Delete Job
app.delete('/api/admin/jobs/:id', adminAuth, async (req, res) => {
    try {
        const removed = await db.deleteJob(req.params.id);
        if (!removed) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        res.json({ success: true, message: 'Job deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 8. Admin – Edit Job
app.put('/api/admin/jobs/:id', adminAuth, async (req, res) => {
    const { title, location, salary, type, skills, description, experience, status } = req.body;
    try {
        const updated = await db.updateJob(req.params.id, {
            title, location, salary, type, skills, description, experience, status
        });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        res.json({ success: true, message: 'Job updated successfully!', job: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 9. Admin – Bulk Job Actions
app.post('/api/admin/jobs/bulk', adminAuth, async (req, res) => {
    const { action, ids } = req.body;
    if (!action || !ids || !ids.length) {
        return res.status(400).json({ success: false, message: 'Action and job IDs are required.' });
    }

    try {
        let count = 0;
        for (const id of ids) {
            let updated = null;
            if (action === 'delete') {
                if (await db.deleteJob(id)) count++;
            } else if (action === 'activate' || action === 'Active') {
                updated = await db.setJobStatus(id, 'Active');
            } else if (action === 'archive' || action === 'Archived') {
                updated = await db.setJobStatus(id, 'Archived');
            } else if (action === 'feature') {
                updated = await db.updateJob(id, { featured: true });
            } else if (action === 'unfeature') {
                updated = await db.updateJob(id, { featured: false });
            }
            if (updated) count++;
        }

        res.json({ success: true, message: `Bulk action "${action}" applied to ${count} job(s).` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 10. Admin – Get All Users (seekers + companies merged)
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const [seekers, companies, applications, jobs] = await Promise.all([
            db.listJobseekers(),
            db.listCompanies(),
            db.listApplications(),
            db.listJobs()
        ]);

        const seekerUsers = seekers.map(s => {
            const appCount = applications.filter(a => a.seekerEmail === s.email).length;
            return {
                name: s.name,
                email: s.email,
                role: 'seeker',
                qualification: s.qualification || '',
                skills: s.skills || '',
                location: '',
                status: s.status || 'active',
                applicationCount: appCount
            };
        });

        const companyUsers = companies.map(c => {
            const jobCount = jobs.filter(j => j.companyEmail === c.email).length;
            return {
                name: c.name,
                email: c.email,
                role: 'company',
                industry: c.industry || '',
                location: c.location || '',
                about: c.about || '',
                status: c.status || 'active',
                jobsPosted: jobCount
            };
        });

        res.json({ success: true, users: [...seekerUsers, ...companyUsers] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 11. Admin – Update User Status (ban / suspend / reactivate)
app.patch('/api/admin/users/status', adminAuth, async (req, res) => {
    const { email, role, status } = req.body;
    if (!email || !role || !status) {
        return res.status(400).json({ success: false, message: 'Email, role, and status are required.' });
    }

    try {
        let updated = null;
        if (role === 'seeker') {
            updated = await db.setJobseekerStatus(email, status);
        } else if (role === 'company') {
            updated = await db.setCompanyStatus(email, status);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role.' });
        }

        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const actionWord = status === 'active' ? 'reactivated' : status === 'banned' ? 'banned' : 'suspended';
        res.json({ success: true, message: `User "${email}" has been ${actionWord}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 12. Admin – Bulk Email (simulated, logs to console)
app.post('/api/admin/users/bulk-email', adminAuth, async (req, res) => {
    const { segment, subject, body } = req.body;
    if (!subject || !body) {
        return res.status(400).json({ success: false, message: 'Subject and message body are required.' });
    }

    try {
        const [seekers, companies] = await Promise.all([db.listJobseekers(), db.listCompanies()]);
        let recipients = [];

        if (segment === 'all' || !segment) {
            recipients = [...seekers.map(s => s.email), ...companies.map(c => c.email)];
        } else if (segment === 'seekers') {
            recipients = seekers.map(s => s.email);
        } else if (segment === 'companies') {
            recipients = companies.map(c => c.email);
        }

        console.log(`[ADMIN BULK EMAIL] Subject: "${subject}" | To: ${recipients.length} recipients (${segment || 'all'})`);
        console.log(`[ADMIN BULK EMAIL] Body: ${body.substring(0, 100)}...`);

        res.json({
            success: true,
            message: `Email "${subject}" sent to ${recipients.length} ${segment || 'all'} user(s) successfully!`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

/* ============================================================ */
/* --- ADMIN MODULE API ROUTES (merged from admin-module/server) */
/* ============================================================ */

// Rate limiting for admin-module routes
const adminModuleLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

// Mount admin-module routes under /api prefix (same paths as before)
app.use('/api/auth', adminModuleLimiter, adminModuleAuthRoutes);
app.use('/api/users', adminModuleLimiter, adminModuleUserRoutes);
app.use('/api/vacancies', adminModuleLimiter, adminModuleVacancyRoutes);
app.use('/api/smart-doors', adminModuleLimiter, adminModuleSmartDoorRoutes);
app.use('/api/analytics', adminModuleLimiter, adminModuleAnalyticsRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Redirect any unmatched route to index.html (optional frontend fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ensure default admin accounts exist
const ensureDefaultAdmin = async () => {
    try {
        await db.ensureDefaultAdmins();
        console.log('[ADMIN] Ensured shared admin account credentials are current');
    } catch (error) {
        console.error('[ADMIN] Failed to ensure default admin account:', error.message);
    }
};

// Start unified server locally
const startServer = async () => {
    try {
        await initDatabase();
        await ensureDefaultAdmin();
        app.listen(PORT, () => {
            console.log(`==================================================`);
            console.log(` UNIFIED SERVER RUNNING: http://localhost:${PORT}`);
            console.log(` DATABASE: MongoDB`);
            console.log(`==================================================`);
        });
    } catch (error) {
        console.error('[SERVER] Initialization failed:', error.message);
    }
};

// If not running in Netlify environment, start the server locally
if (!process.env.NETLIFY) {
    startServer();
}

// Export the express app for serverless function use
module.exports = app;

