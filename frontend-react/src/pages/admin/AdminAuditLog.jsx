import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';
import { formatDate } from '../../utils';

export default function AdminAuditLog() {
    const showToast = useToastContext();
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');

    const load = useCallback(async (page = 1, action = actionFilter) => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (action) params.action = action;
            const data = await adminApi.getAuditLog(params);
            setLogs(data.logs || []);
            setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [actionFilter, showToast]);

    useEffect(() => {
        load();
    }, []);

    const handleActionFilter = (val) => {
        setActionFilter(val);
        load(1, val);
    };

    const actionColors = {
        KYC_VERIFY: 'var(--green)',
        KYC_REJECT: 'var(--red)',
        ACCOUNT_CREATE: 'var(--cyan)',
        ACCOUNT_FREEZE: 'var(--gold)',
        ACCOUNT_UNFREEZE: 'var(--green)',
        ACCOUNT_CLOSE: 'var(--red)',
        DEPOSIT: 'var(--green)',
        LOAN_APPROVE: 'var(--cyan)',
        LOAN_REJECT: 'var(--red)',
        LOAN_DISBURSE: 'var(--green)',
        TRANSACTION_REVERSE: 'var(--purple-light)',
    };

    return (
        <AdminLayout title="Audit Log" subtitle={`${pagination.total} audit events recorded`}>
            
            {/* Filter row */}
            <div className="filter-row" style={{ marginBottom: '20px' }}>
                <select 
                    className="form-input" 
                    style={{ width: '240px' }} 
                    value={actionFilter} 
                    onChange={e => handleActionFilter(e.target.value)}
                    id="audit-action-filter"
                >
                    <option value="">All Action Types</option>
                    <option value="KYC_VERIFY">KYC Verified</option>
                    <option value="KYC_REJECT">KYC Rejected</option>
                    <option value="ACCOUNT_CREATE">Account Created</option>
                    <option value="ACCOUNT_FREEZE">Account Frozen</option>
                    <option value="ACCOUNT_UNFREEZE">Account Unfrozen</option>
                    <option value="ACCOUNT_CLOSE">Account Closed</option>
                    <option value="DEPOSIT">Deposit Made</option>
                    <option value="LOAN_APPROVE">Loan Approved</option>
                    <option value="LOAN_REJECT">Loan Rejected</option>
                    <option value="LOAN_DISBURSE">Loan Disbursed</option>
                    <option value="TRANSACTION_REVERSE">Transaction Reversed</option>
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
                                    <th>Log ID</th>
                                    <th>Admin</th>
                                    <th>Action</th>
                                    <th>Target Customer</th>
                                    <th>Target Account</th>
                                    <th>Details</th>
                                    <th>Date</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr><td colSpan={8} className="data-table-empty">No audit logs found</td></tr>
                                ) : logs.map(log => {
                                    const logColor = actionColors[log.action] || 'var(--text-secondary)';
                                    return (
                                        <tr key={log._id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {log._id.slice(-8).toUpperCase()}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '600', fontSize: '13px' }}>{log.admin?.name || 'System'}</div>
                                                {log.admin?.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.admin.email}</div>}
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: `${logColor}18`, color: logColor, border: `1px solid ${logColor}40`, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>
                                                {log.targetUser ? (
                                                    <div>
                                                        <div style={{ fontWeight: '500', fontSize: '13px' }}>{log.targetUser.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.targetUser.email}</div>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                                {log.targetAccount?.accountNumber || '—'}
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                                {log.details || '—'}
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {log.ip || '—'}
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
        </AdminLayout>
    );
}
