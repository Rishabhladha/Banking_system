import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { scheduledTransfersApi } from '../api/banking';
import { accountsApi } from '../api/accounts';
import { formatCurrency } from '../utils';

export default function ScheduledTransfers() {
    const showToast = useToastContext();
    const [transfers, setTransfers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', scheduledDate: '', note: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [txData, accData] = await Promise.all([scheduledTransfersApi.getAll(), accountsApi.getAll()]);
            setTransfers(txData.transfers || []);
            setAccounts((accData.accounts || []).filter(a => a.status === 'ACTIVE'));
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await scheduledTransfersApi.create({ fromAccountId: form.fromAccountId, toAccountId: form.toAccountId, amount: parseFloat(form.amount), scheduledDate: form.scheduledDate, note: form.note });
            showToast('Scheduled transfer created!', 'success');
            setShowModal(false);
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setCreating(false); }
    };

    const handleCancel = async (id) => {
        if (!confirm('Cancel this scheduled transfer?')) return;
        try {
            await scheduledTransfersApi.cancel(id);
            showToast('Transfer cancelled', 'info');
            load();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const statusColors = { PENDING: 'var(--gold)', EXECUTED: 'var(--green)', CANCELLED: 'var(--text-muted)', FAILED: 'var(--red)' };

    return (
        <Layout title="Scheduled Transfers" subtitle="Set up future-dated automatic transfers"
            headerRight={<button className="btn btn-primary btn-sm" id="schedule-transfer-btn" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Schedule Transfer</button>}>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
            ) : transfers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">⏰</div>
                    <div className="empty-state-title">No Scheduled Transfers</div>
                    <p style={{ marginBottom: '20px', fontSize: '14px' }}>Automate future payments and transfers</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Schedule Your First Transfer</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {transfers.map(t => {
                        const d = new Date(t.scheduledDate);
                        return (
                            <div key={t._id} className="sched-card glass-card">
                                <div className="sched-date-box">
                                    <div className="sched-day">{d.getDate()}</div>
                                    <div className="sched-month">{d.toLocaleString('default', { month: 'short' })}</div>
                                </div>
                                <div className="sched-info">
                                    <div className="sched-amount">{formatCurrency(t.amount)}</div>
                                    <div className="sched-meta">
                                        {t.fromAccount?.accountNumber?.slice(-4) && `From ••••${t.fromAccount.accountNumber.slice(-4)}`}
                                        {t.toAccountNumber && ` → ••••${t.toAccountNumber.slice(-4)}`}
                                        {t.note && ` · ${t.note}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                    <span className="badge" style={{ background: `${statusColors[t.status]}18`, color: statusColors[t.status], border: `1px solid ${statusColors[t.status]}44` }}>
                                        {t.status}
                                    </span>
                                    {t.status === 'PENDING' && (
                                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(t._id)}>
                                            <i className="ri-close-line" /> Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal glass-card">
                        <div className="modal-header">
                            <div className="modal-title"><i className="ri-time-fill" style={{ color: 'var(--purple-light)' }} /> Schedule a Transfer</div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><i className="ri-close-line" /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">From Account</label>
                                    <select className="form-input" value={form.fromAccountId} onChange={e => setForm(f => ({ ...f, fromAccountId: e.target.value }))} required id="sched-from-account">
                                        <option value="">Select account</option>
                                        {accounts.map(a => <option key={a._id} value={a._id}>{a.accountNumber} — {a.accountType}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To Account</label>
                                    <select className="form-input" value={form.toAccountId} onChange={e => setForm(f => ({ ...f, toAccountId: e.target.value }))} required id="sched-to-account">
                                        <option value="">Select target account</option>
                                        {accounts.filter(a => a._id !== form.fromAccountId).map(a => <option key={a._id} value={a._id}>{a.accountNumber} — {a.accountType}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Amount (₹)</label>
                                        <input id="sched-amount" type="number" className="form-input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Scheduled Date</label>
                                        <input id="sched-date" type="datetime-local" className="form-input" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} required min={new Date().toISOString().slice(0,16)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Note (optional)</label>
                                    <input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Monthly rent payment" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" id="sched-submit-btn" disabled={creating}>
                                    {creating ? <><Spinner /> Scheduling…</> : <><i className="ri-time-fill" /> Schedule Transfer</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
