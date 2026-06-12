import { apiRequest } from './client';

export const beneficiariesApi = {
    getAll: () => apiRequest('GET', '/api/beneficiaries'),
    add: (data) => apiRequest('POST', '/api/beneficiaries', data),
    remove: (id) => apiRequest('DELETE', `/api/beneficiaries/${id}`),
};

export const fixedDepositsApi = {
    getAll: () => apiRequest('GET', '/api/fixed-deposits'),
    create: (data) => apiRequest('POST', '/api/fixed-deposits', data),
    close: (id) => apiRequest('DELETE', `/api/fixed-deposits/${id}`),
};

export const loansApi = {
    getAll: () => apiRequest('GET', '/api/loans'),
    apply: (data) => apiRequest('POST', '/api/loans', data),
    getById: (id) => apiRequest('GET', `/api/loans/${id}`),
};

export const notificationsApi = {
    getAll: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('GET', `/api/notifications${qs ? '?' + qs : ''}`);
    },
    markRead: (id) => apiRequest('PUT', `/api/notifications/${id}/read`),
    markAllRead: () => apiRequest('PUT', '/api/notifications/mark-all-read'),
};

export const scheduledTransfersApi = {
    getAll: () => apiRequest('GET', '/api/scheduled-transfers'),
    create: (data) => apiRequest('POST', '/api/scheduled-transfers', data),
    cancel: (id) => apiRequest('DELETE', `/api/scheduled-transfers/${id}`),
};

export const profileApi = {
    get: () => apiRequest('GET', '/api/profile'),
    update: (data) => apiRequest('PUT', '/api/profile', data),
    changePassword: (data) => apiRequest('PUT', '/api/profile/change-password', data),
};

// User-facing deposit request API
export const depositRequestsApi = {
    create: (data) => apiRequest('POST', '/api/deposit-requests', data),
    getAll: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('GET', `/api/deposit-requests${qs ? '?' + qs : ''}`);
    },
};

export const adminApi = {
    getDashboard: () => apiRequest('GET', '/api/admin/dashboard'),
    getCustomers: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('GET', `/api/admin/customers${qs ? '?' + qs : ''}`);
    },
    getCustomerDetail: (id) => apiRequest('GET', `/api/admin/customers/${id}`),
    updateKyc: (id, data) => apiRequest('POST', `/api/admin/customers/${id}/kyc`, data),
    toggleUserLock: (id, data) => apiRequest('POST', `/api/admin/customers/${id}/lock`, data),
    createAccount: (data) => apiRequest('POST', '/api/admin/accounts', data),
    changeAccountStatus: (id, data) => apiRequest('POST', `/api/admin/accounts/${id}/status`, data),
    adminDeposit: (data) => apiRequest('POST', '/api/admin/deposit', data),
    // Deposit request management
    getDepositRequests: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('GET', `/api/admin/deposit-requests${qs ? '?' + qs : ''}`);
    },
    approveDepositRequest: (id, data) => apiRequest('POST', `/api/admin/deposit-requests/${id}/approve`, data),
    rejectDepositRequest: (id, data) => apiRequest('POST', `/api/admin/deposit-requests/${id}/reject`, data),
    // Loans
    getLoans: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('GET', `/api/admin/loans${qs ? '?' + qs : ''}`);
    },
    updateLoan: (id, data) => apiRequest('PUT', `/api/admin/loans/${id}`, data),
    // Transactions
    getTransactions: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('GET', `/api/admin/transactions${qs ? '?' + qs : ''}`);
    },
    reverseTransaction: (id, data) => apiRequest('POST', `/api/admin/transactions/${id}/reverse`, data),
    // Audit log
    getAuditLog: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('GET', `/api/admin/audit-log${qs ? '?' + qs : ''}`);
    },
};
