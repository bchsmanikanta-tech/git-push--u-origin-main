// Force Google DNS to ensure MongoDB Atlas SRV record resolves on restricted networks
const dns = require('dns');
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('[SERVER] Warning: Failed to set DNS servers:', e.message);
}

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const jwt        = require('jsonwebtoken');

const connectDB  = require('./db/connection');
const { Jobseeker, Company, Job, Application, Admin, Notification } = require('./db/models');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false, crossOriginOpenerPolicy: false }));
app.use(morgan('dev'));

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || origin === 'null') return callback(null, true);
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
        if (origin.includes('.netlify.app') || origin.includes('netlify.app'))  return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// ─── Map Mongoose _id to id in JSON Responses ────────────────────────────────
const mapId = (obj) => {
    if (!obj) return obj;
    if (Array.isArray(obj)) {
        return obj.map(mapId);
    }
    if (typeof obj === 'object') {
        if (obj._id && obj.id === undefined) {
            obj.id = obj._id.toString();
        }
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] && typeof obj[key] === 'object') {
                obj[key] = mapId(obj[key]);
            }
        }
    }
    return obj;
};

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        if (body && typeof body === 'object') {
            body = mapId(body);
        }
        return originalJson.call(this, body);
    };
    next();
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests, try again later.' });
app.use('/api/', limiter);

// ─── Uploads ─────────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
try {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {
    console.warn('[SERVER] Could not create uploads dir (read-only FS):', e.message);
}
app.use('/uploads', express.static(UPLOADS_DIR));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Static Frontend ──────────────────────────────────────────────────────────
app.use(express.static(__dirname));

/* ================================================================
   HELPER — Admin JWT middleware
   ================================================================ */
const adminAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }
    try {
        const token   = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        const admin   = await Admin.findOne({ email: decoded.email.toLowerCase() });
        if (!admin) return res.status(403).json({ success: false, message: 'Invalid admin token.' });
        req.admin = admin;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const generateAdminToken = (admin) =>
    Buffer.from(JSON.stringify({ email: admin.email, role: admin.role, ts: Date.now() })).toString('base64');

/* ================================================================
   AUTH — JOB SEEKER
   ================================================================ */

// Register Seeker
app.post('/api/auth/register-seeker', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    try {
        const existing = await Jobseeker.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });
        await Jobseeker.create({ name, email: email.toLowerCase(), password });
        res.status(201).json({ success: true, message: 'Registration successful!', user: { name, email: email.toLowerCase(), role: 'seeker' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Login Seeker
app.post('/api/auth/login-seeker', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Please enter email and password.' });
    try {
        const seeker = await Jobseeker.findOne({ email: email.toLowerCase() });
        if (!seeker || seeker.password !== password)
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        if (seeker.status === 'banned' || seeker.status === 'suspended')
            return res.status(403).json({ success: false, message: `Your account has been ${seeker.status} by the administrator.` });
        res.json({ success: true, message: 'Login successful!', user: { name: seeker.name, email: seeker.email, role: 'seeker' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   AUTH — COMPANY
   ================================================================ */

// Register Company
app.post('/api/auth/register-company', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    try {
        const existing = await Company.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Company email already registered.' });
        await Company.create({ name, email: email.toLowerCase(), password });
        res.status(201).json({ success: true, message: 'Registration successful!', user: { name, email: email.toLowerCase(), role: 'company' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Login Company
app.post('/api/auth/login-company', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Please enter email and password.' });
    try {
        const company = await Company.findOne({ email: email.toLowerCase() });
        if (!company || company.password !== password)
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        if (company.status === 'banned' || company.status === 'suspended')
            return res.status(403).json({ success: false, message: `Your account has been ${company.status} by the administrator.` });
        res.json({ success: true, message: 'Login successful!', user: { name: company.name, email: company.email, role: 'company' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   PROFILES
   ================================================================ */

// Get Seeker Profile
app.get('/api/profile/seeker/:email', async (req, res) => {
    try {
        const seeker = await Jobseeker.findOne({ email: req.params.email.toLowerCase() }).lean();
        if (!seeker) return res.status(404).json({ success: false, message: 'Job seeker not found.' });
        const { password, ...profile } = seeker;
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Update Seeker Profile
app.put('/api/profile/seeker/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    const { name, qualification, skills, photo } = req.body;
    try {
        const updated = await Jobseeker.findOneAndUpdate(
            { email },
            { ...(name && { name }), ...(qualification !== undefined && { qualification }), ...(skills !== undefined && { skills }), ...(photo !== undefined && { photo }) },
            { new: true, lean: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Job seeker not found.' });
        const { password, ...profile } = updated;
        res.json({ success: true, message: 'Profile updated successfully!', profile });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get Company Profile
app.get('/api/profile/company/:email', async (req, res) => {
    try {
        const company = await Company.findOne({ email: req.params.email.toLowerCase() }).lean();
        if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
        const { password, ...profile } = company;
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Update Company Profile
app.put('/api/profile/company/:email', async (req, res) => {
    const email = req.params.email.toLowerCase();
    const { name, phone, location, industry, about } = req.body;
    try {
        const updated = await Company.findOneAndUpdate(
            { email },
            { ...(name && { name }), ...(phone !== undefined && { phone }), ...(location !== undefined && { location }), ...(industry !== undefined && { industry }), ...(about !== undefined && { about }) },
            { new: true, lean: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Company not found.' });

        // Sync company name on all their jobs
        if (name) {
            await Job.updateMany({ companyEmail: email, companyName: { $ne: name } }, { companyName: name });
        }

        const { password, ...profile } = updated;
        res.json({ success: true, message: 'Company profile updated successfully!', profile });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Upload Resume
app.post('/api/profile/upload-resume', (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large. Max 10MB.' });
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    try {
        const resumeDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const updated = await Jobseeker.findOneAndUpdate({ email: email.toLowerCase() }, { resume: resumeDataUrl }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Job seeker not found.' });
        res.json({ success: true, message: 'Resume uploaded successfully!', filename: req.file.originalname, url: resumeDataUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Upload Certificate
app.post('/api/profile/upload-certificate', (req, res, next) => {
    upload.single('certificate')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large. Max 10MB.' });
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(req.file.mimetype))
        return res.status(400).json({ success: false, message: 'Invalid file format. Allowed: PDF, JPG, PNG.' });
    try {
        const certDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        res.json({ success: true, message: 'Certificate uploaded successfully!', filename: req.file.originalname, url: certDataUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   JOBS
   ================================================================ */

// Get All Jobs (with filter + pagination)
app.get('/api/jobs', async (req, res) => {
    const { title, location, type, experience, minSalary, page, limit, companyEmail } = req.query;
    try {
        const filter = {};
        if (companyEmail) {
            filter.companyEmail = companyEmail.toLowerCase();
        } else {
            filter.status = 'Active';
        }
        if (title) {
            const t = title.trim();
            filter.$or = [
                { title: new RegExp(t, 'i') },
                { companyName: new RegExp(t, 'i') },
                { skills: new RegExp(t, 'i') }
            ];
        }
        if (location)   filter.location   = new RegExp(location.trim(), 'i');
        if (type && type !== 'All')             filter.type       = new RegExp(`^${type.trim()}$`, 'i');
        if (experience && experience !== 'All') filter.experience = new RegExp(experience.trim(), 'i');

        let jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();

        if (minSalary) {
            const minSalVal = parseInt(minSalary, 10) || 0;
            if (minSalVal > 0) {
                jobs = jobs.filter(job => {
                    const sal = parseInt((job.salary || '').replace(/[^0-9]/g, ''), 10) || 0;
                    return sal === 0 || sal >= minSalVal;
                });
            }
        }

        const total      = jobs.length;
        let pageVal      = 1;
        let totalPages   = 1;
        let paginatedJobs = jobs;

        if (page) {
            pageVal       = parseInt(page, 10) || 1;
            const limitVal = parseInt(limit, 10) || 6;
            totalPages    = Math.ceil(total / limitVal);
            paginatedJobs = jobs.slice((pageVal - 1) * limitVal, pageVal * limitVal);
        }

        res.json({ success: true, jobs: paginatedJobs, total, page: pageVal, totalPages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get Single Job
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).lean();
        if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Post Job
app.post('/api/jobs', async (req, res) => {
    const { title, companyEmail, companyName, location, salary, type, skills, description, experience } = req.body;
    if (!title || !companyEmail || !companyName || !location || !salary || !type || !description)
        return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    try {
        const jobId  = 'job_' + Date.now();
        const newJob = await Job.create({
            _id: jobId, title,
            companyEmail: companyEmail.toLowerCase(), companyName,
            location, salary, type,
            skills: skills || '',
            description,
            experience: experience || 'Fresher',
            status: 'Active',
            createdAt: new Date().toISOString()
        });

        // Skill-match notifications
        try {
            const seekers   = await Jobseeker.find().lean();
            const jobSkills = (skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
            for (const seeker of seekers) {
                const seekerSkills = (seeker.skills || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
                if (jobSkills.some(sk => seekerSkills.includes(sk))) {
                    await Notification.create({
                        recipientEmail: seeker.email,
                        title: 'New Job Match!',
                        message: `${companyName} posted a new job: "${title}" that matches your skills!`
                    });
                }
            }
        } catch (nErr) { console.error('Notification error:', nErr.message); }

        res.status(201).json({ success: true, message: 'Job posted successfully!', job: newJob });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Update Job
app.put('/api/jobs/:id', async (req, res) => {
    const { title, location, salary, type, skills, description, experience, status } = req.body;
    try {
        const updated = await Job.findByIdAndUpdate(
            req.params.id,
            { ...(title && { title }), ...(location !== undefined && { location }), ...(salary !== undefined && { salary }), ...(type && { type }), ...(skills !== undefined && { skills }), ...(description !== undefined && { description }), ...(experience && { experience }), ...(status && { status }) },
            { new: true, lean: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Job not found.' });
        res.json({ success: true, message: 'Job updated successfully!', job: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Delete Job
app.delete('/api/jobs/:id', async (req, res) => {
    try {
        const removed = await Job.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ success: false, message: 'Job not found.' });
        res.json({ success: true, message: 'Job deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   APPLICATIONS
   ================================================================ */

// Submit Application
app.post('/api/applications', async (req, res) => {
    const { jobId, jobTitle, companyEmail, companyName, seekerEmail, seekerName, coverLetter, resume, cgpa, certification, address, city, state } = req.body;
    if (!jobId || !jobTitle || !companyEmail || !seekerEmail || !seekerName)
        return res.status(400).json({ success: false, message: 'Invalid application details.' });
    try {
        const already = await Application.findOne({ jobId, seekerEmail: seekerEmail.toLowerCase() });
        if (already) return res.status(400).json({ success: false, message: 'You have already applied for this job.' });

        let finalResume = resume;
        if (!finalResume) {
            const seeker = await Jobseeker.findOne({ email: seekerEmail.toLowerCase() }).lean();
            if (seeker && seeker.resume) finalResume = seeker.resume;
        }

        const appId  = 'app_' + Date.now();
        const newApp = await Application.create({
            _id: appId, jobId, jobTitle,
            companyEmail: companyEmail.toLowerCase(), companyName,
            seekerEmail: seekerEmail.toLowerCase(), seekerName,
            appliedDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
            resume: finalResume || '', coverLetter: coverLetter || '',
            status: 'Pending',
            cgpa: cgpa || '', certification: certification || '',
            address: address || '', city: city || '', state: state || ''
        });

        // Notifications
        try {
            await Notification.create({ recipientEmail: seekerEmail.toLowerCase(), title: 'Application Submitted', message: `Your application for "${jobTitle}" at ${companyName} has been submitted.` });
            await Notification.create({ recipientEmail: companyEmail.toLowerCase(), title: 'New Application Received', message: `${seekerName} applied for your opening: "${jobTitle}".` });
        } catch (nErr) { console.error('Notification error:', nErr.message); }

        const applicationWithId = newApp.toObject();
        applicationWithId.id = applicationWithId._id;

        res.status(201).json({ success: true, message: 'Application submitted successfully!', application: applicationWithId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Applications by Seeker
app.get('/api/applications/seeker/:email', async (req, res) => {
    try {
        const apps = await Application.find({ seekerEmail: req.params.email.toLowerCase() }).sort({ createdAt: -1 }).lean();
        const appsWithId = apps.map(app => ({ ...app, id: app._id }));
        res.json({ success: true, applications: appsWithId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Applications by Company
app.get('/api/applications/company/:email', async (req, res) => {
    try {
        const apps = await Application.find({ companyEmail: req.params.email.toLowerCase() }).sort({ createdAt: -1 }).lean();
        const appsWithId = apps.map(app => ({ ...app, id: app._id }));
        res.json({ success: true, applications: appsWithId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get Single Application
app.get('/api/applications/:id', async (req, res) => {
    try {
        const appObj = await Application.findById(req.params.id).lean();
        if (!appObj) return res.status(404).json({ success: false, message: 'Application not found.' });
        appObj.id = appObj._id;
        res.json({ success: true, application: appObj });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Update Application Status
app.patch('/api/applications/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status || !['Pending', 'Selected', 'Rejected'].includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status.' });
    try {
        const updated = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true, lean: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Application not found.' });

        try {
            await Notification.create({
                recipientEmail: updated.seekerEmail ? updated.seekerEmail.toLowerCase() : '',
                title: `Application ${status === 'Selected' ? 'Accepted' : 'Evaluated'}`,
                message: `Your application for "${updated.jobTitle}" has been marked as ${status}.`
            });
        } catch (nErr) { console.error('Notification error:', nErr.message); }

        const updatedWithId = { ...updated, id: updated._id };
        res.json({ success: true, message: `Application status updated to ${status}.`, application: updatedWithId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   NOTIFICATIONS
   ================================================================ */

app.get('/api/notifications/:email', async (req, res) => {
    try {
        const list = await Notification.find({ recipientEmail: req.params.email.toLowerCase() }).sort({ createdAt: -1 }).lean();
        const listWithId = list.map(n => ({ ...n, id: n._id.toString() }));
        res.json({ success: true, notifications: listWithId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const updated = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true, lean: true });
        const updatedWithId = { ...updated, id: updated._id.toString() };
        res.json({ success: true, notification: updatedWithId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   SAVED JOBS
   ================================================================ */

app.get('/api/saved-jobs/:email', async (req, res) => {
    try {
        const seeker = await Jobseeker.findOne({ email: req.params.email.toLowerCase() }).lean();
        if (!seeker) return res.json({ success: true, jobs: [] });
        const jobs = await Job.find({ _id: { $in: seeker.savedJobs || [] } }).lean();
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.post('/api/saved-jobs', async (req, res) => {
    const { email, jobId } = req.body;
    if (!email || !jobId) return res.status(400).json({ success: false, message: 'Email and Job ID are required.' });
    try {
        const updated = await Jobseeker.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $addToSet: { savedJobs: jobId } },
            { new: true, lean: true }
        );
        res.json({ success: true, message: 'Job bookmarked!', user: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.delete('/api/saved-jobs', async (req, res) => {
    const { email, jobId } = req.body;
    if (!email || !jobId) return res.status(400).json({ success: false, message: 'Email and Job ID are required.' });
    try {
        const updated = await Jobseeker.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $pull: { savedJobs: jobId } },
            { new: true, lean: true }
        );
        res.json({ success: true, message: 'Bookmark removed!', user: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   ADMIN AUTH
   ================================================================ */

app.post('/api/admin/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Please enter email and password.' });
    try {
        const admin = await Admin.findOne({ email: email.toLowerCase() }).lean();
        if (!admin || admin.password !== password)
            return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
        const token = generateAdminToken(admin);
        res.json({ success: true, message: 'Admin login successful!', admin: { name: admin.name, email: admin.email, role: admin.role }, token });
    } catch (error) {
        console.error('[ADMIN LOGIN ERROR]', error.message);
        res.status(500).json({ success: false, message: 'Database error: ' + error.message });
    }
});

/* ================================================================
   ADMIN — DASHBOARD STATS
   ================================================================ */

app.get('/api/admin/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const [jobs, seekers, companies, applications] = await Promise.all([
            Job.find().lean(),
            Jobseeker.find().lean(),
            Company.find().lean(),
            Application.find().lean()
        ]);

        const totalJobs            = jobs.length;
        const activeJobs           = jobs.filter(j => j.status === 'Active').length;
        const totalSeekers         = seekers.length;
        const totalCompanies       = companies.length;
        const totalApplications    = applications.length;
        const pendingApplications  = applications.filter(a => a.status === 'Pending').length;
        const selectedApplications = applications.filter(a => a.status === 'Selected').length;
        const rejectedApplications = applications.filter(a => a.status === 'Rejected').length;

        // Jobs by day (last 7 days)
        const jobsByDay = [];
        for (let i = 6; i >= 0; i--) {
            const d        = new Date();
            d.setDate(d.getDate() - i);
            const dateStr  = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEnd   = new Date(dayStart.getTime() + 86400000);
            const count    = jobs.filter(j => { const c = new Date(j.createdAt); return c >= dayStart && c < dayEnd; }).length;
            jobsByDay.push({ date: dateStr, count });
        }

        // Recent activity
        const recentActivity = [];
        [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).forEach(j =>
            recentActivity.push({ type: 'job', text: `"${j.title}" posted by ${j.companyName}`, time: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN') : 'Recently' })
        );
        [...applications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).forEach(a =>
            recentActivity.push({ type: 'application', text: `${a.seekerName} applied for "${a.jobTitle}"`, time: a.appliedDate })
        );
        if (seekers.length > 0) {
            const last = seekers[seekers.length - 1];
            recentActivity.push({ type: 'user', text: `New seeker registered: ${last.name}`, time: 'Recently' });
        }

        res.json({ success: true, stats: { totalJobs, activeJobs, totalSeekers, totalCompanies, totalApplications, pendingApplications, selectedApplications, rejectedApplications, jobsByDay, recentActivity } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   ADMIN — ANALYTICS EXPORT
   ================================================================ */

app.get('/api/admin/analytics/export-summary', adminAuth, async (req, res) => {
    try {
        const [jobs, seekers, companies, applications] = await Promise.all([
            Job.find().lean(), Jobseeker.find().lean(), Company.find().lean(), Application.find().lean()
        ]);
        const rows = [
            ['Metric', 'Value'],
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
        const csv = rows.map(r => r.join(',')).join('\n');
        res.json({ success: true, csv });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   ADMIN — JOBS MANAGEMENT
   ================================================================ */

app.get('/api/admin/jobs', adminAuth, async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 }).lean();
        res.json({ success: true, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.patch('/api/admin/jobs/:id/status', adminAuth, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });
    try {
        const updated = await Job.findByIdAndUpdate(req.params.id, { status }, { new: true, lean: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Job not found.' });
        res.json({ success: true, message: `Job status updated to ${status}.`, job: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.patch('/api/admin/jobs/:id/featured', adminAuth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
        job.featured = !job.featured;
        await job.save();
        res.json({ success: true, message: `Job ${job.featured ? 'marked as Featured' : 'removed from Featured'}.`, job });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.put('/api/admin/jobs/:id', adminAuth, async (req, res) => {
    const { title, location, salary, type, skills, description, experience, status } = req.body;
    try {
        const updated = await Job.findByIdAndUpdate(
            req.params.id,
            { ...(title && { title }), ...(location !== undefined && { location }), ...(salary !== undefined && { salary }), ...(type && { type }), ...(skills !== undefined && { skills }), ...(description !== undefined && { description }), ...(experience && { experience }), ...(status && { status }) },
            { new: true, lean: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Job not found.' });
        res.json({ success: true, message: 'Job updated!', job: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.delete('/api/admin/jobs/:id', adminAuth, async (req, res) => {
    try {
        const removed = await Job.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ success: false, message: 'Job not found.' });
        res.json({ success: true, message: 'Job deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.post('/api/admin/jobs/bulk', adminAuth, async (req, res) => {
    const { action, ids } = req.body;
    if (!action || !ids || !ids.length)
        return res.status(400).json({ success: false, message: 'Action and job IDs are required.' });
    try {
        let count = 0;
        for (const id of ids) {
            if (action === 'delete') {
                const r = await Job.findByIdAndDelete(id);
                if (r) count++;
            } else if (action === 'activate' || action === 'Active') {
                const r = await Job.findByIdAndUpdate(id, { status: 'Active' });
                if (r) count++;
            } else if (action === 'archive' || action === 'Archived') {
                const r = await Job.findByIdAndUpdate(id, { status: 'Archived' });
                if (r) count++;
            } else if (action === 'feature') {
                const r = await Job.findByIdAndUpdate(id, { featured: true });
                if (r) count++;
            } else if (action === 'unfeature') {
                const r = await Job.findByIdAndUpdate(id, { featured: false });
                if (r) count++;
            }
        }
        res.json({ success: true, message: `Bulk action "${action}" applied to ${count} job(s).` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   ADMIN — USERS MANAGEMENT
   ================================================================ */

app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const [seekers, companies, applications, jobs] = await Promise.all([
            Jobseeker.find().lean(), Company.find().lean(), Application.find().lean(), Job.find().lean()
        ]);

        const seekerUsers  = seekers.map(s => ({
            name: s.name, email: s.email, role: 'seeker',
            qualification: s.qualification || '', skills: s.skills || '',
            status: s.status || 'active',
            applicationCount: applications.filter(a => a.seekerEmail === s.email).length
        }));
        const companyUsers = companies.map(c => ({
            name: c.name, email: c.email, role: 'company',
            industry: c.industry || '', location: c.location || '',
            status: c.status || 'active',
            jobsPosted: jobs.filter(j => j.companyEmail === c.email).length
        }));

        res.json({ success: true, users: [...seekerUsers, ...companyUsers] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.patch('/api/admin/users/status', adminAuth, async (req, res) => {
    const { email, role, status } = req.body;
    if (!email || !role || !status)
        return res.status(400).json({ success: false, message: 'Email, role, and status are required.' });
    try {
        let updated = null;
        if (role === 'seeker') {
            updated = await Jobseeker.findOneAndUpdate({ email: email.toLowerCase() }, { status }, { new: true });
        } else if (role === 'company') {
            updated = await Company.findOneAndUpdate({ email: email.toLowerCase() }, { status }, { new: true });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role.' });
        }
        if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
        const word = status === 'active' ? 'reactivated' : status === 'banned' ? 'banned' : 'suspended';
        res.json({ success: true, message: `User "${email}" has been ${word}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.post('/api/admin/users/bulk-email', adminAuth, async (req, res) => {
    const { segment, subject, body } = req.body;
    if (!subject || !body)
        return res.status(400).json({ success: false, message: 'Subject and body are required.' });
    try {
        const [seekers, companies] = await Promise.all([Jobseeker.find().lean(), Company.find().lean()]);
        let recipients = [];
        if (!segment || segment === 'all') recipients = [...seekers.map(s => s.email), ...companies.map(c => c.email)];
        else if (segment === 'seekers')    recipients = seekers.map(s => s.email);
        else if (segment === 'companies')  recipients = companies.map(c => c.email);
        console.log(`[ADMIN BULK EMAIL] Subject: "${subject}" | To: ${recipients.length} recipients`);
        res.json({ success: true, message: `Email "${subject}" sent to ${recipients.length} user(s).` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

/* ================================================================
   DATABASE SERVER HEALTH & DIAGNOSTICS
   ================================================================ */

app.get('/api/db-server', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const dbState = mongoose.connection.readyState;
        const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

        const startPing = Date.now();
        if (mongoose.connection.db) {
            await mongoose.connection.db.admin().ping();
        }
        const pingMs = Date.now() - startPing;

        const [seekersCount, companiesCount, jobsCount, appsCount] = await Promise.all([
            Jobseeker.countDocuments(),
            Company.countDocuments(),
            Job.countDocuments(),
            Application.countDocuments()
        ]);

        res.json({
            success: true,
            databaseServer: {
                provider: 'MongoDB Atlas Cloud Server',
                host: mongoose.connection.host || 'smartjob.alq6c0s.mongodb.net',
                name: mongoose.connection.name || 'smartjobfinder',
                status: states[dbState] || 'connected',
                pingMs: pingMs + 'ms',
                collections: {
                    jobseekers: seekersCount,
                    companies: companiesCount,
                    jobs: jobsCount,
                    applications: appsCount
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database server diagnostic error: ' + error.message
        });
    }
});

/* ================================================================
   FRONTEND FALLBACK
   ================================================================ */

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ================================================================
   GLOBAL ERROR HANDLER
   ================================================================ */

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

/* ================================================================
   STARTUP
   ================================================================ */

const ensureDefaultAdmin = async () => {
    try {
        const exists = await Admin.findOne({ email: 'admin@smartjob.com' });
        if (!exists) {
            await Admin.create({ name: 'Super Admin', email: 'admin@smartjob.com', password: 'Admin@123', role: 'Super Admin', status: 'Active' });
            console.log('[ADMIN] Default admin created → email: admin@smartjob.com | password: Admin@123');
        }
    } catch (error) {
        console.error('[ADMIN] Failed to create default admin:', error.message);
    }
};

const startServer = async () => {
    await connectDB();
    await ensureDefaultAdmin();
    app.listen(PORT, () => {
        console.log('==================================================');
        console.log(` SERVER RUNNING  → http://localhost:${PORT}`);
        console.log(` DATABASE        → MongoDB Atlas`);
        console.log('==================================================');
    });
};

if (!process.env.NETLIFY) {
    startServer();
}

module.exports = app;
