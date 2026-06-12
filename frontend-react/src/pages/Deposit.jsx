import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { accountsApi } from '../api/accounts';
import { depositRequestsApi } from '../api/banking';
import { formatCurrency } from '../utils';

const STATUS_CONFIG = {
    PENDING:  { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: 'ri-time-line' },
    APPROVED: { label: 'Approved',       color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: 'ri-checkbox-circle-line' },
    REJECTED: { label: 'Rejected',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   icon: 'ri-close-circle-line' },
};

export default function DepositRequests() {
    const showToast = useToastContext();

    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [referenceNote, setReferenceNote] = useState('');
    const [step, setStep] = useState(1); // 1=form, 2=confirm, 3=success
    const [loading, setLoading] = useState(false);
    const [amountError, setAmountError] = useState('');

    const [requests, setRequests] = useState([]);
    const [reqLoading, setReqLoading] = useState(true);
    const [tab, setTab] = useState('new'); // 'new' | 'history'

    const loadAccounts = useCallback(async () => {
        try {
            const data = await accountsApi.getAll();
            const active = (data.accounts || []).filter(a => a.status === 'ACTIVE');
            setAccounts(active);
            if (active.length > 0) setSelectedAccountId(active[0]._id);
        } catch (err) {
            showToast('Could not load accounts: ' + err.message, 'error');
        }
    }, [showToast]);

    const loadRequests = useCallback(async () => {
        setReqLoading(true);
        try {
            const data = await depositRequestsApi.getAll();
            setRequests(data.requests || []);
        } catch (err) {
            showToast('Could not load deposit requests: ' + err.message, 'error');
        } finally {
            setReqLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadAccounts();
        loadRequests();
    }, [loadAccounts, loadRequests]);

    const handleNext = () => {
        const val = parseFloat(amount);
        if (!selectedAccountId) { showToast('Please select an account.', 'error'); return; }
        if (!val || val <= 0) { setAmountError('Please enter a valid amount greater than ₹0'); return; }
        if (val > 10_000_000) { setAmountError('Maximum deposit request is ₹1,00,00,000'); return; }
        setAmountError('');
        setStep(2);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await depositRequestsApi.create({
                accountId: selectedAccountId,
                amount: parseFloat(amount),
                referenceNote: referenceNote || undefined
            });
            setStep(3);
            loadRequests();
            showToast('Deposit request submitted! Awaiting admin approval.', 'success');
        } catch (err) {
            showToast(err.message, 'error');
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setAmount('');
        setReferenceNote('');
        setAmountError('');
        setStep(1);
    };

    const selectedAcc = accounts.find(a => a._id === selectedAccountId);
    const quickAmounts = [500, 1000, 2000, 5000, 10000, 50000];

    return (
        <Layout title="Deposit Requests" subtitle="Request funds to be deposited into your account — requires admin approval">
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
                {[{ id: 'new', label: 'New Request', icon: 'ri-add-circle-line' },
                  { id: 'history', label: 'My Requests', icon: 'ri-file-list-3-line',
                    badge: requests.filter(r => r.status === 'PENDING').length }
                ].map(t => (
                    <button key={t.id} id={`tab-${t.id}`} onClick={() => setTab(t.id)} style={{
                        padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: tab === t.id ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.05)',
                        color: tab === t.id ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '600', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: tab === t.id ? '0 4px 16px rgba(124,58,237,0.3)' : 'none'
                    }}>
                        <i className={t.icon} />
                        {t.label}
                        {t.badge > 0 && (
                            <span style={{ background: '#f59e0b', color: '#000', borderRadius: '999px', padding: '2px 7px', fontSize: '11px', fontWeight: '700' }}>
                                {t.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {tab === 'new' && (
                <div className="transfer-layout">
                    <div>
                        <div className="transfer-card glass-card">
                            {/* Steps */}
                            <div className="transfer-steps">
                                {[{ n: 1, label: 'Details' }, { n: 2, label: 'Confirm' }, { n: 3, label: 'Submitted' }].map((s, i) => (
                                    <>
                                        {i > 0 && <div key={`line-${s.n}`} className={`t-step-line${step > s.n - 1 ? ' done' : ''}`} />}
                                        <div key={s.n} className={`t-step${step >= s.n ? (step > s.n ? ' done' : ' active') : ''}`}>
                                            <div className="t-step-circle">{step > s.n ? <i className="ri-check-line" /> : s.n}</div>
                                            <div className="t-step-label">{s.label}</div>
                                        </div>
                                    </>
                                ))}
                            </div>

                            {/* Step 1 */}
                            {step === 1 && (
                                <div id="deposit-step-1">
                                    <div className="transfer-section-title">Deposit Request Details</div>
                                    <div className="form-stack-lg">
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="deposit-account-select">Deposit to Account</label>
                                            <select id="deposit-account-select" className="form-input"
                                                value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                                                {accounts.length === 0 && <option value="">No active accounts found</option>}
                                                {accounts.map(acc => (
                                                    <option key={acc._id} value={acc._id}>
                                                        {acc.accountNumber} — {acc.accountType}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label" htmlFor="deposit-amount">Requested Amount</label>
                                            <div className="amount-input-wrapper">
                                                <span className="currency-symbol">₹</span>
                                                <input type="number" id="deposit-amount" className="form-input amount-input"
                                                    placeholder="0.00" min="1" max="10000000" step="1"
                                                    value={amount} onChange={e => { setAmount(e.target.value); setAmountError(''); }} />
                                            </div>
                                            {amountError && <div className="amount-error">{amountError}</div>}
                                            <div className="form-hint">Maximum: ₹1,00,00,000 per request</div>
                                        </div>

                                        {/* Quick amounts */}
                                        <div>
                                            <div className="form-label" style={{ marginBottom: '8px' }}>Quick Select</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {quickAmounts.map(q => (
                                                    <button key={q} type="button" className="btn btn-outline btn-sm"
                                                        onClick={() => { setAmount(String(q)); setAmountError(''); }}>
                                                        ₹{q.toLocaleString('en-IN')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label" htmlFor="deposit-ref">Reference / Note (Optional)</label>
                                            <input type="text" id="deposit-ref" className="form-input"
                                                placeholder="e.g. Cheque no. 1234, ATM deposit, Salary credit…"
                                                value={referenceNote} maxLength={200}
                                                onChange={e => setReferenceNote(e.target.value)} />
                                            <div className="form-hint">Provide context to help admin process your request faster</div>
                                        </div>

                                        <button className="btn btn-primary btn-full btn-lg" id="deposit-next-btn"
                                            onClick={handleNext} disabled={accounts.length === 0}>
                                            <i className="ri-arrow-right-line" /> Review Request
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2 */}
                            {step === 2 && (
                                <div id="deposit-step-2">
                                    <div className="transfer-section-title">Confirm Deposit Request</div>
                                    <div className="confirm-card glass-card">
                                        <div className="confirm-amount">
                                            <span className="confirm-amount-label">Requested Amount</span>
                                            <div className="confirm-amount-value">{formatCurrency(parseFloat(amount))}</div>
                                        </div>
                                        <div className="confirm-details">
                                            <div className="confirm-row">
                                                <span className="confirm-label"><i className="ri-bank-card-line" /> Account</span>
                                                <span className="confirm-value monospace">{selectedAcc?.accountNumber || '—'}</span>
                                            </div>
                                            <div className="confirm-row">
                                                <span className="confirm-label"><i className="ri-bank-fill" /> Type</span>
                                                <span className="confirm-value">{selectedAcc?.accountType || '—'}</span>
                                            </div>
                                            {referenceNote && (
                                                <div className="confirm-row">
                                                    <span className="confirm-label"><i className="ri-file-text-line" /> Reference</span>
                                                    <span className="confirm-value">{referenceNote}</span>
                                                </div>
                                            )}
                                            <div className="confirm-row">
                                                <span className="confirm-label"><i className="ri-time-line" /> Status</span>
                                                <span className="confirm-value" style={{ color: '#f59e0b' }}>Pending Admin Approval</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="confirm-warning" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                                        <i className="ri-information-line" />
                                        Your request will be reviewed by an admin. Funds will be credited only after approval.
                                    </div>

                                    <div className="confirm-actions">
                                        <button className="btn btn-outline" id="deposit-back-btn" onClick={() => setStep(1)}>
                                            <i className="ri-arrow-left-line" /> Back
                                        </button>
                                        <button className="btn btn-primary" id="deposit-submit-btn" onClick={handleSubmit} disabled={loading}>
                                            {loading ? <><Spinner /> Submitting…</> : <><i className="ri-send-plane-line" /> Submit Request</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3 */}
                            {step === 3 && (
                                <div id="deposit-step-3">
                                    <div className="success-state">
                                        <div className="success-icon">
                                            <i className="ri-mail-send-fill" style={{ fontSize: '72px', color: 'var(--gold)' }} />
                                            <div className="success-ring" />
                                        </div>
                                        <div className="success-title">Request Submitted!</div>
                                        <div className="success-subtitle">Your deposit request is awaiting admin approval</div>
                                        <div className="success-amount">{formatCurrency(parseFloat(amount))}</div>
                                        <div style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                                            You'll receive a notification once the admin reviews your request.
                                            Approved funds will be instantly credited to your account.
                                        </div>
                                        <div className="success-actions">
                                            <button className="btn btn-outline" onClick={reset}>
                                                <i className="ri-add-circle-line" /> New Request
                                            </button>
                                            <button className="btn btn-primary" onClick={() => setTab('history')}>
                                                <i className="ri-file-list-3-line" /> View My Requests
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info panel */}
                    <div className="transfer-info-col">
                        <div className="info-card glass-card">
                            <div className="info-icon"><i className="ri-shield-check-fill" /></div>
                            <div className="info-title">Secure Deposit Process</div>
                            <p className="info-desc">
                                For your security, all deposits require admin approval. This prevents unauthorized credits and ensures full auditability.
                            </p>
                        </div>
                        <div className="info-card glass-card">
                            <div className="info-icon" style={{ color: 'var(--gold)' }}><i className="ri-time-fill" /></div>
                            <div className="info-title">Processing Time</div>
                            <p className="info-desc">
                                Requests are typically reviewed within 1 business day. You'll receive a notification once approved.
                            </p>
                        </div>
                        <div className="info-card glass-card">
                            <div className="info-icon" style={{ color: 'var(--green)' }}><i className="ri-file-list-3-line" /></div>
                            <div className="info-title">Track Your Requests</div>
                            <p className="info-desc">
                                View all your pending, approved, and rejected requests in the "My Requests" tab.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* History tab */}
            {tab === 'history' && (
                <div>
                    {reqLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div>
                    ) : requests.length === 0 ? (
                        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
                            <i className="ri-inbox-line" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px', display: 'block' }} />
                            <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>No deposit requests yet</div>
                            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setTab('new')}>
                                <i className="ri-add-circle-line" /> Submit Your First Request
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {requests.map(req => {
                                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                                return (
                                    <div key={req._id} className="glass-card" style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '4px' }}>
                                                    {formatCurrency(req.amount)}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                                    {req.account?.accountNumber ? `Account …${req.account.accountNumber.slice(-4)}` : 'Account'}
                                                    {' · '}
                                                    {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                {req.referenceNote && (
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                                                        <i className="ri-file-text-line" /> {req.referenceNote}
                                                    </div>
                                                )}
                                                {req.adminNote && req.status !== 'PENDING' && (
                                                    <div style={{ color: req.status === 'REJECTED' ? '#f87171' : 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                                                        <i className="ri-admin-line" /> Admin: {req.adminNote}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                background: cfg.bg, border: `1px solid ${cfg.border}`,
                                                borderRadius: '999px', padding: '6px 14px',
                                                color: cfg.color, fontSize: '13px', fontWeight: '600',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <i className={cfg.icon} />
                                                {cfg.label}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
}
