import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToastContext } from '../context/ToastContext';
import { accountsApi } from '../api/accounts';
import { transactionsApi } from '../api/transactions';
import { formatCurrency, formatDate, truncateId } from '../utils';

const FILTERS = ['all', 'COMPLETED', 'PENDING', 'FAILED', 'REVERSED'];

export default function Transactions() {
    const [searchParams] = useSearchParams();
    const showToast = useToastContext();
    const preAccountId = searchParams.get('account');

    const [accounts, setAccounts] = useState([]);
    const [selectedId, setSelectedId] = useState(preAccountId || '');
    const [transactions, setTransactions] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    // Load accounts into selector
    useEffect(() => {
        (async () => {
            try {
                const data = await accountsApi.getAll();
                setAccounts(data.accounts || []);
            } catch (err) {
                showToast('Could not load accounts: ' + err.message, 'error');
            }
        })();
    }, [showToast]);

    // Load transactions for selected account
    const loadTransactions = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setShowSummary(false);
        try {
            const data = await transactionsApi.getHistory(id);
            setTransactions(data.transactions || []);
            setShowSummary(true);
        } catch (err) {
            showToast('Failed to load transactions: ' + err.message, 'error');
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    // Auto-load if pre-selected
    useEffect(() => {
        if (preAccountId) loadTransactions(preAccountId);
    }, [preAccountId, loadTransactions]);

    const handleAccountChange = (id) => {
        setSelectedId(id);
        if (id) loadTransactions(id);
        else { setTransactions([]); setShowSummary(false); }
    };

    const filtered = filter === 'all'
        ? transactions
        : transactions.filter(t => t.status === filter);

    const totalIn  = transactions.filter(t => t.toAccount === selectedId).reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.toAccount !== selectedId).reduce((s, t) => s + t.amount, 0);

    return (
        <Layout title="Transaction History" subtitle="View and filter all transactions across your accounts">
            {/* Controls */}
            <div className="tx-controls">
                <div className="form-group" style={{ flex: 1, maxWidth: '400px' }}>
                    <label className="form-label" htmlFor="account-select">Select Account</label>
                    <select
                        id="account-select"
                        className="form-input"
                        value={selectedId}
                        onChange={e => handleAccountChange(e.target.value)}
                    >
                        <option value="">— Choose an account —</option>
                        {accounts.map(a => (
                            <option key={a._id} value={a._id}>
                                {truncateId(a._id)} &nbsp;|&nbsp; {a.currency} &nbsp;|&nbsp; {a.status}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary bar */}
            {showSummary && (
                <div className="tx-summary" id="tx-summary" style={{ marginBottom: '20px' }}>
                    <div className="tx-summary-item">
                        <span className="tx-summary-label">Total In</span>
                        <span className="tx-summary-value text-green">{formatCurrency(totalIn)}</span>
                    </div>
                    <div className="tx-summary-divider" />
                    <div className="tx-summary-item">
                        <span className="tx-summary-label">Total Out</span>
                        <span className="tx-summary-value text-red">{formatCurrency(totalOut)}</span>
                    </div>
                    <div className="tx-summary-divider" />
                    <div className="tx-summary-item">
                        <span className="tx-summary-label">Count</span>
                        <span className="tx-summary-value" id="tx-count">{transactions.length}</span>
                    </div>
                </div>
            )}

            {/* Filter bar */}
            {showSummary && (
                <div className="tx-filter-bar" id="tx-filter-bar">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            className={`filter-btn${filter === f ? ' active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            )}

            {/* Transaction list */}
            <div className="tx-list" id="tx-list">
                {!selectedId ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><i className="ri-bank-card-2-line" /></div>
                        <div className="empty-state-title">Select an account</div>
                        <p className="text-muted" style={{ fontSize: '14px' }}>Choose an account above to view its transactions.</p>
                    </div>
                ) : loading ? (
                    <div className="tx-list-wrapper">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="tx-skeleton">
                                <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton" style={{ height: '14px', width: '140px', marginBottom: '8px' }} />
                                    <div className="skeleton" style={{ height: '11px', width: '200px' }} />
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="skeleton" style={{ height: '16px', width: '80px', marginBottom: '8px', marginLeft: 'auto' }} />
                                    <div className="skeleton" style={{ height: '11px', width: '60px', marginLeft: 'auto' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><i className="ri-file-list-3-line" /></div>
                        <div className="empty-state-title">No transactions found</div>
                        <p className="text-muted" style={{ fontSize: '14px' }}>
                            {filter === 'all' ? 'No transactions on this account yet.' : `No ${filter.toLowerCase()} transactions.`}
                        </p>
                    </div>
                ) : (
                    <div className="tx-list-wrapper">
                        {filtered.map((tx, i) => {
                            const isCredit = tx.toAccount === selectedId;
                            const dir = isCredit ? 'credit' : 'debit';
                            const dirIcon = isCredit ? 'ri-arrow-down-line' : 'ri-arrow-up-line';
                            const dirLabel = isCredit ? 'Received' : 'Sent';
                            const prefix = isCredit ? '+' : '-';
                            const otherParty = isCredit
                                ? `From: ${truncateId(tx.fromAccount)}`
                                : `To: ${truncateId(tx.toAccount)}`;

                            return (
                                <div key={tx._id} className="tx-item" style={{ animationDelay: `${i * 0.04}s` }}>
                                    <div className={`tx-direction-icon ${dir}`}>
                                        <i className={dirIcon} />
                                    </div>
                                    <div className="tx-info">
                                        <div className="tx-type">
                                            {dirLabel}&nbsp;&nbsp;
                                            <span className={`badge badge-${tx.status.toLowerCase()}`}>{tx.status}</span>
                                        </div>
                                        <div className="tx-meta tx-monospace">{otherParty}</div>
                                    </div>
                                    <div className="tx-right">
                                        <div className={`tx-amount ${dir}`}>{prefix}{formatCurrency(tx.amount)}</div>
                                        <div className="tx-date">{formatDate(tx.createdAt)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}
