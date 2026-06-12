import { apiRequest } from './client';

export const accountsApi = {
    create: (accountType, nickname) =>
        apiRequest('POST', '/api/accounts', { accountType, nickname }),
    getAll: () =>
        apiRequest('GET', '/api/accounts'),
    getBalance: (id) =>
        apiRequest('GET', `/api/accounts/balance/${id}`),
    // deposit() REMOVED — users must submit deposit requests instead
    withdraw: (accountId, amount) =>
        apiRequest('POST', '/api/accounts/withdraw', { accountId, amount }),
    getStatement: (accountId, params = {}) => {
        const qs = new URLSearchParams(params).toString()
        return apiRequest('GET', `/api/accounts/statement/${accountId}${qs ? '?' + qs : ''}`)
    },
    updateNickname: (accountId, nickname) =>
        apiRequest('PATCH', `/api/accounts/${accountId}/nickname`, { nickname }),
};
