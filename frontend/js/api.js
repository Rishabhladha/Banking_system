/* =============================================
   api.js — NexaBank API Client
   Single source of truth for all backend calls
   ============================================= */

const API_BASE = 'http://localhost:3000';

/* ---- Auth token helpers ---- */
const Auth = {
    getToken:  ()      => localStorage.getItem('nexabank_token'),
    setToken:  (t)     => localStorage.setItem('nexabank_token', t),
    getUser:   ()      => { const u = localStorage.getItem('nexabank_user'); return u ? JSON.parse(u) : null; },
    setUser:   (u)     => localStorage.setItem('nexabank_user', JSON.stringify(u)),
    clear:     ()      => { localStorage.removeItem('nexabank_token'); localStorage.removeItem('nexabank_user'); },
    isLoggedIn:()      => !!localStorage.getItem('nexabank_token'),
};

/* ---- Core fetch wrapper ---- */
async function apiRequest(method, path, body = null) {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
}

/* ---- API surface ---- */
const api = {
    auth: {
        register: (name, email, password) =>
            apiRequest('POST', '/api/auth/register', { name, email, password }),
        login: (email, password) =>
            apiRequest('POST', '/api/auth/login', { email, password }),
        logout: () =>
            apiRequest('POST', '/api/auth/logout'),
    },
    accounts: {
        create:     ()          => apiRequest('POST', '/api/accounts'),
        getAll:     ()          => apiRequest('GET',  '/api/accounts'),
        getBalance: (id)        => apiRequest('GET',  `/api/accounts/balance/${id}`),
    },
    transactions: {
        create: (fromAccount, toAccount, amount, idempotencyKey) =>
            apiRequest('POST', '/api/transactions', { fromAccount, toAccount, amount, idempotencyKey }),
        getHistory: (accountId) =>
            apiRequest('GET', `/api/transactions/${accountId}`),
    },
};

/* ---- Toast notification system ---- */
function initToasts() {
    if (document.getElementById('toast-container')) return;
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
}

function showToast(message, type = 'info', duration = 4000) {
    initToasts();
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

/* ---- Auth guard — redirect if not logged in ---- */
function requireAuth() {
    if (!Auth.isLoggedIn()) {
        window.location.href = '/frontend/auth.html';
        return false;
    }
    return true;
}

/* ---- Redirect if already logged in ---- */
function redirectIfLoggedIn(dest = '/frontend/dashboard.html') {
    if (Auth.isLoggedIn()) window.location.href = dest;
}

/* ---- Populate sidebar user info ---- */
function populateSidebarUser() {
    const user = Auth.getUser();
    if (!user) return;
    const nameEl  = document.getElementById('sidebar-user-name');
    const emailEl = document.getElementById('sidebar-user-email');
    const avatarEl= document.getElementById('sidebar-user-avatar');
    if (nameEl)   nameEl.textContent  = user.name;
    if (emailEl)  emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = user.name ? user.name[0].toUpperCase() : '?';
}

/* ---- Logout handler ---- */
async function handleLogout() {
    try { await api.auth.logout(); } catch(e) { /* ignore */ }
    Auth.clear();
    window.location.href = '/frontend/auth.html';
}

/* ---- Format currency ---- */
function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency,
        minimumFractionDigits: 2
    }).format(amount);
}

/* ---- Format date ---- */
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/* ---- Generate idempotency key ---- */
function generateIdempotencyKey() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/* ---- Truncate account ID for display ---- */
function truncateId(id) {
    if (!id) return '—';
    return `${id.slice(0,6)}…${id.slice(-4)}`;
}
