import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { loansApi } from '../api/banking';
import { accountsApi } from '../api/accounts';
import { formatCurrency } from '../utils';

const LOAN_TYPES = [
    { value: 'PERSONAL',  label: 'Personal Loan',  icon: '👤', rate: '12.5%' },
    { value: 'HOME',      label: 'Home Loan',       icon: '🏠', rate: '8.5%' },
    { value: 'AUTO',      label: 'Auto Loan',       icon: '🚗', rate: '9.75%' },
    { value: 'EDUCATION', label: 'Education Loan',  icon: '🎓', rate: '10.0%' },
    { value: 'BUSINESS',  label: 'Business Loan',   icon: '💼', rate: '14.0%' },
];

const STATUS_COLOR = {
    PENDING:  { bg: 'rgba(245,158,11,.1)',  color: 'var(--gold)',         label: 'Under Review' },
    APPROVED: { bg: 'rgba(16,185,129,.1)',  color: 'var(--green)',        label: 'Approved' },
    REJECTED: { bg: 'rgba(239,68,68,.1)',   color: 'var(--red)',          label: 'Rejected' },
    DISBURSED:{ bg: 'rgba(6,182,212,.1)',   color: 'var(--cyan)',         label: 'Disbursed' },
    CLOSED:   { bg: 'rgba(148,163,184,.1)', color: 'var(--text-muted)',   label: 'Closed' },
};

export default function Loans() {
    const showToast = useToastContext();
    const [loans, setLoans] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [applying, setApplying] = useState(false);
    const [form, setForm] = useState({ accountId: '', loanType: 'PERSONAL', amount: '', tenureMonths: '36', purpose: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [loanData, accData] = await Promise.all([loansApi.getAll(), accountsApi.getAll()]);
            setLoans(loanData.loans || []);
            setAccounts((accData.accounts || []).filter(a => a.status === 'ACTIVE'));
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleApply = async (e) => {
        e.preventDefault();
        setApplying(true);
        try {
            await loansApi.apply({ ...form, amount: parseFloat(form.amount), tenureMonths: parseInt(form.tenureMonths) });
            showToast('Loan application submitted!', 'success');
            setShowModal(false);
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setApplying(false); }
    };

    return (
        <Layout title="Loans" subtitle="Apply and track your loan applications"
            headerRight={<button className="btn btn-primary btn-sm" id="apply-loan-btn" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Apply for Loan</button>}>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
            ) : loans.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏦</div>
                    <div className="empty-state-title">No Loan Applications</div>
                    <p style={{ marginBottom: '20px', fontSize: '14px' }}>Apply for a personal, home, auto, or education loan</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Apply Now</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
                    {loans.map(loan => {
                        const typeInfo = LOAN_TYPES.find(t => t.value === loan.loanType) || {};
                        const statusInfo = STATUS_COLOR[loan.status] || {};
                        return (
                            <div key={loan._id} className="loan-card glass-card">
                                <div className="loan-type-icon" style={{ background: `${statusInfo.bg}`, fontSize: '24px' }}>{typeInfo.icon}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{typeInfo.label}</div>
                                    <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}44` }}>
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <div className="loan-amount">{formatCurrency(loan.amount)}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{loan.loanNumber}</div>
                                <div className="loan-details">
                                    <div className="loan-detail-row"><span>Tenure</span><span>{loan.tenureMonths} months</span></div>
                                    {loan.interestRate && <div className="loan-detail-row"><span>Interest Rate</span><span style={{ color: 'var(--gold)' }}>{loan.interestRate}% p.a.</span></div>}
                                    {loan.emi && <div className="loan-detail-row"><span>Monthly EMI</span><span style={{ color: 'var(--green)', fontWeight: '700' }}>{formatCurrency(loan.emi)}</span></div>}
                                    {loan.purpose && <div className="loan-detail-row"><span>Purpose</span><span style={{ maxWidth: '160px', textAlign: 'right', fontSize: '12px' }}>{loan.purpose}</span></div>}
                                    {loan.adminNote && (
                                        <div style={{ marginTop: '8px', padding: '10px', background: `${statusInfo.bg}`, borderRadius: 'var(--radius-sm)', fontSize: '12px', color: statusInfo.color }}>
                                            <i className="ri-information-line" /> {loan.adminNote}
                                        </div>
                                    )}
                                    <div className="loan-detail-row" style={{ fontSize: '11px', opacity: .7 }}>
                                        <span>Applied on</span><span>{new Date(loan.createdAt).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal glass-card" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <div className="modal-title"><i className="ri-bank-fill" style={{ color: 'var(--purple-light)' }} /> Apply for a Loan</div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><i className="ri-close-line" /></button>
                        </div>
                        <form onSubmit={handleApply}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Loan Type</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                                        {LOAN_TYPES.map(t => (
                                            <div key={t.value}
                                                onClick={() => setForm(f => ({ ...f, loanType: t.value }))}
                                                style={{
                                                    padding: '12px 8px', borderRadius: 'var(--radius-md)', border: `1px solid ${form.loanType === t.value ? 'var(--purple)' : 'var(--border)'}`,
                                                    background: form.loanType === t.value ? 'rgba(124,58,237,.12)' : 'var(--bg-card)',
                                                    cursor: 'pointer', textAlign: 'center', transition: 'all .2s'
                                                }}>
                                                <div style={{ fontSize: '20px' }}>{t.icon}</div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '4px' }}>{t.label.split(' ')[0]}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--gold)' }}>{t.rate}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Disburse to Account</label>
                                    <select className="form-input" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} required id="loan-account-select">
                                        <option value="">Select account</option>
                                        {accounts.map(a => <option key={a._id} value={a._id}>{a.accountNumber} — {a.accountType}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Loan Amount (₹)</label>
                                        <input id="loan-amount" type="number" className="form-input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="10000" placeholder="Min ₹10,000" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tenure (months)</label>
                                        <select className="form-input" value={form.tenureMonths} onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))}>
                                            {[6,12,24,36,48,60,84,120,180,240,360].map(m => <option key={m} value={m}>{m} months</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Purpose (optional)</label>
                                    <textarea className="form-input" rows={3} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Brief description of loan purpose..." style={{ resize: 'vertical' }} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" id="submit-loan-btn" disabled={applying}>
                                    {applying ? <><Spinner /> Submitting…</> : <><i className="ri-send-plane-fill" /> Submit Application</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
