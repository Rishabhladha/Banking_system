import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';
import { formatCurrency } from '../../utils';

const KYC_COLORS = { VERIFIED: 'var(--green)', PENDING: 'var(--gold)', REJECTED: 'var(--red)' };
const ACC_STATUS_COLORS = { ACTIVE: 'var(--green)', FROZEN: 'var(--gold)', CLOSED: 'var(--red)' };

export default function AdminCustomerDetail() {
    const { id } = useParams();
    const showToast = useToastContext();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [kycNote, setKycNote] = useState('');
    const [verifying, setVerifying] = useState(null);
    const [freezingAcc, setFreezingAcc] = useState(null);
    const [depositAcc, setDepositAcc] = useState({ accountId: '', amount: '', reason: '' });
    const [depositing, setDepositing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.getCustomerDetail(id);
            setData(result);
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [id, showToast]);

    useEffect(() => { load(); }, [load]);

    const handleKyc = async (status) => {
        setVerifying(status);
        try {
            await adminApi.updateKyc(id, { status, note: kycNote });
            showToast(`KYC ${status.toLowerCase()} successfully`, 'success');
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setVerifying(null); }
    };

    const handleAccountStatus = async (accountId, status) => {
        if (!confirm(`${status} this account?`)) return;
        setFreezingAcc(accountId);
        try {
            await adminApi.changeAccountStatus(accountId, { status });
            showToast(`Account ${status.toLowerCase()} successfully`, 'success');
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setFreezingAcc(null); }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        setDepositing(true);
        try {
            await adminApi.adminDeposit({ accountId: depositAcc.accountId, amount: parseFloat(depositAcc.amount), reason: depositAcc.reason });
            showToast('Deposit successful!', 'success');
            setDepositAcc({ accountId: '', amount: '', reason: '' });
            load();
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setDepositing(false); }
    };

    if (loading) return (
        <AdminLayout title="Customer Detail" subtitle="Loading…">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
        </AdminLayout>
    );

    if (!data) return null;
    const { customer, accounts, recentTransactions, loans } = data;

    return (
        <AdminLayout title={customer.name} subtitle={customer.email}
            headerRight={<Link to="/admin/customers" className="btn btn-outline btn-sm"><i className="ri-arrow-left-line" /> Back to Customers</Link>}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Customer Info */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>CUSTOMER INFO</h3>
                    {[
                        { label: 'Name', value: customer.name },
                        { label: 'Email', value: customer.email },
                        { label: 'Phone', value: customer.phone || '—' },
                        { label: 'DOB', value: customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString('en-IN') : '—' },
                        { label: 'Joined', value: new Date(customer.createdAt).toLocaleDateString('en-IN') },
                        { label: 'Role', value: customer.role },
                    ].map(r => (
                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                            <span style={{ fontWeight: '500' }}>{r.value}</span>
                        </div>
                    ))}
                </div>

                {/* KYC Section */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>KYC MANAGEMENT</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px' }}>Current Status:</span>
                        <span className="badge" style={{ background: `${KYC_COLORS[customer.kycStatus]}18`, color: KYC_COLORS[customer.kycStatus], border: `1px solid ${KYC_COLORS[customer.kycStatus]}40` }}>
                            ● {customer.kycStatus}
                        </span>
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="form-label">Admin Note</label>
                        <input className="form-input" value={kycNote} onChange={e => setKycNote(e.target.value)} placeholder="Reason or note for customer" />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handleKyc('VERIFIED')} disabled={verifying === 'VERIFIED' || customer.kycStatus === 'VERIFIED'} id="verify-kyc-btn">
                            {verifying === 'VERIFIED' ? <Spinner /> : <i className="ri-shield-check-fill" />} Verify KYC
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleKyc('REJECTED')} disabled={verifying === 'REJECTED'} id="reject-kyc-btn">
                            {verifying === 'REJECTED' ? <Spinner /> : <i className="ri-close-circle-fill" />} Reject
                        </button>
                    </div>
                </div>
            </div>

            {/* Accounts */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>ACCOUNTS ({accounts.length})</h3>
                {accounts.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No accounts</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '12px' }}>
                        {accounts.map(acc => (
                            <div key={acc._id} className="glass-card" style={{ padding: '16px', border: `1px solid ${ACC_STATUS_COLORS[acc.status]}30` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{acc.accountNumber}</span>
                                    <span className="badge" style={{ background: `${ACC_STATUS_COLORS[acc.status]}18`, color: ACC_STATUS_COLORS[acc.status], fontSize: '10px' }}>
                                        {acc.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>{formatCurrency(acc.balance || 0)}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>{acc.accountType} Account</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {acc.status !== 'FROZEN' && acc.status !== 'CLOSED' && (
                                        <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleAccountStatus(acc._id, 'FROZEN')} disabled={freezingAcc === acc._id}>
                                            <i className="ri-lock-fill" /> Freeze
                                        </button>
                                    )}
                                    {acc.status === 'FROZEN' && (
                                        <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handleAccountStatus(acc._id, 'ACTIVE')} disabled={freezingAcc === acc._id}>
                                            <i className="ri-lock-unlock-fill" /> Unfreeze
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Admin Deposit */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>MANUAL DEPOSIT</h3>
                <form onSubmit={handleDeposit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: '0 0 200px' }}>
                        <label className="form-label">Account</label>
                        <select className="form-input" value={depositAcc.accountId} onChange={e => setDepositAcc(d => ({ ...d, accountId: e.target.value }))} required id="admin-deposit-account">
                            <option value="">Select account</option>
                            {accounts.filter(a => a.status === 'ACTIVE').map(a => <option key={a._id} value={a._id}>{a.accountNumber}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: '0 0 150px' }}>
                        <label className="form-label">Amount (₹)</label>
                        <input id="admin-deposit-amount" type="number" className="form-input" min="1" value={depositAcc.amount} onChange={e => setDepositAcc(d => ({ ...d, amount: e.target.value }))} required placeholder="Amount" />
                    </div>
                    <div className="form-group" style={{ flex: '1' }}>
                        <label className="form-label">Reason</label>
                        <input className="form-input" value={depositAcc.reason} onChange={e => setDepositAcc(d => ({ ...d, reason: e.target.value }))} placeholder="Reason for deposit…" />
                    </div>
                    <button type="submit" className="btn btn-success" disabled={depositing} id="admin-deposit-btn">
                        {depositing ? <><Spinner /> Depositing…</> : <><i className="ri-add-circle-fill" /> Deposit</>}
                    </button>
                </form>
            </div>

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
                <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>RECENT TRANSACTIONS</h3>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>ID</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                            <tbody>
                                {recentTransactions.map(tx => (
                                    <tr key={tx._id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{tx._id.slice(-8)}</td>
                                        <td style={{ fontWeight: '700' }}>{formatCurrency(tx.amount)}</td>
                                        <td style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-secondary)' }}>{tx.transactionType || 'TRANSFER'}</td>
                                        <td><span className="badge" style={{ fontSize: '10px' }}>{tx.status}</span></td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Loans */}
            {loans.length > 0 && (
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>LOANS ({loans.length})</h3>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Loan #</th><th>Type</th><th>Amount</th><th>Rate</th><th>EMI</th><th>Status</th></tr></thead>
                            <tbody>
                                {loans.map(loan => (
                                    <tr key={loan._id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{loan.loanNumber}</td>
                                        <td>{loan.loanType}</td>
                                        <td style={{ fontWeight: '600' }}>{formatCurrency(loan.amount)}</td>
                                        <td style={{ color: 'var(--gold)' }}>{loan.interestRate ? `${loan.interestRate}%` : '—'}</td>
                                        <td>{loan.emi ? formatCurrency(loan.emi) : '—'}</td>
                                        <td><span className="badge" style={{ fontSize: '10px' }}>{loan.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
