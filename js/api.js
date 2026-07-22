// Centralized API and Session Manager for Smart Job Vacancy Finder

const SafeStorage = {
    _memoryStore: {},
    isPersistent: true,
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            this.isPersistent = false;
            return this._memoryStore[key] || null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            this.isPersistent = false;
            this._memoryStore[key] = String(value);
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            this.isPersistent = false;
            delete this._memoryStore[key];
        }
    }
};

try {
    localStorage.setItem('__sjvf_test__', '1');
    localStorage.removeItem('__sjvf_test__');
} catch (e) {
    SafeStorage.isPersistent = false;
}

// Session auto-restoration from URL parameters
(function() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlEmail = urlParams.get('session_email');
        const urlName = urlParams.get('session_name');
        const urlRole = urlParams.get('session_role');
        if (urlEmail && urlName && urlRole) {
            const user = { name: urlName, email: urlEmail, role: urlRole };
            SafeStorage.setItem('user', JSON.stringify(user));
            if (SafeStorage.isPersistent) {
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('session_email');
                    url.searchParams.delete('session_name');
                    url.searchParams.delete('session_role');
                    window.history.replaceState({}, document.title, url.pathname + url.search);
                } catch (e) {}
            }
        }
    } catch (e) {}
})();

// API BASE URL CONFIGURATION
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.protocol === 'file:';

const API_BASE = isLocal
    ? 'http://localhost:5000/api'
    : '/api';

if (window.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#ef4444;color:white;text-align:center;padding:10px 20px;font-weight:600;z-index:99999;font-family:Outfit,sans-serif;font-size:14px;';
        banner.innerHTML = '⚠️ You are opening this page directly as a file. Please start the server first: <code style="background:rgba(0,0,0,0.2);padding:2px 8px;border-radius:4px;">npm start</code>, then visit <a href="http://localhost:5000" style="color:white;text-decoration:underline;">http://localhost:5000</a>';
        document.body.prepend(banner);
    });
}

// Toast Notifications Helper
function ensureToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
}

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
        } catch (e) {}
    },
    clear() {
        try {
            SafeStorage.removeItem('user');
        } catch (e) {}
    },
    logout() {
        this.clear();
        showToast("Logged out successfully!", "info");
        setTimeout(() => {
            this.redirect('index.html');
        }, 1000);
    },
    checkAuth(requiredRole) {
        const user = this.getUser();
        if (!user) {
            this.redirect('index.html');
            return null;
        }
        if (requiredRole && user.role !== requiredRole) {
            if (user.role === 'seeker') {
                this.redirect('jobseeker-dashboard.html');
            } else if (user.role === 'company') {
                this.redirect('company-dashboard.html');
            } else {
                this.redirect('index.html');
            }
            return null;
        }
        return user;
    },
    redirect(targetUrl) {
        const user = this.getUser();
        if (user) {
            const sep = targetUrl.includes('?') ? '&' : '?';
            window.location.href = `${targetUrl}${sep}session_email=${encodeURIComponent(user.email)}&session_name=${encodeURIComponent(user.name)}&session_role=${encodeURIComponent(user.role)}`;
        } else {
            window.location.href = targetUrl;
        }
    }
};

// API Fetch Wrapper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    options.signal = controller.signal;
    
    if (options.body && !(options.body instanceof FormData)) {
        options.headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        
        let data;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const rawText = await response.text();
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                data = { success: response.ok, message: rawText || 'Non-JSON server response' };
            }
        }
        
        if (!response.ok) {
            throw new Error(data.message || 'Server request failed');
        }
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`API Error [${endpoint}]:`, error.message);
        
        if (error.name === 'AbortError') {
            showToast('⚠️ Request timed out. Backend server reconnecting.', 'warning');
        } else if (error.message && error.message.includes('Failed to fetch')) {
            showToast('⚠️ Server reconnecting. Please ensure npm start is running.', 'warning');
        } else if (!error.message.includes('Unexpected token')) {
            showToast(error.message || 'Network notice.', 'info');
        }
        throw error;
    }
}

// API Endpoints Client Object
const API = {
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
        },
        async loginAdmin(email, password) {
            return apiRequest('/admin/auth/login', {
                method: 'POST',
                body: { email, password }
            });
        }
    },

    admin: {
        async getDashboardStats() {
            return apiRequest('/admin/dashboard/stats');
        },
        async getDiagnostics() {
            return apiRequest('/admin/system-diagnostics');
        },
        async getBackup() {
            return apiRequest('/admin/system-backup');
        },
        async getUsers() {
            return apiRequest('/admin/users');
        },
        async updateUserStatus(email, role, status) {
            return apiRequest('/admin/users/status', {
                method: 'PATCH',
                body: { email, role, status }
            });
        },
        async deleteUser(email, role) {
            return apiRequest('/admin/users', {
                method: 'DELETE',
                body: { email, role }
            });
        },
        async getJobs() {
            return apiRequest('/admin/jobs');
        },
        async updateJobStatus(id, status) {
            return apiRequest(`/admin/jobs/${id}/status`, {
                method: 'PATCH',
                body: { status }
            });
        },
        async toggleJobFeatured(id) {
            return apiRequest(`/admin/jobs/${id}/featured`, {
                method: 'PATCH'
            });
        },
        async updateJob(id, data) {
            return apiRequest(`/admin/jobs/${id}`, {
                method: 'PUT',
                body: data
            });
        },
        async deleteJob(id) {
            return apiRequest(`/admin/jobs/${id}`, {
                method: 'DELETE'
            });
        },
        async bulkJobAction(action, ids) {
            return apiRequest('/admin/jobs/bulk', {
                method: 'POST',
                body: { action, ids }
            });
        },
        async getAnalyticsOverview() {
            return apiRequest('/admin/analytics/overview');
        },
        async exportAnalyticsSummary() {
            return apiRequest('/admin/analytics/export-summary');
        },
        async getAuditLogs() {
            return apiRequest('/admin/audit-logs');
        },
        async createAuditLog(data) {
            return apiRequest('/admin/audit-logs', {
                method: 'POST',
                body: data
            });
        },
        async sendBroadcast(data) {
            return apiRequest('/admin/broadcast', {
                method: 'POST',
                body: data
            });
        },
        async getSettings() {
            return apiRequest('/admin/settings');
        },
        async saveSettings(data) {
            return apiRequest('/admin/settings', {
                method: 'POST',
                body: data
            });
        }
    },

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

    savedJobs: {
        async toggle(email, jobId) {
            return apiRequest('/jobs/save-toggle', {
                method: 'POST',
                body: { email, jobId }
            });
        },
        async get(email) {
            return apiRequest(`/jobs/saved/${encodeURIComponent(email)}`);
        },
        async list(email) {
            return apiRequest(`/jobs/saved/${encodeURIComponent(email)}`);
        },
        async add(email, jobId) {
            return apiRequest('/jobs/save-toggle', {
                method: 'POST',
                body: { email, jobId }
            });
        },
        async remove(email, jobId) {
            return apiRequest('/jobs/save-toggle', {
                method: 'POST',
                body: { email, jobId }
            });
        }
    },

    ai: {
        async getMatchScore(jobId, seekerEmail) {
            return apiRequest('/ai/match-score', {
                method: 'POST',
                body: { jobId, seekerEmail }
            });
        },
        async getCareerRoadmap(targetRole, skills, qualification) {
            return apiRequest('/ai/career-roadmap', {
                method: 'POST',
                body: { targetRole, skills, qualification }
            });
        },
        async getMockInterview(jobTitle, experience) {
            return apiRequest('/ai/mock-interview', {
                method: 'POST',
                body: { jobTitle, experience }
            });
        },
        async analyzeATSResume(resumeText, jobDescription, targetRole) {
            return apiRequest('/ai/resume-ats-analyze', {
                method: 'POST',
                body: { resumeText, jobDescription, targetRole }
            });
        }
    },

    reviews: {
        async create(data) {
            return apiRequest('/companies/reviews', {
                method: 'POST',
                body: data
            });
        },
        async getForCompany(companyEmail) {
            return apiRequest(`/companies/reviews/${encodeURIComponent(companyEmail)}`);
        }
    },

    insights: {
        async getSalaryEstimator(title = '', location = '') {
            const params = new URLSearchParams();
            if (title) params.append('title', title);
            if (location) params.append('location', location);
            const queryStr = params.toString() ? `?${params.toString()}` : '';
            return apiRequest(`/insights/salary-estimator${queryStr}`);
        },
        async getSalaryBenchmark(role = '', location = '', experience = '') {
            const params = new URLSearchParams();
            if (role) params.append('role', role);
            if (location) params.append('location', location);
            if (experience) params.append('experience', experience);
            const queryStr = params.toString() ? `?${params.toString()}` : '';
            return apiRequest(`/insights/salary-benchmark${queryStr}`);
        }
    },

    seeker: {
        async getPipeline(email) {
            return apiRequest(`/seeker/pipeline/${encodeURIComponent(email)}`);
        },
        async updatePipelineStatus(applicationId, status) {
            return apiRequest('/seeker/pipeline/status', {
                method: 'PATCH',
                body: { applicationId, status }
            });
        }
    },

    employer: {
        async getCandidateRankings(companyEmail, jobId = '') {
            const endpoint = `/employer/candidate-rankings/${encodeURIComponent(companyEmail)}${jobId ? '?jobId=' + encodeURIComponent(jobId) : ''}`;
            return apiRequest(endpoint);
        }
    },

    chat: {
        async sendMessage(senderEmail, receiverEmail, message) {
            return apiRequest('/chat/send', {
                method: 'POST',
                body: { senderEmail, receiverEmail, message }
            });
        },
        async getHistory(user1, user2) {
            return apiRequest(`/chat/history?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`);
        }
    },

    interviews: {
        async schedule(data) {
            return apiRequest('/interviews/schedule', {
                method: 'POST',
                body: data
            });
        },
        async getByUser(email) {
            return apiRequest(`/interviews/${encodeURIComponent(email)}`);
        }
    },

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
        async getForCompany(email, jobId) {
            let endpoint = `/applications/company/${email}`;
            if (jobId) endpoint += `?jobId=${encodeURIComponent(jobId)}`;
            return apiRequest(endpoint);
        },
        async updateStatus(id, status) {
            return apiRequest(`/applications/${id}/status`, {
                method: 'PATCH',
                body: { status }
            });
        }
    },

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

    notifications: {
        async list(email) {
            return apiRequest(`/notifications/${email}`);
        },
        async markRead(id) {
            return apiRequest(`/notifications/${id}/read`, {
                method: 'PUT'
            });
        },
        async delete(id) {
            return apiRequest(`/notifications/${id}`, {
                method: 'DELETE'
            });
        },
        async clearAll(email) {
            return apiRequest(`/notifications/clear/${encodeURIComponent(email)}`, {
                method: 'DELETE'
            });
        }
    }
};

window.API = API;
window.Session = Session;
window.showToast = showToast;

window.viewResume = function(resumeData) {
    if (!resumeData) {
        showToast("No resume file available.", "error");
        return;
    }
    try {
        if (resumeData.startsWith('data:')) {
            const [header, base64] = resumeData.split(',');
            const mime = header.match(/:(.*?);/)[1];
            const bytes = atob(base64);
            const arr = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
            const blob = new Blob([arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        } else {
            const isLocal = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.protocol === 'file:';
            const base = isLocal ? 'http://localhost:5000' : '';
            window.open(base + '/uploads/' + resumeData, '_blank');
        }
    } catch(e) {
        console.error('Resume view error:', e);
        showToast('Could not open resume.', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ensureToastContainer();
    const logoutBtn = document.querySelector('.btn-logout, a[href="index.html"].btn-light, .btn-light[href="index.html"]');
    if (logoutBtn) {
        logoutBtn.removeAttribute('href');
        logoutBtn.style.cursor = 'pointer';
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Session.logout();
        });
    }
});

// Theme Manager
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
    injectToggleButton() {
        if (document.querySelector('.theme-toggle-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'theme-toggle-btn me-2';
        btn.setAttribute('id', 'themeToggleBtn');
        btn.setAttribute('title', 'Toggle Dark / Light Mode');
        btn.setAttribute('aria-label', 'Toggle theme');
        btn.innerHTML = `<i class="bi bi-sun-fill icon-sun"></i><i class="bi bi-moon-fill icon-moon"></i>`;
        btn.addEventListener('click', () => this.toggle());

        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn && logoutBtn.parentElement) {
            logoutBtn.parentElement.insertBefore(btn, logoutBtn);
        } else {
            btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9998;width:48px;height:48px;border-radius:50%;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
            document.body.appendChild(btn);
        }
        this._updateIcon(this.get());
    }
};

// Notification Dropdown Manager
const NotificationsManager = {
    injectNotifications() {
        let user = Session.getUser();
        if (!user || !user.email) {
            try {
                user = JSON.parse(localStorage.getItem('adminUser') || 'null');
            } catch(e) {}
        }
        if (!user || !user.email) return;

        let wrapper = document.querySelector('.notification-dropdown-wrapper');
        if (!wrapper) {
            const navRight = document.querySelector('.admin-topbar > div:last-child')
                || document.querySelector('.navbar-custom .container > div') 
                || document.querySelector('.navbar-custom .container')
                || document.querySelector('.navbar .container > div')
                || document.querySelector('.navbar .container')
                || document.querySelector('nav .container');
            if (!navRight) return;

            wrapper = document.createElement('div');
            wrapper.className = 'notification-dropdown-wrapper d-inline-block me-3 position-relative';
            wrapper.innerHTML = `
                <button class="btn btn-outline-primary rounded-circle position-relative p-2" id="notifBellBtn" aria-expanded="false" style="width:40px; height:40px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
                    <i class="bi bi-bell-fill"></i>
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" id="notifBadge" style="font-size: 9px; padding: 3px 6px;">0</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow p-2" aria-labelledby="notifBellBtn" id="notifDropdownList">
                    <li class="dropdown-header border-bottom pb-2 mb-2 d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-dark" style="color: var(--text-primary) !important;"><i class="bi bi-bell-fill me-1 text-primary"></i>Notifications</span>
                        <button class="btn btn-link text-danger text-decoration-none p-0 x-small" id="clearAllNotifsBtn" style="font-size: 11px; font-weight: 600;">Clear All</button>
                    </li>
                    <div id="notifItemsContainer">
                        <li class="text-center py-3 text-secondary small">No notifications yet</li>
                    </div>
                </ul>
            `;

            const themeBtn = document.getElementById('themeToggleBtn') || document.querySelector('.btn-logout');
            if (themeBtn && themeBtn.parentNode) {
                themeBtn.parentNode.insertBefore(wrapper, themeBtn);
            } else {
                navRight.appendChild(wrapper);
            }
        }

        if (wrapper.dataset.initialized) return;
        wrapper.dataset.initialized = 'true';

        const bellBtn = wrapper.querySelector('#notifBellBtn');
        const dropdownList = wrapper.querySelector('#notifDropdownList');
        const clearBtn = wrapper.querySelector('#clearAllNotifsBtn');

        if (clearBtn) {
            clearBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const currentUser = Session.getUser() || JSON.parse(localStorage.getItem('adminUser') || 'null');
                    if (currentUser && currentUser.email) {
                        await API.notifications.clearAll(currentUser.email);
                        showToast('All notifications cleared.', 'info');
                        this.loadNotifications();
                    }
                } catch (err) {
                    console.error("Failed to clear notifications:", err);
                }
            });
        }

        if (bellBtn && dropdownList) {
            bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isShown = dropdownList.classList.contains('show');
                document.querySelectorAll('.notification-dropdown-wrapper .dropdown-menu').forEach(el => {
                    if (el !== dropdownList) el.classList.remove('show');
                });
                if (isShown) {
                    dropdownList.classList.remove('show');
                    bellBtn.setAttribute('aria-expanded', 'false');
                } else {
                    dropdownList.classList.add('show');
                    bellBtn.setAttribute('aria-expanded', 'true');
                }
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    dropdownList.classList.remove('show');
                    bellBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        this.loadNotifications();
        setInterval(() => this.loadNotifications(), 15000);
    },

    async loadNotifications() {
        let user = Session.getUser();
        if (!user || !user.email) {
            try {
                user = JSON.parse(localStorage.getItem('adminUser') || 'null');
            } catch(e) {}
        }
        if (!user || !user.email) return;
        const email = user.email.trim().toLowerCase();

        try {
            const res = await API.notifications.list(email);
            const notifications = res.notifications || [];
            const badge = document.getElementById('notifBadge');
            const container = document.getElementById('notifItemsContainer');
            if (!container) return;

            const unreadCount = notifications.filter(n => !n.isRead).length;
            if (unreadCount > 0) {
                badge.innerText = unreadCount;
                badge.classList.remove('d-none');
                badge.classList.add('notif-badge-pulse');
            } else {
                badge.classList.add('d-none');
                badge.classList.remove('notif-badge-pulse');
            }

            if (notifications.length === 0) {
                container.innerHTML = `<li class="text-center py-3 text-secondary small" style="color: var(--text-muted) !important;">No notifications yet</li>`;
                return;
            }

            const formatTime = (dateVal) => {
                if (!dateVal) return 'Recently';
                const d = new Date(dateVal);
                return isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            container.innerHTML = notifications.map(n => `
                <li class="p-2 mb-1 rounded position-relative notif-item ${n.isRead ? 'opacity-75' : 'fw-semibold border-start border-primary border-3'}" 
                    style="cursor: pointer; transition: background 0.2s; background: ${n.isRead ? 'transparent' : 'rgba(79, 70, 229, 0.05)'}; list-style: none;" 
                    data-id="${n.id || n._id}">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <span class="small d-block text-wrap flex-grow-1" style="font-size: 13px; color: var(--text-primary);">${n.message}</span>
                        <div class="d-flex align-items-center gap-1">
                            ${!n.isRead ? `<span class="badge bg-primary rounded-circle p-1" style="width:6px; height:6px;"> </span>` : ''}
                            <button type="button" class="btn-close delete-notif-btn ms-1" style="font-size: 8px; flex-shrink: 0;" data-id="${n.id || n._id}" title="Delete notification" aria-label="Delete"></button>
                        </div>
                    </div>
                    <span class="x-small text-muted d-block mt-1" style="font-size: 10px; color: var(--text-muted) !important;">${formatTime(n.createdAt)}</span>
                </li>
            `).join('');

            container.querySelectorAll('.delete-notif-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const notifId = btn.dataset.id;
                    try {
                        await API.notifications.delete(notifId);
                        showToast('Notification deleted.', 'info');
                        this.loadNotifications();
                    } catch (err) {
                        console.error("Failed to delete notification:", err);
                    }
                });
            });

            container.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    if (e.target.classList.contains('delete-notif-btn')) return;
                    const notifId = item.dataset.id;
                    const notifObj = notifications.find(n => (n.id || n._id) === notifId);
                    if (notifObj && !notifObj.isRead) {
                        try {
                            await API.notifications.markRead(notifId);
                            this.loadNotifications();
                        } catch (err) {}
                    }
                });
            });
        } catch (err) {}
    }
};

// 4K 3D Interactive Animation Engine
const AnimationEngine3D = {
    init3DTilt() {
        const cards = document.querySelectorAll('.card-3d, .glass-card, .premium-card, .stat-box, .job-card, .stat-card, .admin-card, .card');
        cards.forEach(card => {
            card.classList.add('shimmer-3d');
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -12;
                const rotateY = ((x - centerX) / centerX) * 12;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(16px)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            });
        });
    },

    injectAmbientOrbs() {
        if (document.querySelector('.bg-3d-orb')) return;
        const orb1 = document.createElement('div');
        orb1.className = 'bg-3d-orb bg-3d-orb-1';
        const orb2 = document.createElement('div');
        orb2.className = 'bg-3d-orb bg-3d-orb-2';
        const orb3 = document.createElement('div');
        orb3.className = 'bg-3d-orb bg-3d-orb-3';
        const orb4 = document.createElement('div');
        orb4.className = 'bg-3d-orb bg-3d-orb-4';
        document.body.prepend(orb1, orb2, orb3, orb4);
    }
};

Theme.applyEarly();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Theme.injectToggleButton();
        NotificationsManager.injectNotifications();
        AnimationEngine3D.injectAmbientOrbs();
        AnimationEngine3D.init3DTilt();
    });
} else {
    Theme.injectToggleButton();
    NotificationsManager.injectNotifications();
    AnimationEngine3D.injectAmbientOrbs();
    AnimationEngine3D.init3DTilt();
}

window.Theme = Theme;
window.NotificationsManager = NotificationsManager;
window.AnimationEngine3D = AnimationEngine3D;

