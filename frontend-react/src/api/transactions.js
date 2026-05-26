import { apiRequest } from './client';

export const transactionsApi = {
    create: (fromAccount, toAccount, amount, idempotencyKey) =>
        apiRequest('POST', '/api/transactions', { fromAccount, toAccount, amount, idempotencyKey }),
    getHistory: (accountId) =>
        apiRequest('GET', `/api/transactions/${accountId}`),
};
