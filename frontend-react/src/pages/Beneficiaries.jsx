import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { beneficiariesApi } from '../api/banking';
import { truncateId } from '../utils';

export default function Beneficiaries() {
    const showToast = useToastContext();
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ accountNumber: '', nickname: '', bankName: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await beneficiariesApi.getAll();
            setBeneficiaries(data.beneficiaries || []);
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await beneficiariesApi.add(form);
            showToast('Beneficiary added!', 'success');
            setShowModal(false);
            setForm({ accountNumber: '', nickname: '', bankName: '' });
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this beneficiary?')) return;
        try {
            await beneficiariesApi.remove(id);
            showToast('Beneficiary removed', 'info');
            setBeneficiaries(b => b.filter(x => x._id !== id));
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const colors = ['#7c3aed','#10b981','#f59e0b','#06b6d4','#ef4444','#8b5cf6'];

    return (
        <Layout title="Beneficiaries" subtitle="Manage your saved payees for quick transfers"
            headerRight={<button className="btn btn-primary btn-sm" id="add-beneficiary-btn" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Add Beneficiary</button>}>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
            ) : beneficiaries.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">No beneficiaries yet</div>
                    <p style={{ marginBottom: '20px', fontSize: '14px' }}>Save payees for faster money transfers</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><i className="ri-add-line" /> Add Your First Beneficiary</button>
                </div>
            ) : (
                <div className="beneficiary-grid">
                    {beneficiaries.map((b, i) => (
                        <div key={b._id} className="beneficiary-card glass-card">
                            <div className="beneficiary-avatar" style={{ background: `linear-gradient(135deg,${colors[i % colors.length]},${colors[(i+2) % colors.length]})` }}>
                                {b.nickname[0].toUpperCase()}
                            </div>
                            <div className="beneficiary-info">
                                <div className="beneficiary-name">{b.nickname}</div>
                                <div className="beneficiary-acc">{b.accountNumber}</div>
                                <div className="beneficiary-bank">{b.bankName} · {b.ifscCode}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <a href={`/transfer?to=${b.accountId || ''}&toNum=${b.accountNumber}`} className="btn btn-primary btn-sm" title="Send Money">
                                    <i className="ri-send-plane-fill" />
                                </a>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b._id)} title="Remove">
                                    <i className="ri-delete-bin-line" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal glass-card">
                        <div className="modal-header">
                            <div className="modal-title"><i className="ri-contacts-fill" style={{ color: 'var(--purple-light)' }} />Add Beneficiary</div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><i className="ri-close-line" /></button>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Account Number</label>
                                    <input id="bene-acc-number" className="form-input" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} required placeholder="12-digit account number" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nickname / Name</label>
                                    <input id="bene-nickname" className="form-input" value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} required placeholder="e.g. Mom, Office, John" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Bank Name (optional)</label>
                                    <input className="form-input" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="Default: NexaBank" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" id="save-beneficiary-btn" disabled={saving}>
                                    {saving ? <><Spinner /> Saving…</> : <><i className="ri-save-line" /> Save Beneficiary</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
