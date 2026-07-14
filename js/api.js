// Centralized API and Session Manager for Smart Job Vacancy Finder

// ============================================================
// 🚀 DEPLOYMENT CONFIGURATION
// We now deploy both frontend and backend to Netlify
// ============================================================

// Auto-detect API base URL:
// - On Netlify (https://...) → use /api (which maps to /.netlify/functions/api)
// - On localhost or file:// → use local server
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.protocol === 'file:';

const API_BASE = isLocal
    ? 'http://localhost:5000/api'
    : '/api';

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

// Open or download resume safely (Blob URL or fallback path)
window.viewResume = function(resumeData) {
    if (!resumeData) {
        showToast("No resume file available.", "error");
        return;
    }

    try {
        if (resumeData.startsWith('data:')) {
            // Convert Base64 → Blob → Blob URL → open with <a> click
            const [header, base64] = resumeData.split(',');
            const mime = header.match(/:(.*?);/)[1];
            const bytes = atob(base64);
            const arr = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) {
                arr[i] = bytes.charCodeAt(i);
            }
            const blob = new Blob([arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Revoke after a short delay to allow tab to open
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        } else {
            // Fallback for filename or relative path
            const isLocal = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.protocol === 'file:';
            const base = isLocal ? 'http://localhost:5000' : '';
            window.open(base + '/uploads/' + resumeData, '_blank');
        }
    } catch(e) {
        console.error('Resume view error:', e);
        showToast('Could not open resume. Try uploading again.', 'error');
    }
};

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

// ============================================================
// 🌙 THEME MANAGER — Dark / Light Mode
// ============================================================

const Theme = {
    KEY: 'sjvf_theme',

    get() {
        return localStorage.getItem(this.KEY) || 'light';
    },

    set(mode) {
        localStorage.setItem(this.KEY, mode);
        document.documentElement.setAttribute('data-theme', mode);
        document.body.setAttribute('data-theme', mode);
        this._updateIcon(mode);
    },

    toggle() {
        const next = this.get() === 'dark' ? 'light' : 'dark';
        this.set(next);
    },

    // Apply saved theme immediately (called before DOMContentLoaded to prevent FOUC)
    applyEarly() {
        const saved = localStorage.getItem(this.KEY) || 'light';
        document.documentElement.setAttribute('data-theme', saved);
    },

    _updateIcon(mode) {
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            const sun  = btn.querySelector('.icon-sun');
            const moon = btn.querySelector('.icon-moon');
            if (sun)  sun.style.opacity  = mode === 'dark' ? '0'   : '1';
            if (moon) moon.style.opacity = mode === 'dark' ? '1'   : '0';
        });
    },

    // Inject toggle button into any navbar right before logout button
    injectToggleButton() {
        // Avoid double-injection
        if (document.querySelector('.theme-toggle-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'theme-toggle-btn me-2';
        btn.setAttribute('id', 'themeToggleBtn');
        btn.setAttribute('title', 'Toggle Dark / Light Mode');
        btn.setAttribute('aria-label', 'Toggle theme');
        btn.innerHTML = `
            <i class="bi bi-sun-fill icon-sun"></i>
            <i class="bi bi-moon-fill icon-moon"></i>
        `;
        btn.addEventListener('click', () => this.toggle());

        // Try to insert before logout button in navbar
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn && logoutBtn.parentElement) {
            logoutBtn.parentElement.insertBefore(btn, logoutBtn);
        } else {
            // Fallback: fixed position corner button
            btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9998;width:48px;height:48px;border-radius:50%;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
            document.body.appendChild(btn);
        }

        // Apply correct icon state on inject
        this._updateIcon(this.get());
    },

    init() {
        this.applyEarly();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.injectToggleButton());
        } else {
            this.injectToggleButton();
        }
    }
};

// Apply theme before anything renders to avoid flash of wrong theme
Theme.applyEarly();

// Initialize fully on load
Theme.init();

// Expose globally
window.Theme = Theme;
