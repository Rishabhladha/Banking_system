import { apiRequest } from './client';

export const authApi = {
    register: (name, email, password) =>
        apiRequest('POST', '/api/auth/register', { name, email, password }),
    login: (email, password) =>
        apiRequest('POST', '/api/auth/login', { email, password }),
    logout: () =>
        apiRequest('POST', '/api/auth/logout'),
    me: () =>
        apiRequest('GET', '/api/auth/me'),
    verifyAdminPin: (pin) =>
        apiRequest('POST', '/api/auth/admin-pin', { pin }),
};
