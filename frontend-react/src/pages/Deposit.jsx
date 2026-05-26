import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { accountsApi } from '../api/accounts';
import { formatCurrency, truncateId } from '../utils';

export default function Deposit() {
    const [searchParams] = useSearchParams();
    const showToast = useToastContext();
    const preAccountId = searchParams.get('account');

    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(preAccountId || '');
    const [currentBalance, setCurrentBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(false);

    const [amount, setAmount] = useState('');
    const [amountError, setAmountError] = useState('');
    const [step, setStep] = useState(1); // 1 = form, 2 = confirm, 3 = success
    const [loading, setLoading] = useState(false);
    const [depositedAmount, setDepositedAmount] = useState(0);
    const [newBalance, setNewBalance] = useState(0);

    // Load accounts
    useEffect(() => {
        (async () => {
            try {
                const data = await accountsApi.getAll();
                const active = (data.accounts || []).filter(a => a.status === 'ACTIVE');
                setAccounts(active);
                if (!preAccountId && active.length > 0) setSelectedAccountId(active[0]._id);
            } catch (err) {
                showToast('Could not load accounts: ' + err.message, 'error');
            }
        })();
    }, [showToast, preAccountId]);

    // Load balance when account changes
    const loadBalance = useCallback(async (id) => {
        if (!id) return;
        setBalanceLoading(true);
        try {
            const data = await accountsApi.getBalance(id);
            setCurrentBalance(data.balance);
        } catch {
            setCurrentBalance(null);
        } finally {
            setBalanceLoading(false);
        }
    }, []);

    useEffect(() => { if (selectedAccountId) loadBalance(selectedAccountId); }, [selectedAccountId, loadBalance]);

    const handleNext = () => {
        const val = parseFloat(amount);
        if (!selectedAccountId) { showToast('Please select an account.', 'error'); return; }
        if (!val || val <= 0) { setAmountError('⚠️ Please enter a valid amount greater than 0.'); return; }
        if (val > 1_000_000) { setAmountError('⚠️ Maximum single deposit is ₹10,00,000.'); return; }
        setAmountError('');
        setStep(2);
    };

    const handleDeposit = async () => {
        const val = parseFloat(amount);
        setLoading(true);
        try {
            const data = await accountsApi.deposit(selectedAccountId, val);
            setDepositedAmount(data.deposited);
            setNewBalance(data.newBalance);
            setStep(3);
            showToast('Deposit successful! 🎉', 'success');
        } catch (err) {
            showToast(err.message, 'error');
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setAmount('');
        setAmountError('');
        setStep(1);
        if (selectedAccountId) loadBalance(selectedAccountId);
    };

    const selectedAcc = accounts.find(a => a._id === selectedAccountId);

    return (
        <Layout title="Deposit Funds" subtitle="Add money to your account from an external source">
            <div className="transfer-layout">
                {/* Main card */}
                <div>
                    <div className="transfer-card glass-card">
                        {/* Step indicators */}
                        <div className="transfer-steps">
                            <div className={`t-step${step >= 1 ? (step > 1 ? ' done' : ' active') : ''}`} id="step-ind-1">
                                <div className="t-step-circle">{step > 1 ? <i className="ri-check-line" /> : '1'}</div>
                                <div className="t-step-label">Details</div>
                            </div>
                            <div className={`t-step-line${step > 1 ? ' done' : ''}`} />
                            <div className={`t-step${step >= 2 ? (step > 2 ? ' done' : ' active') : ''}`} id="step-ind-2">
                                <div className="t-step-circle">{step > 2 ? <i className="ri-check-line" /> : '2'}</div>
                                <div className="t-step-label">Confirm</div>
                            </div>
                            <div className={`t-step-line${step > 2 ? ' done' : ''}`} />
                            <div className={`t-step${step === 3 ? ' active' : ''}`} id="step-ind-3">
                                <div className="t-step-circle">3</div>
                                <div className="t-step-label">Done</div>
                            </div>
                        </div>

                        {/* Step 1 — Form */}
                        {step === 1 && (
                            <div id="step-1">
                                <div className="transfer-section-title">Deposit Details</div>
                                <div className="form-stack-lg">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="deposit-account-select">Deposit to Account</label>
                                        <select
                                            id="deposit-account-select"
                                            className="form-input"
                                            value={selectedAccountId}
                                            onChange={e => setSelectedAccountId(e.target.value)}
                                        >
                                            {accounts.length === 0 && <option value="">No active accounts found</option>}
                                            {accounts.map(acc => (
                                                <option key={acc._id} value={acc._id}>
                                                    {truncateId(acc._id)} — {acc.currency}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedAccountId && (
                                            <div className="account-balance-display">
                                                <i className="ri-wallet-3-line" />
                                                Current Balance:{' '}
                                                <strong>
                                                    {balanceLoading ? 'Loading…' : (currentBalance !== null ? formatCurrency(currentBalance) : '—')}
                                                </strong>
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="deposit-amount">Deposit Amount</label>
                                        <div className="amount-input-wrapper">
                                            <span className="currency-symbol">₹</span>
                                            <input
                                                type="number"
                                                id="deposit-amount"
                                                className="form-input amount-input"
                                                placeholder="0.00"
                                                min="1"
                                                max="1000000"
                                                step="0.01"
                                                value={amount}
                                                onChange={e => { setAmount(e.target.value); setAmountError(''); }}
                                            />
                                        </div>
                                        {amountError && <div className="amount-error">{amountError}</div>}
                                        <div className="form-hint">Maximum single deposit: ₹10,00,000</div>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-full btn-lg"
                                        id="deposit-next-btn"
                                        onClick={handleNext}
                                        disabled={accounts.length === 0}
                                    >
                                        <i className="ri-arrow-right-line" /> Review Deposit
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 — Confirm */}
                        {step === 2 && (
                            <div id="step-2">
                                <div className="transfer-section-title">Confirm Deposit</div>
                                <div className="confirm-card glass-card">
                                    <div className="confirm-amount">
                                        <span className="confirm-amount-label">Deposit Amount</span>
                                        <div className="confirm-amount-value">{formatCurrency(parseFloat(amount))}</div>
                                    </div>
                                    <div className="confirm-details">
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-bank-card-line" /> Account</span>
                                            <span className="confirm-value monospace">{truncateId(selectedAccountId)}</span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-wallet-3-line" /> Current Balance</span>
                                            <span className="confirm-value">{currentBalance !== null ? formatCurrency(currentBalance) : '—'}</span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-arrow-up-circle-line" /> After Deposit</span>
                                            <span className="confirm-value text-green">
                                                {currentBalance !== null ? formatCurrency(currentBalance + parseFloat(amount)) : '—'}
                                            </span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-bank-fill" /> Source</span>
                                            <span className="confirm-value">External Transfer</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="confirm-warning">
                                    <i className="ri-information-line" />
                                    This deposit will be credited instantly to your account ledger.
                                </div>
                                <div className="confirm-actions">
                                    <button className="btn btn-outline" id="deposit-back-btn" onClick={() => setStep(1)}>
                                        <i className="ri-arrow-left-line" /> Back
                                    </button>
                                    <button className="btn btn-green" id="deposit-confirm-btn" onClick={handleDeposit} disabled={loading}>
                                        {loading
                                            ? <><Spinner /> Processing…</>
                                            : <><i className="ri-check-line" /> Confirm Deposit</>
                                        }
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3 — Success */}
                        {step === 3 && (
                            <div id="step-3">
                                <div className="success-state">
                                    <div className="success-icon">
                                        <i className="ri-checkbox-circle-fill" style={{ fontSize: '72px', color: 'var(--green)' }} />
                                        <div className="success-ring" />
                                    </div>
                                    <div className="success-title">Deposit Successful!</div>
                                    <div className="success-subtitle">Your funds have been credited instantly</div>
                                    <div className="success-amount">{formatCurrency(depositedAmount)}</div>
                                    <div style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        New Balance: <strong style={{ color: 'var(--green)' }}>{formatCurrency(newBalance)}</strong>
                                    </div>
                                    <div className="success-actions">
                                        <button className="btn btn-outline" onClick={reset}>
                                            <i className="ri-add-circle-line" /> Deposit More
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
                    <div className="info-card glass-card">
                        <div className="info-icon"><i className="ri-bank-fill" /></div>
                        <div className="info-title">External Transfer</div>
                        <p className="info-desc">
                            Simulate depositing money from an external source — like an ATM or bank transfer into your NexaBank account.
                        </p>
                    </div>
                    <div className="info-card glass-card">
                        <div className="info-icon" style={{ color: 'var(--purple-light)' }}><i className="ri-shield-check-fill" /></div>
                        <div className="info-title">Instant Credit</div>
                        <p className="info-desc">
                            Every deposit is recorded as a permanent CREDIT ledger entry. Your balance updates immediately.
                        </p>
                    </div>
                    <div className="info-card glass-card">
                        <div className="info-icon" style={{ color: 'var(--gold)' }}><i className="ri-file-list-3-line" /></div>
                        <div className="info-title">Fully Auditable</div>
                        <p className="info-desc">
                            All deposits are stored in an immutable ledger — they can never be modified or deleted.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
