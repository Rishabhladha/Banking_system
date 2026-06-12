import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { accountsApi } from '../api/accounts';
import { formatCurrency } from '../utils';
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Statement() {
    const showToast = useToastContext();
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [entries, setEntries] = useState([]);
    const [balance, setBalance] = useState(null);
    const [accountInfo, setAccountInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [accLoading, setAccLoading] = useState(true);
    const [filters, setFilters] = useState({ type: '', from: '', to: '' });

    const loadAccounts = useCallback(async () => {
        try {
            const data = await accountsApi.getAll();
            setAccounts(data.accounts || []);
            if (data.accounts?.length > 0) setSelectedAccount(data.accounts[0]._id);
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setAccLoading(false); }
    }, [showToast]);

    useEffect(() => { loadAccounts(); }, [loadAccounts]);

    const fetchStatement = useCallback(async () => {
        if (!selectedAccount) return;
        setLoading(true);
        try {
            const params = {};
            if (filters.type) params.type = filters.type;
            if (filters.from) params.from = filters.from;
            if (filters.to) params.to = filters.to;
            const data = await accountsApi.getStatement(selectedAccount, params);
            setEntries(data.entries || []);
            setBalance(data.balance);
            setAccountInfo(data.account);
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [selectedAccount, filters, showToast]);

    useEffect(() => { fetchStatement(); }, [selectedAccount]);

    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    const totalDebit  = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);

    return (
        <Layout title="Account Statement" subtitle="View and filter your complete transaction history"
            headerRight={<button className="btn btn-outline btn-sm" onClick={fetchStatement}><i className="ri-refresh-line" /> Refresh</button>}>

            {accLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div> : (
                <>
                    {/* Account selector */}
                    <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: '0 0 220px' }}>
                                <label className="form-label">Account</label>
                                <select className="form-input" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} id="stmt-account-select">
                                    {accounts.map(a => <option key={a._id} value={a._id}>{a.accountNumber} — {a.accountType}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: '0 0 130px' }}>
                                <label className="form-label">Type</label>
                                <select className="form-input" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                                    <option value="">All</option>
                                    <option value="CREDIT">Credit</option>
                                    <option value="DEBIT">Debit</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: '0 0 160px' }}>
                                <label className="form-label">From Date</label>
                                <input type="date" className="form-input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ flex: '0 0 160px' }}>
                                <label className="form-label">To Date</label>
                                <input type="date" className="form-input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
                            </div>
                            <button className="btn btn-primary" style={{ marginBottom: '0' }} onClick={fetchStatement} id="apply-filter-btn">
                                <i className="ri-filter-fill" /> Apply
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
                        {[
                            { label: 'Current Balance', value: balance !== null ? formatCurrency(balance) : '—', color: 'var(--purple-light)', icon: 'ri-wallet-3-fill' },
                            { label: 'Total Credits', value: formatCurrency(totalCredit), color: 'var(--green)', icon: 'ri-arrow-down-circle-fill' },
                            { label: 'Total Debits', value: formatCurrency(totalDebit), color: 'var(--red)', icon: 'ri-arrow-up-circle-fill' },
                        ].map(s => (
                            <div key={s.label} className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: s.color, flexShrink: 0 }}>
                                    <i className={s.icon} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{s.label}</div>
                                    <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Entries */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div>
                    ) : entries.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">No transactions found</div>
                            <p style={{ fontSize: '14px' }}>Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="tx-list-wrapper">
                            {entries.map(e => {
                                const d = new Date(e.createdAt);
                                return (
                                    <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: e.type === 'CREDIT' ? 'var(--green-glow)' : 'var(--red-glow)', color: e.type === 'CREDIT' ? 'var(--green)' : 'var(--red)' }}>
                                            <i className={e.type === 'CREDIT' ? 'ri-arrow-down-line' : 'ri-arrow-up-line'} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                                {e.transaction?.note || (e.type === 'CREDIT' ? 'Credit' : 'Debit')}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {d.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: e.type === 'CREDIT' ? 'var(--green)' : 'var(--red)' }}>
                                                {e.type === 'CREDIT' ? '+' : '-'}{formatCurrency(e.amount)}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{e.type}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                >
                                    <i className="ri-download-line" style={{ fontSize: "18px" }} /> Download CSV
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                    onClick={() => window.print()}
                                >
                                    <i className="ri-download-line" style={{ fontSize: "18px" }} /> Download PDF
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Layout>
    );
}
