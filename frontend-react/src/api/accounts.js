import { apiRequest } from './client';

export const accountsApi = {
    create: () =>
        apiRequest('POST', '/api/accounts'),
    getAll: () =>
        apiRequest('GET', '/api/accounts'),
    getBalance: (id) =>
        apiRequest('GET', `/api/accounts/balance/${id}`),
    deposit: (accountId, amount) =>
        apiRequest('POST', '/api/accounts/deposit', { accountId, amount }),
};
