// Centralized API and Session Manager for Smart Job Vacancy Finder

// ============================================================
// 🚀 DEPLOYMENT CONFIGURATION
// After deploying the backend on Render.com, paste your 
// Render URL below (e.g. https://smart-job-finder.onrender.com)
// ============================================================
const RENDER_BACKEND_URL = 'https://YOUR-APP-NAME.onrender.com';

// Auto-detect API base URL:
// - On Netlify (https://...) → use Render backend URL
// - On localhost or file:// → use local server
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.protocol === 'file:';

const API_BASE = isLocal
    ? 'http://localhost:5000/api'
    : `${RENDER_BACKEND_URL}/api`;

// Show a server-offline banner if we detect file:// protocol (user hasn't started server)
if (window.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#ef4444;color:white;text-align:center;padding:10px 20px;font-weight:600;z-index:99999;font-family:Outfit,sans-serif;font-size:14px;';
        banner.innerHTML = '⚠️ You are opening this page directly as a file. Please start the server first: <code style="background:rgba(0,0,0,0.2);padding:2px 8px;border-radius:4px;">npm start</code> in the project folder, then visit <a href="http://localhost:5000" style="color:white;text-decoration:underline;">http://localhost:5000</a>';
        document.body.prepend(banner);
    });
}

// Create and insert Toast container if not already present
function ensureToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
}

// Show custom toast notification
function showToast(message, type = 'success') {
    ensureToastContainer();
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let icon = 'bi-check-circle-fill';
    if (type === 'error') icon = 'bi-exclamation-triangle-fill';
    if (type === 'info') icon = 'bi-info-circle-fill';

    toast.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi ${icon} fs-5"></i>
            <span class="custom-toast-content">${message}</span>
        </div>
        <button type="button" class="btn-close ms-3" style="font-size: 10px;" onclick="this.parentElement.remove()"></button>
    `;

    container.appendChild(toast);

    // Auto remove after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Session Helpers
const Session = {
    getUser() {
        try {
            const data = localStorage.getItem('user');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },
    
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    
    clear() {
        localStorage.removeItem('user');
    },

    logout() {
        this.clear();
        showToast("Logged out successfully!", "info");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    },

    checkAuth(requiredRole) {
        const user = this.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return null;
        }
        if (requiredRole && user.role !== requiredRole) {
            window.location.href = user.role === 'seeker' ? 'jobseeker-dashboard.html' : 'company-dashboard.html';
            return null;
        }
        return user;
    }
};

// API Fetch Helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Set headers if JSON request
    if (options.body && !(options.body instanceof FormData)) {
        options.headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        showToast(error.message || 'Network error occurred.', 'error');
        throw error;
    }
}

// API client modules
const API = {
    // Auth endpoints
    auth: {
        async registerSeeker(name, email, password) {
            return apiRequest('/auth/register-seeker', {
                method: 'POST',
                body: { name, email, password }
            });
        },
        async loginSeeker(email, password) {
            return apiRequest('/auth/login-seeker', {
                method: 'POST',
                body: { email, password }
            });
        },
        async registerCompany(name, email, password) {
            return apiRequest('/auth/register-company', {
                method: 'POST',
                body: { name, email, password }
            });
        },
        async loginCompany(email, password) {
            return apiRequest('/auth/login-company', {
                method: 'POST',
                body: { email, password }
            });
        }
    },

    // Profile endpoints
    profile: {
        async getSeeker(email) {
            return apiRequest(`/profile/seeker/${email}`);
        },
        async updateSeeker(email, data) {
            return apiRequest(`/profile/seeker/${email}`, {
                method: 'PUT',
                body: data
            });
        },
        async getCompany(email) {
            return apiRequest(`/profile/company/${email}`);
        },
        async updateCompany(email, data) {
            return apiRequest(`/profile/company/${email}`, {
                method: 'PUT',
                body: data
            });
        },
        async uploadResume(email, fileObj) {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('resume', fileObj);

            return apiRequest('/profile/upload-resume', {
                method: 'POST',
                body: formData
            });
        }
    },

    // Jobs endpoints
    jobs: {
        async getAll(filters = {}) {
            const params = new URLSearchParams();
            if (filters.title) params.append('title', filters.title);
            if (filters.location) params.append('location', filters.location);
            
            const queryStr = params.toString() ? `?${params.toString()}` : '';
            return apiRequest(`/jobs${queryStr}`);
        },
        async get(id) {
            return apiRequest(`/jobs/${id}`);
        },
        async create(data) {
            return apiRequest('/jobs', {
                method: 'POST',
                body: data
            });
        },
        async update(id, data) {
            return apiRequest(`/jobs/${id}`, {
                method: 'PUT',
                body: data
            });
        },
        async delete(id) {
            return apiRequest(`/jobs/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // Applications endpoints
    applications: {
        async submit(data) {
            return apiRequest('/applications', {
                method: 'POST',
                body: data
            });
        },
        async getForSeeker(email) {
            return apiRequest(`/applications/seeker/${email}`);
        },
        async getForCompany(email) {
            return apiRequest(`/applications/company/${email}`);
        },
        async updateStatus(id, status) {
            return apiRequest(`/applications/${id}/status`, {
                method: 'PATCH',
                body: { status }
            });
        }
    }
};

// Global exports so HTML templates can access easily
window.API = API;
window.Session = Session;
window.showToast = showToast;

// Hook up logout button automatically if present
document.addEventListener('DOMContentLoaded', () => {
    ensureToastContainer();
    const logoutBtn = document.querySelector('.btn-logout, a[href="index.html"].btn-light, .btn-light[href="index.html"]');
    if (logoutBtn) {
        // Change simple href navigation to actual session logout
        logoutBtn.removeAttribute('href');
        logoutBtn.style.cursor = 'pointer';
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Session.logout();
        });
    }
});
