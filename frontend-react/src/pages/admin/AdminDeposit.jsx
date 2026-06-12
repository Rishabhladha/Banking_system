import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';
import { formatCurrency } from '../../utils';

export default function AdminDeposit() {
    const showToast = useToastContext();
    
    // Search states
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const searchTimeout = useRef(null);

    // Account list states
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    
    // Form states
    const [selectedAccount, setSelectedAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const performSearch = useCallback(async (query) => {
        if (!query.trim()) {
            setCustomers([]);
            return;
        }
        setSearching(true);
        try {
            const data = await adminApi.getCustomers({ search: query, limit: 10 });
            setCustomers(data.customers || []);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSearching(false);
        }
    }, [showToast]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            performSearch(val);
        }, 300);
    };

    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setCustomers([]);
        setSearch('');
        
        // Fetch accounts for selected customer
        setLoadingAccounts(true);
        try {
            const detail = await adminApi.getCustomerDetail(customer._id);
            // Only active accounts can receive deposit
            const activeAccs = (detail.accounts || []).filter(a => a.status === 'ACTIVE');
            setAccounts(activeAccs);
            if (activeAccs.length > 0) {
                setSelectedAccount(activeAccs[0]._id);
            } else {
                setSelectedAccount('');
            }
        } catch (err) {
            showToast('Failed to load customer accounts: ' + err.message, 'error');
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) {
            showToast('Please select a customer first', 'error');
            return;
        }
        if (!selectedAccount) {
            showToast('Please select an active account', 'error');
            return;
        }

        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            showToast('Amount must be greater than zero', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await adminApi.adminDeposit({
                accountId: selectedAccount,
                amount: depositAmount,
                reason: reason || 'Admin manual deposit'
            });
            showToast(`Successfully deposited ${formatCurrency(depositAmount)}!`, 'success');
            
            // Reset form
            setAmount('');
            setReason('');
            
            // Reload accounts to reflect new balance
            const detail = await adminApi.getCustomerDetail(selectedCustomer._id);
            const activeAccs = (detail.accounts || []).filter(a => a.status === 'ACTIVE');
            setAccounts(activeAccs);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Admin Deposit" subtitle="Manually credit funds to any customer account">
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="glass-card" style={{ padding: '28px' }}>
                    <form onSubmit={handleSubmit}>
                        
                        {/* Step 1: Select Customer */}
                        <div className="form-group" style={{ marginBottom: '24px', position: 'relative' }}>
                            <label className="form-label" style={{ fontWeight: '600' }}>Select Customer</label>
                            
                            {selectedCustomer ? (
                                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="customer-row">
                                        <div className="customer-avatar-sm" style={{ background: 'linear-gradient(135deg, var(--red), var(--gold))' }}>
                                            {selectedCustomer.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{selectedCustomer.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedCustomer.email}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--gold)', marginTop: '2px' }}>
                                                KYC: {selectedCustomer.kycStatus}
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelectedCustomer(null); setAccounts([]); setSelectedAccount(''); }} style={{ color: 'var(--red)' }}>
                                        <i className="ri-close-circle-fill" style={{ fontSize: '18px' }} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="search-bar-wrapper">
                                        <i className="search-bar-icon ri-search-line" />
                                        <input
                                            type="text"
                                            className="form-input search-bar"
                                            placeholder="Type customer name or email to search..."
                                            value={search}
                                            onChange={handleSearchChange}
                                        />
                                    </div>
                                    
                                    {searching && (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                                            <Spinner />
                                        </div>
                                    )}

                                    {customers.length > 0 && (
                                        <div className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-card)', marginTop: '4px', padding: '6px' }}>
                                            {customers.map(c => (
                                                <div
                                                    key={c._id}
                                                    className="dropdown-item"
                                                    onClick={() => handleSelectCustomer(c)}
                                                    style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '6px', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: '500', fontSize: '13px' }}>{c.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</div>
                                                    </div>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.kycStatus}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {search && !searching && customers.length === 0 && (
                                        <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                            No customers found matching "{search}"
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Step 2: Select Account */}
                        {selectedCustomer && (
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label">Destination Account</label>
                                {loadingAccounts ? (
                                    <div style={{ padding: '10px 0' }}><Spinner /> Loading accounts…</div>
                                ) : accounts.length === 0 ? (
                                    <div className="glass-card" style={{ padding: '16px', textAlign: 'center', border: '1px solid var(--red-light)' }}>
                                        <p style={{ color: 'var(--red)', fontSize: '13px', margin: 0 }}>
                                            No active accounts found for this customer.
                                        </p>
                                    </div>
                                ) : (
                                    <select
                                        className="form-input"
                                        value={selectedAccount}
                                        onChange={e => setSelectedAccount(e.target.value)}
                                        required
                                    >
                                        {accounts.map(acc => (
                                            <option key={acc._id} value={acc._id}>
                                                {acc.accountNumber} ({acc.accountType}) — Current Balance: {formatCurrency(acc.balance)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Step 3: Amount and Reason */}
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">Deposit Amount (₹)</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                step="any"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Enter amount to credit"
                                required
                                disabled={!selectedAccount}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '28px' }}>
                            <label className="form-label">Deposit Reason / Description</label>
                            <input
                                type="text"
                                className="form-input"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="e.g. Cash Deposit, Customer Refund, Correction"
                                required
                                disabled={!selectedAccount}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10b981, #047857)' }}
                            disabled={submitting || !selectedAccount || !amount}
                        >
                            {submitting ? (
                                <><Spinner /> Depositing…</>
                            ) : (
                                <><i className="ri-checkbox-circle-fill" /> Perform Manual Credit</>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
