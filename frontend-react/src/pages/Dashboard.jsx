import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { accountsApi } from '../api/accounts';
import { formatCurrency, truncateId } from '../utils';

export default function Dashboard() {
    const { user } = useAuth();
    const showToast = useToastContext();

    const [accounts, setAccounts] = useState([]);
    const [balances, setBalances] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const data = await accountsApi.getAll();
            const accs = data.accounts || [];
            setAccounts(accs);

            // Fetch all balances in parallel
            const results = await Promise.allSettled(accs.map(a => accountsApi.getBalance(a._id)));
            const balMap = {};
            accs.forEach((a, i) => {
                balMap[a._id] = results[i].status === 'fulfilled' ? results[i].value.balance : null;
            });
            setBalances(balMap);
        } catch (err) {
            showToast('Failed to load accounts: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const totalBalance = Object.values(balances).reduce((sum, b) => sum + (b ?? 0), 0);
    const activeCount = accounts.filter(a => a.status === 'ACTIVE').length;

    const handleCreateAccount = async () => {
        setCreating(true);
        try {
            await accountsApi.create();
            showToast('New account created successfully! 🎉', 'success');
            setShowModal(false);
            loadDashboard();
        } catch (err) {
            showToast('Failed to create account: ' + err.message, 'error');
        } finally {
            setCreating(false);
        }
    };

    const copyId = (id) => {
        navigator.clipboard.writeText(id).then(() => showToast('Account ID copied!', 'info'));
    };

    return (
        <Layout
            title="Dashboard"
            subtitle={`Welcome back, ${user?.name || 'User'} — here's your financial overview`}
            headerRight={
                <button className="btn btn-primary btn-sm" id="create-account-btn" onClick={() => setShowModal(true)}>
                    <i className="ri-add-line" /> New Account
                </button>
            }
        >
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '20px', marginBottom: '32px' }} id="stats-grid">
                <div className="stat-card glass-card">
                    <div className="stat-icon" style={{ background: 'rgba(124,58,237,.15)', color: 'var(--purple-light)' }}>
                        <i className="ri-bank-card-fill" />
                    </div>
                    <div className="stat-label">Total Accounts</div>
                    <div className="stat-value">{accounts.length}</div>
                    <div className="stat-sub">{activeCount} active</div>
                </div>
                <div className="stat-card glass-card" id="total-balance-card">
                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,.12)', color: 'var(--gold)' }}>
                        <i className="ri-money-dollar-circle-fill" />
                    </div>
                    <div className="stat-label">Total Balance</div>
                    <div className="stat-value" id="total-balance-value" style={{ fontSize: '24px' }}>
                        {loading ? 'Loading…' : formatCurrency(totalBalance)}
                    </div>
                    <div className="stat-sub">Across all accounts</div>
                </div>
                <div className="stat-card glass-card">
                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,.12)', color: 'var(--green)' }}>
                        <i className="ri-shield-check-fill" />
                    </div>
                    <div className="stat-label">Account Status</div>
                    <div className="stat-value" style={{ fontSize: '22px' }}>{activeCount > 0 ? '✓ Active' : '—'}</div>
                    <div className="stat-sub">{activeCount} of {accounts.length} active</div>
                </div>
            </div>

            {/* Accounts */}
            <div className="section-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="section-title-sm">Your Accounts</div>
            </div>
            <div className="accounts-grid" id="accounts-grid">
                {loading ? (
                    [0, 1].map(i => (
                        <div key={i} className="account-card glass-card">
                            <div className="skeleton" style={{ height: '14px', width: '80px', marginBottom: '16px' }} />
                            <div className="skeleton" style={{ height: '32px', width: '150px', marginBottom: '20px' }} />
                            <div className="skeleton" style={{ height: '12px', width: '60px' }} />
                        </div>
                    ))
                ) : accounts.length === 0 ? (
                    <div className="no-accounts">
                        <div className="no-accounts-icon">🏦</div>
                        <div className="section-title-sm" style={{ marginBottom: '8px' }}>No accounts yet</div>
                        <p className="text-secondary" style={{ marginBottom: '20px', fontSize: '14px' }}>
                            Create your first bank account to start making transfers.
                        </p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <i className="ri-add-line" /> Create Account
                        </button>
                    </div>
                ) : accounts.map(acc => {
                    const balance = balances[acc._id];
                    const statusBadge = acc.status === 'ACTIVE'
                        ? <span className="badge badge-active">● Active</span>
                        : <span className="badge badge-frozen">{acc.status}</span>;
                    return (
                        <div key={acc._id} className="account-card glass-card" data-id={acc._id}>
                            <div className="account-card-glow" />
                            <div className="ac-header">
                                <div className="ac-id">ID: {truncateId(acc._id)}</div>
                                {statusBadge}
                            </div>
                            <div className="ac-balance-label">Available Balance</div>
                            <div className={`ac-balance${balance === null ? ' loading' : ''}`}>
                                {balance !== null ? formatCurrency(balance, acc.currency) : 'Fetching…'}
                            </div>
                            <div className="ac-footer">
                                <span className="ac-currency">Currency: {acc.currency}</span>
                                <div className="ac-actions">
                                    <button className="btn btn-outline btn-sm" onClick={() => copyId(acc._id)} title="Copy Account ID">
                                        <i className="ri-file-copy-line" />
                                    </button>
                                    <Link to={`/transactions?account=${acc._id}`} className="btn btn-ghost btn-sm" title="View transactions">
                                        <i className="ri-history-line" />
                                    </Link>
                                    <Link to={`/deposit?account=${acc._id}`} className="btn btn-green btn-sm" title="Deposit">
                                        <i className="ri-add-circle-line" />
                                    </Link>
                                    <Link to={`/transfer?from=${acc._id}`} className="btn btn-primary btn-sm" title="Send money">
                                        <i className="ri-send-plane-fill" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="section-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="section-title-sm">Quick Actions</div>
            </div>
            <div className="qa-grid">
                <button className="qa-card glass-card" id="qa-create-account" onClick={() => setShowModal(true)}>
                    <div className="qa-icon" style={{ background: 'rgba(124,58,237,.15)', color: 'var(--purple-light)' }}>
                        <i className="ri-add-circle-fill" />
                    </div>
                    <div className="qa-label">New Account</div>
                </button>
                <Link to="/deposit" className="qa-card glass-card">
                    <div className="qa-icon" style={{ background: 'rgba(16,185,129,.12)', color: 'var(--green)' }}>
                        <i className="ri-bank-fill" />
                    </div>
                    <div className="qa-label">Deposit</div>
                </Link>
                <Link to="/transfer" className="qa-card glass-card">
                    <div className="qa-icon" style={{ background: 'rgba(245,158,11,.12)', color: 'var(--gold)' }}>
                        <i className="ri-send-plane-fill" />
                    </div>
                    <div className="qa-label">Transfer</div>
                </Link>
                <Link to="/transactions" className="qa-card glass-card">
                    <div className="qa-icon" style={{ background: 'rgba(6,182,212,.12)', color: 'var(--cyan)' }}>
                        <i className="ri-history-line" />
                    </div>
                    <div className="qa-label">History</div>
                </Link>
            </div>

            {/* Create Account Modal */}
            {showModal && (
                <div className="modal-overlay" id="modal-create" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal glass-card">
                        <div className="modal-header">
                            <div className="modal-title">
                                <i className="ri-bank-card-fill" style={{ color: 'var(--purple-light)' }} />
                                Create New Account
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                                <i className="ri-close-line" />
                            </button>
                        </div>
                        <p className="modal-body-text">
                            A new INR bank account will be created and linked to your profile. You can create multiple accounts and transfer between them.
                        </p>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" id="confirm-create-btn" onClick={handleCreateAccount} disabled={creating}>
                                {creating
                                    ? <><Spinner /> Creating…</>
                                    : <><i className="ri-add-line" /> Create Account</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
