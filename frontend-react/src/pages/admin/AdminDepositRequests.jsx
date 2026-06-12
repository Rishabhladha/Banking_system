import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';
import { formatCurrency } from '../../utils';

const STATUS_COLORS = {
    PENDING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: 'ri-time-line' },
    APPROVED: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: 'ri-checkbox-circle-line' },
    REJECTED: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   icon: 'ri-close-circle-line' },
};

export default function AdminDepositRequests() {
    const showToast = useToastContext();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [pagination, setPagination] = useState({});
    const [page, setPage] = useState(1);

    // Modal state
    const [modal, setModal] = useState(null); // { type: 'approve'|'reject', request }
    const [adminNote, setAdminNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const data = await adminApi.getDepositRequests(params);
            setRequests(data.requests || []);
            setPagination(data.pagination || {});
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast, statusFilter, page]);

    useEffect(() => { load(); }, [load]);

    const openModal = (type, request) => {
        setModal({ type, request });
        setAdminNote('');
    };

    const closeModal = () => {
        setModal(null);
        setAdminNote('');
    };

    const handleAction = async () => {
        if (!modal) return;
        setActionLoading(true);
        try {
            if (modal.type === 'approve') {
                await adminApi.approveDepositRequest(modal.request._id, { adminNote });
                showToast(`Deposit of ${formatCurrency(modal.request.amount)} approved!`, 'success');
            } else {
                if (!adminNote.trim()) {
                    showToast('Please provide a reason for rejection', 'error');
                    setActionLoading(false);
                    return;
                }
                await adminApi.rejectDepositRequest(modal.request._id, { adminNote });
                showToast('Deposit request rejected', 'success');
            }
            closeModal();
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <AdminLayout title="Deposit Requests" subtitle="Review and process customer deposit requests">
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[
                    { val: 'PENDING',  label: 'Pending', icon: 'ri-time-line' },
                    { val: 'APPROVED', label: 'Approved', icon: 'ri-checkbox-circle-line' },
                    { val: 'REJECTED', label: 'Rejected', icon: 'ri-close-circle-line' },
                    { val: '',         label: 'All', icon: 'ri-list-check' },
                ].map(f => (
                    <button key={f.val} id={`filter-${f.val || 'all'}`}
                        onClick={() => { setStatusFilter(f.val); setPage(1); }}
                        style={{
                            padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            background: statusFilter === f.val ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.05)',
                            color: statusFilter === f.val ? '#fff' : 'var(--text-secondary)',
                            fontWeight: '600', fontSize: '13px',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s'
                        }}>
                        <i className={f.icon} />{f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
            ) : requests.length === 0 ? (
                <div className="glass-card" style={{ padding: '64px', textAlign: 'center' }}>
                    <i className="ri-inbox-line" style={{ fontSize: '56px', color: 'var(--text-muted)', marginBottom: '16px', display: 'block' }} />
                    <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
                        No {statusFilter.toLowerCase()} deposit requests
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {requests.map(req => {
                            const cfg = STATUS_COLORS[req.status] || STATUS_COLORS.PENDING;
                            return (
                                <div key={req._id} className="glass-card" style={{ padding: '20px 24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            {/* Amount */}
                                            <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>
                                                {formatCurrency(req.amount)}
                                            </div>
                                            {/* Customer */}
                                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="ri-user-line" />
                                                    {req.user?.name || 'Unknown'} — {req.user?.email}
                                                </span>
                                                <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="ri-bank-card-line" />
                                                    {req.account?.accountNumber ? `…${req.account.accountNumber.slice(-4)}` : '—'} ({req.account?.accountType})
                                                </span>
                                            </div>
                                            {/* Reference note */}
                                            {req.referenceNote && (
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="ri-file-text-line" />
                                                    {req.referenceNote}
                                                </div>
                                            )}
                                            {/* Date */}
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                Submitted: {new Date(req.createdAt).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                            {/* Admin note */}
                                            {req.adminNote && (
                                                <div style={{
                                                    marginTop: '8px', padding: '8px 12px',
                                                    background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
                                                    fontSize: '13px', color: 'var(--text-secondary)'
                                                }}>
                                                    <i className="ri-admin-line" /> {req.adminNote}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                                            {/* Status badge */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                background: cfg.bg, border: `1px solid ${cfg.border}`,
                                                borderRadius: '999px', padding: '5px 12px',
                                                color: cfg.color, fontSize: '12px', fontWeight: '700'
                                            }}>
                                                <i className={cfg.icon} /> {req.status}
                                            </div>

                                            {/* Action buttons — only for PENDING */}
                                            {req.status === 'PENDING' && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button id={`reject-${req._id}`} onClick={() => openModal('reject', req)}
                                                        style={{
                                                            padding: '8px 14px', borderRadius: '8px',
                                                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                                            color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}>
                                                        <i className="ri-close-line" /> Reject
                                                    </button>
                                                    <button id={`approve-${req._id}`} onClick={() => openModal('approve', req)}
                                                        style={{
                                                            padding: '8px 14px', borderRadius: '8px',
                                                            background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(6,182,212,0.1))',
                                                            border: '1px solid rgba(16,185,129,0.3)',
                                                            color: '#10b981', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}>
                                                        <i className="ri-checkbox-circle-line" /> Approve
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <i className="ri-arrow-left-s-line" /> Prev
                            </button>
                            <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                Page {page} of {pagination.pages}
                            </span>
                            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>
                                Next <i className="ri-arrow-right-s-line" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Action Modal */}
            {modal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: modal.type === 'approve' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <i className={modal.type === 'approve' ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill'}
                                   style={{ fontSize: '22px', color: modal.type === 'approve' ? '#10b981' : '#ef4444' }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '16px' }}>
                                    {modal.type === 'approve' ? 'Approve Deposit Request' : 'Reject Deposit Request'}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {modal.request.user?.name} — {formatCurrency(modal.request.amount)}
                                </div>
                            </div>
                        </div>

                        {modal.type === 'approve' && (
                            <div style={{
                                padding: '12px 16px', marginBottom: '16px',
                                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                                borderRadius: '10px', fontSize: '13px', color: '#34d399', lineHeight: '1.5'
                            }}>
                                <i className="ri-information-line" /> Approving will immediately credit{' '}
                                <strong>{formatCurrency(modal.request.amount)}</strong> to the customer's account.
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">
                                {modal.type === 'approve' ? 'Admin Note (Optional)' : 'Rejection Reason (Required)'}
                            </label>
                            <textarea
                                id="admin-note-input"
                                className="form-input"
                                rows={3}
                                placeholder={modal.type === 'approve' ? 'e.g. Processed manually, verified with branch…' : 'e.g. Invalid reference, suspicious activity…'}
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={closeModal} disabled={actionLoading}>
                                Cancel
                            </button>
                            <button
                                id="modal-confirm-btn"
                                onClick={handleAction}
                                disabled={actionLoading}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                    background: modal.type === 'approve'
                                        ? 'linear-gradient(135deg,#10b981,#06b6d4)'
                                        : 'linear-gradient(135deg,#ef4444,#dc2626)',
                                    color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}>
                                {actionLoading
                                    ? <Spinner />
                                    : modal.type === 'approve'
                                    ? <><i className="ri-checkbox-circle-line" /> Confirm Approval</>
                                    : <><i className="ri-close-circle-line" /> Confirm Rejection</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
