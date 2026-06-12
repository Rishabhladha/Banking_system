import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';
import { formatCurrency, formatDate, truncateId } from '../../utils';

export default function AdminTransactions() {
    const showToast = useToastContext();
    const [transactions, setTransactions] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const searchTimeout = useRef(null);

    // Modal state for Reversal
    const [activeTx, setActiveTx] = useState(null);
    const [reason, setReason] = useState('');
    const [reversing, setReversing] = useState(false);

    const load = useCallback(async (page = 1, s = search, status = statusFilter) => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (s.trim()) params.search = s.trim();
            if (status) params.status = status;
            
            const data = await adminApi.getTransactions(params);
            setTransactions(data.transactions || []);
            setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, showToast]);

    useEffect(() => {
        load();
    }, []);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            load(1, val, statusFilter);
        }, 400);
    };

    const handleStatusFilter = (val) => {
        setStatusFilter(val);
        load(1, search, val);
    };

    const handleOpenReversal = (tx) => {
        setActiveTx(tx);
        setReason('');
    };

    const handleCloseReversal = () => {
        setActiveTx(null);
        setReason('');
    };

    const handleReverseSubmit = async (e) => {
        e.preventDefault();
        if (!activeTx) return;

        setReversing(true);
        try {
            await adminApi.reverseTransaction(activeTx._id, { reason });
            showToast('Transaction reversed successfully!', 'success');
            handleCloseReversal();
            load(pagination.page);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setReversing(false);
        }
    };

    const copyToClipboard = (text, type = 'Transaction ID') => {
        navigator.clipboard.writeText(text);
        showToast(`${type} copied to clipboard!`, 'info');
    };

    const statusColors = {
        COMPLETED: 'var(--green)',
        PENDING: 'var(--gold)',
        REVERSED: 'var(--purple-light)',
        FAILED: 'var(--red)'
    };

    return (
        <AdminLayout title="Transaction Monitor" subtitle={`${pagination.total} transaction records found`}>
            
            {/* Filter row */}
            <div className="filter-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div className="search-bar-wrapper" style={{ flex: 1, minWidth: '240px' }}>
                    <i className="search-bar-icon ri-search-line" />
                    <input 
                        className="form-input search-bar" 
                        placeholder="Search by ID, Account ID, or Idempotency Key…" 
                        value={search} 
                        onChange={handleSearchChange} 
                        id="tx-search"
                    />
                </div>
                <select 
                    className="form-input" 
                    style={{ width: '180px' }} 
                    value={statusFilter} 
                    onChange={e => handleStatusFilter(e.target.value)}
                    id="tx-status-filter"
                >
                    <option value="">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="REVERSED">Reversed</option>
                    <option value="FAILED">Failed</option>
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div>
            ) : (
                <>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tx ID</th>
                                    <th>Source Account</th>
                                    <th>Destination Account</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={8} className="data-table-empty">No transactions found</td></tr>
                                ) : transactions.map(tx => {
                                    const sourceNum = tx.fromAccount?.accountNumber || '—';
                                    const destNum = tx.toAccount?.accountNumber || '—';
                                    return (
                                        <tr key={tx._id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                                <span 
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => copyToClipboard(tx._id)}
                                                    title="Click to copy full ID"
                                                >
                                                    {tx._id.slice(-8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                                {tx.fromAccount ? (
                                                    <span 
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => copyToClipboard(tx.fromAccount._id, 'Account ID')}
                                                        title="Click to copy account ID"
                                                    >
                                                        {sourceNum}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                                {tx.toAccount ? (
                                                    <span 
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => copyToClipboard(tx.toAccount._id, 'Account ID')}
                                                        title="Click to copy account ID"
                                                    >
                                                        {destNum}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ fontWeight: '700' }}>
                                                {formatCurrency(tx.amount)}
                                            </td>
                                            <td style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                                {tx.transactionType || 'TRANSFER'}
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: `${statusColors[tx.status]}18`, color: statusColors[tx.status], border: `1px solid ${statusColors[tx.status]}40` }}>
                                                    ● {tx.status}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {formatDate(tx.createdAt)}
                                            </td>
                                            <td>
                                                {tx.status === 'COMPLETED' ? (
                                                    <button 
                                                        className="btn btn-outline btn-sm"
                                                        style={{ color: 'var(--purple-light)', borderColor: 'rgba(124,58,237,.3)' }}
                                                        onClick={() => handleOpenReversal(tx)}
                                                    >
                                                        <i className="ri-arrow-go-back-fill" /> Reverse
                                                    </button>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Prev</button>
                            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
                                <button key={p} className={`pagination-btn${pagination.page === p ? ' active' : ''}`} onClick={() => load(p)}>{p}</button>
                            ))}
                            <button className="pagination-btn" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Next →</button>
                            <span className="pagination-info">{pagination.total} total</span>
                        </div>
                    )}
                </>
            )}

            {/* Reversal Confirmation Modal */}
            {activeTx && (
                <div className="modal-overlay" onClick={handleCloseReversal}>
                    <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div className="modal-title" style={{ color: 'var(--purple-light)' }}>
                                <i className="ri-arrow-go-back-line" />
                                Force Transaction Reversal
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={handleCloseReversal}>
                                <i className="ri-close-line" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleReverseSubmit}>
                            <div className="modal-body-text" style={{ padding: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--red)' }}>
                                    <strong>WARNING:</strong> Reversing this transaction will create compensating ledger entries (refunding the sender and debiting the receiver).
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{activeTx._id}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                                    <span style={{ fontWeight: '600' }}>{formatCurrency(activeTx.amount)}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>From Account:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{activeTx.fromAccount?.accountNumber}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>To Account:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{activeTx.toAccount?.accountNumber}</span>
                                </div>
                            </div>

                            <div className="form-group" style={{ margin: '16px 0 20px 0' }}>
                                <label className="form-label">Reason for Reversal</label>
                                <textarea
                                    className="form-input"
                                    style={{ height: '80px', resize: 'none' }}
                                    placeholder="Enter the official reason or ticket reference for this reversal..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="modal-footer" style={{ padding: '16px 0 0 0', borderTop: 'none' }}>
                                <button type="button" className="btn btn-outline" onClick={handleCloseReversal}>Cancel</button>
                                <button 
                                    type="submit" 
                                    className="btn"
                                    style={{ background: 'var(--purple-light)', color: '#fff' }}
                                    disabled={reversing || !reason.trim()}
                                >
                                    {reversing ? (
                                        <><Spinner /> Reversing…</>
                                    ) : (
                                        'Execute Reversal'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
