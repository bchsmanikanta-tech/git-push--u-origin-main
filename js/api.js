// Centralized API and Session Manager for Smart Job Vacancy Finder

// Safe Storage fallback for environments where localStorage is blocked (e.g. file:// protocol or private browsing)
const SafeStorage = {
    _memoryStore: {},
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return this._memoryStore[key] || null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            this._memoryStore[key] = String(value);
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            delete this._memoryStore[key];
        }
    }
};

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
            const data = SafeStorage.getItem('user');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },
    
    setUser(user) {
        try {
            SafeStorage.setItem('user', JSON.stringify(user));
        } catch (e) {
            console.error('Failed to set user session', e);
        }
    },
    
    clear() {
        try {
            SafeStorage.removeItem('user');
        } catch (e) {
            console.error('Failed to clear session', e);
        }
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
        },
        async uploadCertificate(fileObj) {
            const formData = new FormData();
            formData.append('certificate', fileObj);

            return apiRequest('/profile/upload-certificate', {
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
            if (filters.type) params.append('type', filters.type);
            if (filters.experience) params.append('experience', filters.experience);
            if (filters.minSalary) params.append('minSalary', filters.minSalary);
            if (filters.companyEmail) params.append('companyEmail', filters.companyEmail);
            if (filters.page) params.append('page', filters.page);
            if (filters.limit) params.append('limit', filters.limit);
            
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
        async get(id) {
            return apiRequest(`/applications/${id}`);
        },
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
    },

    // Saved Jobs endpoints
    savedJobs: {
        async list(email) {
            return apiRequest(`/saved-jobs/${email}`);
        },
        async add(email, jobId) {
            return apiRequest('/saved-jobs', {
                method: 'POST',
                body: { email, jobId }
            });
        },
        async remove(email, jobId) {
            return apiRequest('/saved-jobs', {
                method: 'DELETE',
                body: { email, jobId }
            });
        }
    },

    // User Notifications endpoints
    notifications: {
        async list(email) {
            return apiRequest(`/notifications/${email}`);
        },
        async markRead(id) {
            return apiRequest(`/notifications/${id}/read`, {
                method: 'PUT'
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
        return SafeStorage.getItem(this.KEY) || 'light';
    },

    set(mode) {
        SafeStorage.setItem(this.KEY, mode);
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
        const saved = SafeStorage.getItem(this.KEY) || 'light';
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

// ============================================================
// 🔔 NOTIFICATIONS MANAGER — In-App live dropdowns
// ============================================================

const NotificationsManager = {
    injectNotifications() {
        const user = Session.getUser();
        if (!user || !user.email) return;

        if (document.querySelector('.notification-dropdown-wrapper')) return;

        // Find navbar container
        const navRight = document.querySelector('.navbar-custom .container > div') || document.querySelector('.navbar-custom .container');
        if (!navRight) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'notification-dropdown-wrapper d-inline-block me-3 position-relative';
        wrapper.innerHTML = `
            <button class="btn btn-outline-primary rounded-circle position-relative p-2" id="notifBellBtn" data-bs-toggle="dropdown" aria-expanded="false" style="width:40px; height:40px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                <i class="bi bi-bell-fill"></i>
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" id="notifBadge" style="font-size: 9px; padding: 3px 6px;">0</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow p-2" aria-labelledby="notifBellBtn" id="notifDropdownList" style="width: 320px; max-height: 400px; overflow-y: auto; border-radius: 12px; background: var(--bg-card); border-color: var(--border-color);">
                <li class="dropdown-header border-bottom pb-2 mb-2 d-flex justify-content-between align-items-center">
                    <span class="fw-bold" style="color: var(--text-primary) !important;">Notifications</span>
                </li>
                <div id="notifItemsContainer">
                    <li class="text-center py-3 text-secondary small">No notifications yet</li>
                </div>
            </ul>
        `;

        const themeBtn = document.getElementById('themeToggleBtn') || document.querySelector('.btn-logout');
        if (themeBtn) {
            themeBtn.parentNode.insertBefore(wrapper, themeBtn);
        } else {
            navRight.appendChild(wrapper);
        }

        this.loadNotifications();
        setInterval(() => this.loadNotifications(), 15000);
    },

    async loadNotifications() {
        const user = Session.getUser();
        if (!user || !user.email) return;

        try {
            const res = await API.notifications.list(user.email);
            const notifications = res.notifications || [];
            
            const badge = document.getElementById('notifBadge');
            const container = document.getElementById('notifItemsContainer');
            if (!container) return;

            const unreadCount = notifications.filter(n => !n.isRead).length;
            if (unreadCount > 0) {
                badge.innerText = unreadCount;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }

            if (notifications.length === 0) {
                container.innerHTML = `<li class="text-center py-3 text-secondary small" style="color: var(--text-muted) !important;">No notifications yet</li>`;
                return;
            }

            container.innerHTML = notifications.map(n => `
                <li class="p-2 mb-1 rounded position-relative notif-item ${n.isRead ? 'opacity-75' : 'fw-semibold border-start border-primary border-3'}" 
                    style="cursor: pointer; transition: background 0.2s; background: ${n.isRead ? 'transparent' : 'rgba(79, 70, 229, 0.05)'}; list-style: none;" 
                    data-id="${n.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <span class="small d-block text-wrap" style="max-width: 250px; font-size: 13px; color: var(--text-primary);">${n.message}</span>
                        ${!n.isRead ? `<span class="badge bg-primary rounded-circle p-1" style="width:6px; height:6px; margin-top: 4px;"> </span>` : ''}
                    </div>
                    <span class="x-small text-muted d-block mt-1" style="font-size: 10px; color: var(--text-muted) !important;">${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </li>
            `).join('');

            container.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const notifId = item.dataset.id;
                    const notifObj = notifications.find(n => n.id === notifId);
                    if (notifObj && !notifObj.isRead) {
                        try {
                            await API.notifications.markRead(notifId);
                            this.loadNotifications();
                        } catch (err) {
                            console.error("Mark read failed:", err);
                        }
                    }
                });
            });

        } catch (err) {
            console.error("Failed to load notifications:", err);
        }
    }
};

Theme.applyEarly();

// Initialize fully on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Theme.injectToggleButton();
        NotificationsManager.injectNotifications();
    });
} else {
    Theme.injectToggleButton();
    NotificationsManager.injectNotifications();
}

// Expose globally
window.Theme = Theme;
window.NotificationsManager = NotificationsManager;
