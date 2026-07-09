# Smart Job Vacancy Finder

A full-stack web application for connecting job seekers with companies. Built with **Node.js**, **Express**, and vanilla **HTML/CSS/JavaScript**.

## Features

### Job Seeker
- Register & Login
- Search & filter job vacancies
- View full job details
- Apply online with resume upload & cover letter
- Track application statuses (Pending / Selected / Rejected)
- Manage profile & resume

### Company
- Register & Login
- Post new job vacancies
- Manage & edit posted jobs
- View all candidate applications
- Accept or Reject applicants
- Manage company profile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | JSON File Store (`data/db.json`) |
| File Uploads | Multer |
| Frontend | HTML5, Vanilla CSS, Bootstrap 5 |
| Icons | Bootstrap Icons |
| Fonts | Google Fonts (Outfit) |

## Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or above

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/smart-job-vacancy-finder.git

# 2. Navigate to the project directory
cd smart-job-vacancy-finder

# 3. Install dependencies
npm install

# 4. Start the server
npm start
```

Open your browser and visit: **http://localhost:5000**

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Job Seeker | `rahul@gmail.com` | `password` |
| Company | `abc@gmail.com` | `password` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Health check |
| POST | `/api/auth/register-seeker` | Register job seeker |
| POST | `/api/auth/login-seeker` | Login job seeker |
| POST | `/api/auth/register-company` | Register company |
| POST | `/api/auth/login-company` | Login company |
| GET | `/api/jobs` | Get all active jobs |
| GET | `/api/jobs/:id` | Get job details |
| POST | `/api/jobs` | Post new job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| GET | `/api/applications/seeker/:email` | Get seeker's applications |
| GET | `/api/applications/company/:email` | Get company's applications |
| POST | `/api/applications` | Submit application |
| PATCH | `/api/applications/:id/status` | Update application status |
| POST | `/api/profile/upload-resume` | Upload resume file |

## Project Structure

```
smart-job-vacancy-finder/
├── data/
│   └── db.json              # JSON file database
├── uploads/                 # Uploaded resume files
├── js/
│   └── api.js               # Client-side API + session manager
├── server.js                # Express backend server
├── style.css                # Global premium stylesheet
├── index.html               # Landing page (role selector)
├── jobseeker-login.html
├── jobseeker-register.html
├── jobseeker-dashboard.html
├── jobs.html
├── job-details.html
├── apply-jobs.html
├── my-applications.html
├── resume-upload.html
├── jobseeker-profile.html
├── company-login.html
├── company-register.html
├── company-dashboard.html
├── post-job.html
├── manage-jobs.html
├── applicants.html
├── company-profile.html
└── package.json
```

## Deployment

This app can be hosted on **Railway**, **Render**, or any Node.js-compatible hosting platform.

> **Note:** The app uses a local JSON file as its database. On cloud platforms, uploaded resume files and database changes **may not persist** between deployments unless a persistent disk or external database is attached.
