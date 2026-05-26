import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { accountsApi } from '../api/accounts';
import { transactionsApi } from '../api/transactions';
import { formatCurrency, truncateId, generateIdempotencyKey } from '../utils';

export default function Transfer() {
    const [searchParams] = useSearchParams();
    const showToast = useToastContext();
    const preFrom = searchParams.get('from');

    const [accounts, setAccounts] = useState([]);
    const [fromId, setFromId] = useState(preFrom || '');
    const [toId, setToId] = useState('');
    const [amount, setAmount] = useState('');
    const [fromBalance, setFromBalance] = useState(0);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [amountError, setAmountError] = useState('');
    const [transferError, setTransferError] = useState('');
    const [step, setStep] = useState(1);
    const [sending, setSending] = useState(false);
    const [idempKey, setIdempKey] = useState(generateIdempotencyKey);
    const [successAmount, setSuccessAmount] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const data = await accountsApi.getAll();
                const active = (data.accounts || []).filter(a => a.status === 'ACTIVE');
                setAccounts(active);
                if (!preFrom && active.length > 0) setFromId(active[0]._id);
            } catch (err) {
                showToast('Could not load accounts: ' + err.message, 'error');
            }
        })();
    }, [showToast, preFrom]);

    const loadFromBalance = useCallback(async (id) => {
        if (!id) return;
        setBalanceLoading(true);
        try {
            const data = await accountsApi.getBalance(id);
            setFromBalance(data.balance);
        } catch { setFromBalance(0); }
        finally { setBalanceLoading(false); }
    }, []);

    useEffect(() => { if (fromId) loadFromBalance(fromId); }, [fromId, loadFromBalance]);

    const handleNext = () => {
        const val = parseFloat(amount);
        setAmountError('');
        if (!fromId) { showToast('Please select a source account.', 'error'); return; }
        if (!toId.trim()) { showToast('Please enter a recipient account ID.', 'error'); return; }
        if (toId.trim() === fromId) { showToast('Cannot transfer to the same account.', 'error'); return; }
        if (!val || val <= 0) { setAmountError('⚠️ Please enter a valid amount greater than 0.'); return; }
        if (val > fromBalance) { setAmountError(`⚠️ Insufficient balance. Available: ${formatCurrency(fromBalance)}`); return; }
        setIdempKey(generateIdempotencyKey());
        setStep(2);
    };

    const handleSend = async () => {
        const val = parseFloat(amount);
        setSending(true);
        setTransferError('');
        try {
            await transactionsApi.create(fromId, toId.trim(), val, idempKey);
            setSuccessAmount(val);
            setStep(3);
            showToast('Transfer successful! 🎉', 'success');
        } catch (err) {
            setTransferError(err.message);
        } finally {
            setSending(false);
        }
    };

    const resetTransfer = () => {
        setToId('');
        setAmount('');
        setAmountError('');
        setTransferError('');
        setIdempKey(generateIdempotencyKey());
        setStep(1);
        if (fromId) loadFromBalance(fromId);
    };

    return (
        <Layout title="Transfer Funds" subtitle="Send money to any NexaBank account instantly">
            <div className="transfer-layout">
                <div>
                    <div className="transfer-card glass-card">
                        {/* Step indicators */}
                        <div className="transfer-steps">
                            {[1, 2, 3].map((s, idx) => (
                                <>
                                    <div key={s} className={`t-step${step >= s ? (step > s ? ' done' : ' active') : ''}`} id={`step-ind-${s}`}>
                                        <div className="t-step-circle">
                                            {step > s ? <i className="ri-check-line" /> : s}
                                        </div>
                                        <div className="t-step-label">{['Details', 'Confirm', 'Done'][idx]}</div>
                                    </div>
                                    {idx < 2 && <div key={`line-${s}`} className={`t-step-line${step > s ? ' done' : ''}`} />}
                                </>
                            ))}
                        </div>

                        {/* Step 1 */}
                        {step === 1 && (
                            <div id="step-1">
                                <div className="transfer-section-title">Transfer Details</div>
                                <div className="form-stack-lg">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="from-account-select">From Account</label>
                                        <select
                                            id="from-account-select"
                                            className="form-input"
                                            value={fromId}
                                            onChange={e => setFromId(e.target.value)}
                                        >
                                            {accounts.length === 0 && <option value="">No active accounts found</option>}
                                            {accounts.map(acc => (
                                                <option key={acc._id} value={acc._id}>
                                                    {truncateId(acc._id)} — {acc.currency}
                                                </option>
                                            ))}
                                        </select>
                                        {fromId && (
                                            <div className="account-balance-display">
                                                <i className="ri-wallet-3-line" />
                                                Available:{' '}
                                                <strong>{balanceLoading ? 'Loading…' : formatCurrency(fromBalance)}</strong>
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="to-account-input">To Account ID</label>
                                        <div className="input-wrapper">
                                            <i className="ri-user-received-line input-icon" />
                                            <input
                                                type="text"
                                                id="to-account-input"
                                                className="form-input input-with-icon"
                                                placeholder="Paste recipient's account ID"
                                                value={toId}
                                                onChange={e => setToId(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-hint">Ask the recipient to copy their account ID from Dashboard.</div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="amount-input">Amount</label>
                                        <div className="amount-input-wrapper">
                                            <span className="currency-symbol">₹</span>
                                            <input
                                                type="number"
                                                id="amount-input"
                                                className="form-input amount-input"
                                                placeholder="0.00"
                                                min="1"
                                                step="0.01"
                                                value={amount}
                                                onChange={e => { setAmount(e.target.value); setAmountError(''); }}
                                            />
                                        </div>
                                        {amountError && <div className="amount-error" id="amount-error">{amountError}</div>}
                                    </div>
                                    <button
                                        className="btn btn-primary btn-full btn-lg"
                                        id="next-btn"
                                        onClick={handleNext}
                                        disabled={accounts.length === 0}
                                    >
                                        <i className="ri-arrow-right-line" /> Review Transfer
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 */}
                        {step === 2 && (
                            <div id="step-2">
                                <div className="transfer-section-title">Confirm Transfer</div>
                                <div className="confirm-card glass-card">
                                    <div className="confirm-amount">
                                        <span className="confirm-amount-label">Transfer Amount</span>
                                        <div className="confirm-amount-value" id="confirm-amount">{formatCurrency(parseFloat(amount))}</div>
                                    </div>
                                    <div className="confirm-details">
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-arrow-up-circle-line" /> From</span>
                                            <span className="confirm-value monospace" id="confirm-from">{truncateId(fromId)}</span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-arrow-down-circle-line" /> To</span>
                                            <span className="confirm-value monospace" id="confirm-to">{truncateId(toId)}</span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-wallet-3-line" /> Balance After</span>
                                            <span className="confirm-value" id="confirm-balance-after">
                                                {formatCurrency(fromBalance - parseFloat(amount))}
                                            </span>
                                        </div>
                                        <div className="confirm-row">
                                            <span className="confirm-label"><i className="ri-key-2-line" /> Idempotency Key</span>
                                            <span className="confirm-value monospace small-text" id="confirm-idem-key">{idempKey}</span>
                                        </div>
                                    </div>
                                </div>
                                {transferError && (
                                    <div className="form-error" id="transfer-error">{transferError}</div>
                                )}
                                <div className="confirm-warning">
                                    <i className="ri-information-line" />
                                    This action is irreversible. Please double-check the recipient account ID before confirming.
                                </div>
                                <div className="confirm-actions">
                                    <button className="btn btn-outline" id="back-btn" onClick={() => setStep(1)}>
                                        <i className="ri-arrow-left-line" /> Back
                                    </button>
                                    <button className="btn btn-primary" id="send-btn" onClick={handleSend} disabled={sending}>
                                        {sending
                                            ? <><Spinner /> Sending…</>
                                            : <><i className="ri-send-plane-fill" /> Send Money</>
                                        }
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3 */}
                        {step === 3 && (
                            <div id="step-3">
                                <div className="success-state">
                                    <div className="success-icon">
                                        <i className="ri-checkbox-circle-fill" style={{ fontSize: '72px', color: 'var(--green)' }} />
                                        <div className="success-ring" />
                                    </div>
                                    <div className="success-title">Transfer Successful!</div>
                                    <div className="success-subtitle">Your money is on its way</div>
                                    <div className="success-amount" id="success-amount">{formatCurrency(successAmount)}</div>
                                    <div className="success-actions">
                                        <button className="btn btn-outline" onClick={resetTransfer}>
                                            <i className="ri-refresh-line" /> New Transfer
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

                {/* Info column */}
                <div className="transfer-info-col">
                    <div className="info-card glass-card">
                        <div className="info-icon"><i className="ri-shield-check-fill" /></div>
                        <div className="info-title">ACID Guaranteed</div>
                        <p className="info-desc">Every transfer is wrapped in a MongoDB transaction session — either both sides succeed or neither does.</p>
                    </div>
                    <div className="info-card glass-card">
                        <div className="info-icon" style={{ color: 'var(--gold)' }}><i className="ri-key-2-fill" /></div>
                        <div className="info-title">Idempotent</div>
                        <p className="info-desc">Each transfer has a unique idempotency key — retrying a failed transfer can never charge you twice.</p>
                    </div>
                    <div className="info-card glass-card">
                        <div className="info-icon" style={{ color: 'var(--cyan)' }}><i className="ri-time-fill" /></div>
                        <div className="info-title">Instant Settlement</div>
                        <p className="info-desc">Funds are debited and credited atomically — no delays, no holds. Real-time balance updates.</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
