import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { fixedDepositsApi } from '../api/banking';
import { accountsApi } from '../api/accounts';
import { formatCurrency } from '../utils';

const RATE_TABLE = [
    { label: '1–3 months',  rate: '5.5%' },
    { label: '3–6 months',  rate: '6.0%' },
    { label: '6–12 months', rate: '6.75%' },
    { label: '1–2 years',   rate: '7.0%' },
    { label: '2–3 years',   rate: '7.25%' },
    { label: '3–5 years',   rate: '7.5%' },
    { label: '5–10 years',  rate: '7.75%' },
];

export default function FixedDeposits() {
    const showToast = useToastContext();
    const [fds, setFds] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [closing, setClosing] = useState(null);
    const [form, setForm] = useState({ accountId: '', principal: '', tenureMonths: '12' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [fdData, accData] = await Promise.all([fixedDepositsApi.getAll(), accountsApi.getAll()]);
            setFds(fdData.fixedDeposits || []);
            setAccounts((accData.accounts || []).filter(a => a.status === 'ACTIVE'));
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const totalInvested = fds.filter(f => f.status === 'ACTIVE').reduce((s, f) => s + f.principal, 0);
    const totalMaturity = fds.filter(f => f.status === 'ACTIVE').reduce((s, f) => s + f.maturityAmount, 0);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await fixedDepositsApi.create({ accountId: form.accountId, principal: parseFloat(form.principal), tenureMonths: parseInt(form.tenureMonths) });
            showToast('Fixed Deposit opened successfully!', 'success');
            setShowModal(false);
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setCreating(false); }
    };

    const handleClose = async (id) => {
        if (!confirm('Close this FD early? A 10% penalty on interest will apply.')) return;
        setClosing(id);
        try {
            const data = await fixedDepositsApi.close(id);
            showToast(`FD closed. ₹${data.payoutAmount?.toLocaleString('en-IN')} credited back.`, 'success');
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setClosing(null); }
    };

    const statusColor = { ACTIVE: 'var(--green)', MATURED: 'var(--gold)', CLOSED: 'var(--text-muted)' };

    return (
        <Layout title="Fixed Deposits" subtitle="Grow your savings with guaranteed returns"
            headerRight={<button className="btn btn-primary btn-sm" id="open-fd-btn" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Open FD</button>}>

            {/* Summary cards */}
            {fds.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '16px', marginBottom: '28px' }}>
                    <div className="stat-card glass-card">
                        <div className="stat-icon" style={{ background: 'rgba(124,58,237,.12)', color: 'var(--purple-light)' }}><i className="ri-safe-fill" /></div>
                        <div className="stat-label">Active FDs</div>
                        <div className="stat-value">{fds.filter(f => f.status === 'ACTIVE').length}</div>
                    </div>
                    <div className="stat-card glass-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,.12)', color: 'var(--gold)' }}><i className="ri-money-dollar-circle-fill" /></div>
                        <div className="stat-label">Total Invested</div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(totalInvested)}</div>
                    </div>
                    <div className="stat-card glass-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,.12)', color: 'var(--green)' }}><i className="ri-arrow-up-circle-fill" /></div>
                        <div className="stat-label">Total at Maturity</div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(totalMaturity)}</div>
                        <div className="stat-sub">+{formatCurrency(totalMaturity - totalInvested)} interest</div>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
            ) : fds.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏦</div>
                    <div className="empty-state-title">No Fixed Deposits</div>
                    <p style={{ marginBottom: '20px', fontSize: '14px' }}>Start earning guaranteed returns on your savings</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Open Your First FD</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
                    {fds.map(fd => (
                        <div key={fd._id} className="fd-card glass-card">
                            <div className="fd-header">
                                <div>
                                    <div className="fd-number">{fd.fdNumber}</div>
                                    <span className="badge" style={{ background: `${statusColor[fd.status]}22`, color: statusColor[fd.status], border: `1px solid ${statusColor[fd.status]}44`, marginTop: '6px' }}>
                                        ● {fd.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '28px' }}>🏦</div>
                            </div>
                            <div className="fd-amount">{formatCurrency(fd.principal)}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Principal Amount</div>
                            <div className="fd-meta">
                                <div className="fd-meta-item">
                                    <label>Interest Rate</label>
                                    <span style={{ color: 'var(--green)' }}>{fd.interestRate}% p.a.</span>
                                </div>
                                <div className="fd-meta-item">
                                    <label>Tenure</label>
                                    <span>{fd.tenureMonths} months</span>
                                </div>
                                <div className="fd-meta-item">
                                    <label>Maturity Amount</label>
                                    <span style={{ color: 'var(--gold)' }}>{formatCurrency(fd.maturityAmount)}</span>
                                </div>
                                <div className="fd-meta-item">
                                    <label>Maturity Date</label>
                                    <span>{new Date(fd.maturityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                            {fd.status === 'ACTIVE' && (
                                <button className="btn btn-danger btn-sm btn-full" style={{ marginTop: '16px' }} onClick={() => handleClose(fd._id)} disabled={closing === fd._id}>
                                    {closing === fd._id ? <><Spinner /> Closing…</> : <><i className="ri-close-circle-line" /> Close Early</>}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Open FD Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal glass-card" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <div className="modal-title"><i className="ri-safe-fill" style={{ color: 'var(--gold)' }} /> Open Fixed Deposit</div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><i className="ri-close-line" /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">From Account</label>
                                    <select className="form-input" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} required id="fd-account-select">
                                        <option value="">Select account</option>
                                        {accounts.map(a => <option key={a._id} value={a._id}>{a.accountNumber} — {a.accountType}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Amount (₹)</label>
                                        <input id="fd-amount" type="number" className="form-input" value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))} required min="1000" placeholder="Min ₹1,000" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tenure (months)</label>
                                        <select className="form-input" value={form.tenureMonths} onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))}>
                                            {[1,3,6,12,18,24,36,60,84,120].map(m => <option key={m} value={m}>{m} months</option>)}
                                        </select>
                                    </div>
                                </div>
                                {/* Rate table */}
                                <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: 'var(--text-secondary)' }}>INTEREST RATE TABLE</div>
                                    {RATE_TABLE.map(r => (
                                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                                            <span style={{ color: 'var(--gold)', fontWeight: '600' }}>{r.rate}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-gold" id="open-fd-confirm-btn" disabled={creating}>
                                    {creating ? <><Spinner /> Opening…</> : <><i className="ri-safe-fill" /> Open FD</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
