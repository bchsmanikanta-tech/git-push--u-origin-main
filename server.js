const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for Netlify frontend and local development
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure database and uploads folders exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Helper functions to read/write JSON db
const readDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            // Write default empty structure if file does not exist
            const defaultDb = { jobseekers: [], companies: [], jobs: [], applications: [] };
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
            return defaultDb;
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading database file:", error);
        return { jobseekers: [], companies: [], jobs: [], applications: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error("Error writing database file:", error);
        return false;
    }
};

// Multer setup for resume upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve main frontend statically from the root
app.use(express.static(__dirname));

/* --- API ENDPOINTS --- */

// --- Authentication APIs ---

// Job Seeker Register
app.post('/api/auth/register-seeker', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    const db = readDB();
    const existing = db.jobseekers.find(js => js.email.toLowerCase() === email.toLowerCase());
    if (existing) {
        return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const newSeeker = {
        name,
        email: email.toLowerCase(),
        password,
        qualification: "",
        skills: "",
        resume: "",
        coverLetter: ""
    };

    db.jobseekers.push(newSeeker);
    writeDB(db);

    res.status(201).json({ success: true, message: "Registration successful!", user: { name, email: email.toLowerCase(), role: 'seeker' } });
});

// Job Seeker Login
app.post('/api/auth/login-seeker', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please enter email and password." });
    }

    const db = readDB();
    const seeker = db.jobseekers.find(js => js.email.toLowerCase() === email.toLowerCase() && js.password === password);
    if (!seeker) {
        return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    res.json({ success: true, message: "Login successful!", user: { name: seeker.name, email: seeker.email, role: 'seeker' } });
});

// Company Register
app.post('/api/auth/register-company', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    const db = readDB();
    const existing = db.companies.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (existing) {
        return res.status(400).json({ success: false, message: "Company email already registered." });
    }

    const newCompany = {
        name,
        email: email.toLowerCase(),
        password,
        phone: "",
        location: "",
        industry: "",
        about: ""
    };

    db.companies.push(newCompany);
    writeDB(db);

    res.status(201).json({ success: true, message: "Registration successful!", user: { name, email: email.toLowerCase(), role: 'company' } });
});

// Company Login
app.post('/api/auth/login-company', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please enter email and password." });
    }

    const db = readDB();
    const company = db.companies.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === password);
    if (!company) {
        return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    res.json({ success: true, message: "Login successful!", user: { name: company.name, email: company.email, role: 'company' } });
});


// --- Profile APIs ---

// Get Job Seeker Profile
app.get('/api/profile/seeker/:email', (req, res) => {
    const email = req.params.email.toLowerCase();
    const db = readDB();
    const seeker = db.jobseekers.find(js => js.email === email);
    if (!seeker) {
        return res.status(404).json({ success: false, message: "Job seeker not found." });
    }
    // Don't send password
    const { password, ...profile } = seeker;
    res.json({ success: true, profile });
});

// Update Job Seeker Profile
app.put('/api/profile/seeker/:email', (req, res) => {
    const email = req.params.email.toLowerCase();
    const { name, qualification, skills } = req.body;

    const db = readDB();
    const index = db.jobseekers.findIndex(js => js.email === email);
    if (index === -1) {
        return res.status(404).json({ success: false, message: "Job seeker not found." });
    }

    db.jobseekers[index] = {
        ...db.jobseekers[index],
        name: name || db.jobseekers[index].name,
        qualification: qualification !== undefined ? qualification : db.jobseekers[index].qualification,
        skills: skills !== undefined ? skills : db.jobseekers[index].skills
    };

    writeDB(db);
    res.json({ success: true, message: "Profile updated successfully!", profile: db.jobseekers[index] });
});

// Get Company Profile
app.get('/api/profile/company/:email', (req, res) => {
    const email = req.params.email.toLowerCase();
    const db = readDB();
    const company = db.companies.find(c => c.email === email);
    if (!company) {
        return res.status(404).json({ success: false, message: "Company not found." });
    }
    const { password, ...profile } = company;
    res.json({ success: true, profile });
});

// Update Company Profile
app.put('/api/profile/company/:email', (req, res) => {
    const email = req.params.email.toLowerCase();
    const { name, phone, location, industry, about } = req.body;

    const db = readDB();
    const index = db.companies.findIndex(c => c.email === email);
    if (index === -1) {
        return res.status(404).json({ success: false, message: "Company not found." });
    }

    db.companies[index] = {
        ...db.companies[index],
        name: name || db.companies[index].name,
        phone: phone !== undefined ? phone : db.companies[index].phone,
        location: location !== undefined ? location : db.companies[index].location,
        industry: industry !== undefined ? industry : db.companies[index].industry,
        about: about !== undefined ? about : db.companies[index].about
    };

    // Update companyName in active job postings
    if (name) {
        db.jobs.forEach(job => {
            if (job.companyEmail === email) {
                job.companyName = name;
            }
        });
    }

    writeDB(db);
    res.json({ success: true, message: "Company profile updated successfully!", profile: db.companies[index] });
});

// Upload Resume API
app.post('/api/profile/upload-resume', upload.single('resume'), (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Job seeker email is required." });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const db = readDB();
    const seekerEmail = email.toLowerCase();
    const seekerIndex = db.jobseekers.findIndex(js => js.email === seekerEmail);

    if (seekerIndex === -1) {
        return res.status(404).json({ success: false, message: "Job seeker not found." });
    }

    // Save filename to database
    db.jobseekers[seekerIndex].resume = req.file.filename;
    writeDB(db);

    res.json({ 
        success: true, 
        message: "Resume uploaded successfully!", 
        filename: req.file.filename, 
        url: `/uploads/${req.file.filename}` 
    });
});


// --- Jobs APIs ---

// Get All Active Jobs (Supports filtering)
app.get('/api/jobs', (req, res) => {
    const { title, location } = req.query;
    const db = readDB();
    
    let filteredJobs = db.jobs.filter(job => job.status === "Active");

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
});

// Get Specific Job Details
app.get('/api/jobs/:id', (req, res) => {
    const db = readDB();
    const job = db.jobs.find(j => j.id === req.params.id);
    if (!job) {
        return res.status(404).json({ success: false, message: "Job not found." });
    }
    res.json({ success: true, job });
});

// Post New Job (Company only)
app.post('/api/jobs', (req, res) => {
    const { title, companyEmail, companyName, location, salary, type, skills, description, experience } = req.body;
    if (!title || !companyEmail || !companyName || !location || !salary || !type || !description) {
        return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    const db = readDB();
    const newJob = {
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
    };

    db.jobs.push(newJob);
    writeDB(db);

    res.status(201).json({ success: true, message: "Job posted successfully!", job: newJob });
});

// Edit Job
app.put('/api/jobs/:id', (req, res) => {
    const { title, location, salary, type, skills, description, experience, status } = req.body;
    const db = readDB();
    const index = db.jobs.findIndex(j => j.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    db.jobs[index] = {
        ...db.jobs[index],
        title: title || db.jobs[index].title,
        location: location || db.jobs[index].location,
        salary: salary || db.jobs[index].salary,
        type: type || db.jobs[index].type,
        skills: skills !== undefined ? skills : db.jobs[index].skills,
        description: description || db.jobs[index].description,
        experience: experience || db.jobs[index].experience,
        status: status || db.jobs[index].status
    };

    writeDB(db);
    res.json({ success: true, message: "Job details updated successfully!", job: db.jobs[index] });
});

// Delete Job
app.delete('/api/jobs/:id', (req, res) => {
    const db = readDB();
    const jobId = req.params.id;
    const jobIndex = db.jobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) {
        return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    // Remove job
    db.jobs.splice(jobIndex, 1);

    // Also remove applications associated with this job
    db.applications = db.applications.filter(app => app.jobId !== jobId);

    writeDB(db);
    res.json({ success: true, message: "Job vacancy deleted successfully." });
});


// --- Applications APIs ---

// Submit Job Application (Job Seeker only)
app.post('/api/applications', (req, res) => {
    const { jobId, jobTitle, companyEmail, companyName, seekerEmail, seekerName, coverLetter, resume } = req.body;

    if (!jobId || !jobTitle || !companyEmail || !seekerEmail || !seekerName) {
        return res.status(400).json({ success: false, message: "Invalid application details." });
    }

    const db = readDB();

    // Check if already applied
    const alreadyApplied = db.applications.find(
        app => app.jobId === jobId && app.seekerEmail.toLowerCase() === seekerEmail.toLowerCase()
    );

    if (alreadyApplied) {
        return res.status(400).json({ success: false, message: "You have already applied for this job." });
    }

    // Get current seeker's default resume if not overridden in form
    let finalResume = resume;
    if (!finalResume) {
        const seeker = db.jobseekers.find(js => js.email === seekerEmail.toLowerCase());
        if (seeker && seeker.resume) {
            finalResume = seeker.resume;
        }
    }

    const newApp = {
        id: 'app_' + Date.now(),
        jobId,
        jobTitle,
        companyEmail: companyEmail.toLowerCase(),
        companyName,
        seekerEmail: seekerEmail.toLowerCase(),
        seekerName,
        appliedDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'), // DD-MM-YYYY format
        resume: finalResume || "",
        coverLetter: coverLetter || "",
        status: "Pending"
    };

    db.applications.push(newApp);
    writeDB(db);

    res.status(201).json({ success: true, message: "Application submitted successfully!", application: newApp });
});

// Get Applications for a Seeker
app.get('/api/applications/seeker/:email', (req, res) => {
    const email = req.params.email.toLowerCase();
    const db = readDB();
    const seekerApps = db.applications.filter(app => app.seekerEmail === email);
    res.json({ success: true, applications: seekerApps });
});

// Get Applications for a Company
app.get('/api/applications/company/:email', (req, res) => {
    const email = req.params.email.toLowerCase();
    const db = readDB();
    const companyApps = db.applications.filter(app => app.companyEmail === email);
    res.json({ success: true, applications: companyApps });
});

// Update Application Status (Accept / Reject)
app.patch('/api/applications/:id/status', (req, res) => {
    const { status } = req.body;
    if (!status || !['Pending', 'Selected', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid application status." });
    }

    const db = readDB();
    const index = db.applications.findIndex(app => app.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ success: false, message: "Application not found." });
    }

    db.applications[index].status = status;
    writeDB(db);

    res.json({ success: true, message: `Application state updated to ${status}.`, application: db.applications[index] });
});

// System Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: "Smart Job Vacancy Finder API is online!" });
});


// Redirect any unmatched route to index.html (optional frontend fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` SERVER RUNNING: http://localhost:${PORT} `);
    console.log(` DATABASE PERSISTED: ${DB_PATH} `);
    console.log(`==================================================`);
});
