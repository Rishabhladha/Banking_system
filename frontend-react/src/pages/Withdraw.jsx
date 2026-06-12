import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { accountsApi } from '../api/accounts';
import { formatCurrency } from '../utils';
import { useSearchParams } from 'react-router-dom';

export default function Withdraw() {
    const showToast = useToastContext();
    const [searchParams] = useSearchParams();

    const [accounts, setAccounts] = useState([]);
    const [balances, setBalances] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [selectedAccount, setSelectedAccount] = useState(searchParams.get('account') || '');
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState(1);  // 1=form, 2=confirm, 3=success
    const [withdrawnAmount, setWithdrawnAmount] = useState(0);
    const [newBalance, setNewBalance] = useState(0);

    const loadAccounts = useCallback(async () => {
        try {
            const data = await accountsApi.getAll();
            const accs = (data.accounts || []).filter(a => a.status === 'ACTIVE');
            setAccounts(accs);
            const results = await Promise.allSettled(accs.map(a => accountsApi.getBalance(a._id)));
            const balMap = {};
            accs.forEach((a, i) => { balMap[a._id] = results[i].status === 'fulfilled' ? results[i].value.balance : null; });
            setBalances(balMap);
            if (!selectedAccount && accs.length > 0) setSelectedAccount(accs[0]._id);
        } catch (err) {
            showToast('Failed to load accounts: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast, selectedAccount]);

    useEffect(() => { loadAccounts(); }, []);

    const handleNext = () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
        if (!selectedAccount) return showToast('Please select an account', 'error');
        const bal = balances[selectedAccount];
        if (bal !== null && bal !== undefined && amt > bal) {
            return showToast(`Insufficient balance. Available: ${formatCurrency(bal)}`, 'error');
        }
        if (amt > 500_000) return showToast('Maximum single withdrawal is ₹5,00,000', 'error');
        setStep(2);
    };

    const handleWithdraw = async () => {
        const amt = parseFloat(amount);
        setSubmitting(true);
        try {
            const data = await accountsApi.withdraw(selectedAccount, amt);
            setWithdrawnAmount(data.withdrawn);
            setNewBalance(data.newBalance);
            setBalances(prev => ({ ...prev, [selectedAccount]: data.newBalance }));
            setStep(3);
            showToast(`₹${amt.toLocaleString('en-IN')} withdrawn successfully!`, 'success');
        } catch (err) {
            showToast(err.message, 'error');
            setStep(1);
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setAmount('');
        setStep(1);
    };

    const selectedBalance = balances[selectedAccount];
    const selectedAcc = accounts.find(a => a._id === selectedAccount);
    const quickAmounts = [500, 1000, 2000, 5000, 10000, 20000];

    return (
        <Layout title="Withdraw" subtitle="Withdraw cash from your account">
            <div className="transfer-layout">
                <div>
                    <div className="transfer-card glass-card">
                        {/* Step indicators */}
                        <div className="transfer-steps">
                            {[{ n: 1, label: 'Details' }, { n: 2, label: 'Confirm' }, { n: 3, label: 'Done' }].map((s, i) => (
                                <>
                                    {i > 0 && <div key={`line-${s.n}`} className={`t-step-line${step > s.n - 1 ? ' done' : ''}`} />}
                                    <div key={s.n} className={`t-step${step >= s.n ? (step > s.n ? ' done' : ' active') : ''}`}>
                                        <div className="t-step-circle">{step > s.n ? <i className="ri-check-line" /> : s.n}</div>
                                        <div className="t-step-label">{s.label}</div>
                                    </div>
                                </>
                            ))}
                        </div>

                        {/* Step 1 — Form */}
                        {step === 1 && (
                            <div id="withdraw-step-1">
                                <div className="transfer-section-title">Withdrawal Details</div>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>
                                ) : (
                                    <div className="form-stack-lg">
                                        <div className="form-group">
                                            <label className="form-label">From Account</label>
                                            <select className="form-input" value={selectedAccount}
                                                onChange={e => setSelectedAccount(e.target.value)}
                                                required id="withdraw-account-select">
                                                <option value="">Select account</option>
                                                {accounts.map(a => (
                                                    <option key={a._id} value={a._id}>
                                                        {a.accountNumber} — {a.accountType}
                                                        {balances[a._id] != null ? ` (${formatCurrency(balances[a._id])})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {selectedAccount && selectedBalance !== null && selectedBalance !== undefined && (
                                                <div className="account-balance-display">
                                                    <i className="ri-wallet-3-line" />
                                                    Available Balance: <strong>{formatCurrency(selectedBalance)}</strong>
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label" htmlFor="withdraw-amount">Amount (₹)</label>
                                            <div className="amount-input-wrapper">
                                                <span className="currency-symbol">₹</span>
                                                <input
                                                    id="withdraw-amount"
                                                    type="number" step="1" min="1" max="500000"
                                                    className="form-input amount-input"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={e => setAmount(e.target.value)}
                                                />
                                            </div>
                                            <span className="form-hint">Maximum single withdrawal: ₹5,00,000</span>
                                        </div>

                                        {/* Quick amounts */}
                                        <div>
                                            <div className="form-label" style={{ marginBottom: '8px' }}>Quick Select</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {quickAmounts.map(q => (
                                                    <button key={q} type="button" className="btn btn-outline btn-sm"
                                                        onClick={() => setAmount(String(q))}>
                                                        ₹{q.toLocaleString('en-IN')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button className="btn btn-danger btn-full btn-lg" id="withdraw-next-btn"
                                            onClick={handleNext} disabled={!amount || !selectedAccount}>
                                            <i className="ri-arrow-right-line" /> Review Withdrawal
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2 — Confirm */}
                        {step === 2 && (
                            <div id="withdraw-step-2">
                                <div className="transfer-section-title">Confirm Withdrawal</div>
                                <div className="confirm-card glass-card" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(7,7,26,0.8))' }}>
                                    <div className="confirm-amount">
                                        <span className="confirm-amount-label">Withdrawal Amount</span>
                                        <div className="confirm-amount-value" style={{ color: 'var(--red)' }}>
                                            {formatCurrency(parseFloat(amount))}
                                        </div>
                                    </div>
                                    <div className="confirm-details">
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-bank-card-line" /> Account</span>
                                            <span className="confirm-value monospace">{selectedAcc?.accountNumber || '—'}</span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-wallet-3-line" /> Current Balance</span>
                                            <span className="confirm-value">{selectedBalance != null ? formatCurrency(selectedBalance) : '—'}</span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-arrow-down-circle-line" /> After Withdrawal</span>
                                            <span className="confirm-value" style={{ color: 'var(--red)' }}>
                                                {selectedBalance != null ? formatCurrency(selectedBalance - parseFloat(amount)) : '—'}
                                            </span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-community-fill" /> Method</span>
                                            <span className="confirm-value">ATM / Cash Withdrawal</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="confirm-warning">
                                    <i className="ri-error-warning-line" />
                                    This action will immediately debit your account. Withdrawals cannot be undone by you.
                                </div>
                                <div className="confirm-actions">
                                    <button className="btn btn-outline" id="withdraw-back-btn" onClick={() => setStep(1)}>
                                        <i className="ri-arrow-left-line" /> Back
                                    </button>
                                    <button className="btn btn-danger" id="withdraw-confirm-btn"
                                        onClick={handleWithdraw} disabled={submitting}>
                                        {submitting
                                            ? <><Spinner /> Processing…</>
                                            : <><i className="ri-check-line" /> Confirm Withdrawal</>
                                        }
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3 — Success */}
                        {step === 3 && (
                            <div id="withdraw-step-3">
                                <div className="success-state">
                                    <div className="success-icon">
                                        <i className="ri-checkbox-circle-fill" style={{ fontSize: '72px', color: 'var(--red)' }} />
                                        <div className="success-ring" />
                                    </div>
                                    <div className="success-title">Withdrawal Successful!</div>
                                    <div className="success-subtitle">Your funds have been debited</div>
                                    <div className="success-amount" style={{ color: 'var(--red)' }}>{formatCurrency(withdrawnAmount)}</div>
                                    <div style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        New Balance: <strong style={{ color: '#fff' }}>{formatCurrency(newBalance)}</strong>
                                    </div>
                                    <div className="success-actions">
                                        <button className="btn btn-outline" onClick={reset}>
                                            <i className="ri-refresh-line" /> Withdraw More
                                        </button>
                                        <Link to="/dashboard" className="btn btn-primary">
                                            <i className="ri-dashboard-line" /> Dashboard
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info panel */}
                <div className="transfer-info-col">
                    {selectedAccount && selectedBalance !== null && selectedBalance !== undefined && step < 3 && (
                        <div className="info-card glass-card" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(7,7,26,0.8))' }}>
                            <div className="info-icon" style={{ color: 'var(--red)' }}><i className="ri-wallet-3-fill" /></div>
                            <div className="info-title">Available Balance</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff', marginTop: '8px' }}>
                                {formatCurrency(selectedBalance)}
                            </div>
                            {amount && parseFloat(amount) > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                    After withdrawal: <span style={{ color: selectedBalance - parseFloat(amount) < 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
                                        {formatCurrency(Math.max(0, selectedBalance - parseFloat(amount)))}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="info-card glass-card">
                        <div className="info-icon" style={{ color: 'var(--red)' }}><i className="ri-atm-fill" /></div>
                        <div className="info-title">ATM Withdrawal</div>
                        <p className="info-desc">
                            Simulates a cash withdrawal from your account. Funds are instantly debited and cannot be reversed by you.
                        </p>
                    </div>
                    <div className="info-card glass-card">
                        <div className="info-icon" style={{ color: 'var(--gold)' }}><i className="ri-information-fill" /></div>
                        <div className="info-title">Daily Limit</div>
                        <p className="info-desc">
                            Maximum single withdrawal: ₹5,00,000. For larger amounts, please visit a branch.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
