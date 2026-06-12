import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';
import { formatCurrency, formatDate } from '../../utils';

export default function AdminLoans() {
    const showToast = useToastContext();
    const [loans, setLoans] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modal states for actioning loans
    const [activeLoan, setActiveLoan] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approve' | 'reject' | 'disburse'
    const [adminNote, setAdminNote] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);

    const load = useCallback(async (page = 1, status = statusFilter) => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (status) params.status = status;
            const data = await adminApi.getLoans(params);
            setLoans(data.loans || []);
            setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, showToast]);

    useEffect(() => {
        load();
    }, []);

    const handleStatusFilter = (val) => {
        setStatusFilter(val);
        load(1, val);
    };

    const handleOpenModal = (loan, type) => {
        setActiveLoan(loan);
        setActionType(type);
        setAdminNote('');
    };

    const handleCloseModal = () => {
        setActiveLoan(null);
        setActionType('');
        setAdminNote('');
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        if (!activeLoan) return;

        setSubmittingAction(true);
        try {
            await adminApi.updateLoan(activeLoan._id, {
                action: actionType,
                adminNote
            });
            showToast(`Loan ${actionType}d successfully!`, 'success');
            handleCloseModal();
            load(pagination.page);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSubmittingAction(false);
        }
    };

    const statusColors = {
        PENDING: 'var(--gold)',
        APPROVED: 'var(--cyan)',
        REJECTED: 'var(--red)',
        DISBURSED: 'var(--green)'
    };

    return (
        <AdminLayout title="Loan Management" subtitle={`${pagination.total} total loan applications`}>
            {/* Filter row */}
            <div className="filter-row" style={{ marginBottom: '20px' }}>
                <select 
                    className="form-input" 
                    style={{ width: '200px' }} 
                    value={statusFilter} 
                    onChange={e => handleStatusFilter(e.target.value)}
                    id="loan-status-filter"
                >
                    <option value="">All Loan Statuses</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved (Awaiting Disbursement)</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DISBURSED">Disbursed</option>
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
                                    <th>Loan Ref</th>
                                    <th>Customer</th>
                                    <th>Linked Account</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Term</th>
                                    <th>EMI / Rate</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loans.length === 0 ? (
                                    <tr><td colSpan={9} className="data-table-empty">No loan applications found</td></tr>
                                ) : loans.map(loan => {
                                    const accountNum = loan.account?.accountNumber || '—';
                                    const customerName = loan.user?.name || '—';
                                    const customerEmail = loan.user?.email || '';
                                    return (
                                        <tr key={loan._id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                                {loan.loanNumber || loan._id.slice(-8).toUpperCase()}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '600' }}>{customerName}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{customerEmail}</div>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{accountNum}</td>
                                            <td style={{ fontWeight: '700' }}>{formatCurrency(loan.amount)}</td>
                                            <td style={{ fontSize: '12px', textTransform: 'uppercase' }}>{loan.loanType}</td>
                                            <td style={{ fontSize: '13px' }}>{loan.tenureMonths} mos</td>
                                            <td>
                                                {loan.status === 'PENDING' ? (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>TBD</span>
                                                ) : (
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{formatCurrency(loan.emi)}/mo</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--gold)' }}>{loan.interestRate}% rate</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: `${statusColors[loan.status]}18`, color: statusColors[loan.status], border: `1px solid ${statusColors[loan.status]}40` }}>
                                                    ● {loan.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {loan.status === 'PENDING' && (
                                                        <>
                                                            <button 
                                                                className="btn btn-success btn-sm"
                                                                onClick={() => handleOpenModal(loan, 'approve')}
                                                            >
                                                                <i className="ri-check-line" /> Approve
                                                            </button>
                                                            <button 
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleOpenModal(loan, 'reject')}
                                                            >
                                                                <i className="ri-close-line" /> Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {loan.status === 'APPROVED' && (
                                                        <button 
                                                            className="btn btn-primary btn-sm"
                                                            style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
                                                            onClick={() => handleOpenModal(loan, 'disburse')}
                                                        >
                                                            <i className="ri-coins-line" /> Disburse
                                                        </button>
                                                    )}
                                                    {(loan.status === 'DISBURSED' || loan.status === 'REJECTED') && (
                                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>
                                                    )}
                                                </div>
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

            {/* Action Modal */}
            {activeLoan && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <i className="ri-bank-fill" style={{ color: statusColors[actionType.toUpperCase() === 'APPROVE' ? 'APPROVED' : actionType.toUpperCase() === 'REJECT' ? 'REJECTED' : 'DISBURSED'] }} />
                                {actionType.toUpperCase() === 'DISBURSE' ? 'Disburse Funds' : `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Loan Application`}
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={handleCloseModal}>
                                <i className="ri-close-line" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleActionSubmit}>
                            <div className="modal-body-text" style={{ padding: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                                    Are you sure you want to <strong>{actionType}</strong> this loan request?
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                                    <span>{activeLoan.user?.name}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Loan Type:</span>
                                    <span>{activeLoan.loanType}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                                    <span style={{ fontWeight: '600' }}>{formatCurrency(activeLoan.amount)}</span>
                                </div>
                            </div>

                            {actionType !== 'disburse' && (
                                <div className="form-group" style={{ margin: '16px 0 20px 0' }}>
                                    <label className="form-label">Admin Comments / Note</label>
                                    <textarea
                                        className="form-input"
                                        style={{ height: '80px', resize: 'none' }}
                                        placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Additional terms or approval notes'}
                                        value={adminNote}
                                        onChange={e => setAdminNote(e.target.value)}
                                        required={actionType === 'reject'}
                                    />
                                </div>
                            )}

                            {actionType === 'disburse' && (
                                <div style={{ margin: '16px 0 20px 0', fontSize: '12px', color: 'var(--green)', display: 'flex', gap: '8px', background: 'rgba(16,185,129,0.08)', padding: '12px', borderRadius: '6px' }}>
                                    <i className="ri-information-fill" style={{ fontSize: '16px' }} />
                                    <span>
                                        This action will immediately credit ₹{activeLoan.amount.toLocaleString('en-IN')} to customer's linked account ({activeLoan.account?.accountNumber}). This cannot be undone.
                                    </span>
                                </div>
                            )}

                            <div className="modal-footer" style={{ padding: '16px 0 0 0', borderTop: 'none' }}>
                                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                                <button 
                                    type="submit" 
                                    className={`btn ${actionType === 'reject' ? 'btn-danger' : 'btn-success'}`}
                                    disabled={submittingAction}
                                >
                                    {submittingAction ? (
                                        <><Spinner /> Processing…</>
                                    ) : (
                                        actionType === 'disburse' ? 'Confirm Disbursement' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`
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
