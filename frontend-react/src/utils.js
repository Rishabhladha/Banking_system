export function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

export function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function truncateId(id) {
    if (!id) return '—';
    return `${String(id).slice(0, 6)}…${String(id).slice(-4)}`;
}

export function generateIdempotencyKey() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
