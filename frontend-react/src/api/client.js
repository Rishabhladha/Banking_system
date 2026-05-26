/* =============================================
   api/client.js — Core fetch wrapper
   ============================================= */

export const API_BASE = 'http://localhost:3000';

export async function apiRequest(method, path, body = null) {
    const token = localStorage.getItem('nexabank_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, opts);
    } catch (networkErr) {
        throw new Error('Cannot reach the server. Make sure the backend is running on port 3000.');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
}
