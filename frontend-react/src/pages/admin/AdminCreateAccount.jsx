import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';

export default function AdminCreateAccount() {
    const showToast = useToastContext();
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    
    const [accountType, setAccountType] = useState('SAVINGS');
    const [initialDeposit, setInitialDeposit] = useState('0');
    const [submitting, setSubmitting] = useState(false);

    const searchTimeout = useRef(null);

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

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setCustomers([]);
        setSearch('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) {
            showToast('Please select a customer first', 'error');
            return;
        }

        const depositVal = parseFloat(initialDeposit);
        if (isNaN(depositVal) || depositVal < 0) {
            showToast('Initial deposit must be 0 or greater', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await adminApi.createAccount({
                userId: selectedCustomer._id,
                accountType,
                initialDeposit: depositVal
            });
            showToast('Account created successfully! 🎉', 'success');
            setSelectedCustomer(null);
            setAccountType('SAVINGS');
            setInitialDeposit('0');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Open New Account" subtitle="Create savings or current accounts for customers">
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
                                                KYC Status: {selectedCustomer.kycStatus}
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedCustomer(null)} style={{ color: 'var(--red)' }}>
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

                        {/* Step 2: Account Details */}
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">Account Type</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {['SAVINGS', 'CURRENT'].map(type => (
                                    <label key={type} className="glass-card" style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', border: accountType === type ? '1px solid var(--red)' : '1px solid rgba(255,255,255,0.06)', background: accountType === type ? 'rgba(220,38,38,0.08)' : 'transparent' }}>
                                        <input
                                            type="radio"
                                            name="accountType"
                                            value={type}
                                            checked={accountType === type}
                                            onChange={() => setAccountType(type)}
                                            style={{ accentColor: 'var(--red)' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{type}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {type === 'SAVINGS' ? 'High interest, low transaction' : 'Zero balance, commercial use'}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '28px' }}>
                            <label className="form-label">Initial Deposit (₹)</label>
                            <input
                                type="number"
                                className="form-input"
                                min="0"
                                value={initialDeposit}
                                onChange={e => setInitialDeposit(e.target.value)}
                                placeholder="Enter initial funding amount"
                                required
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                This amount will be credited to the account immediately upon creation.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}
                            disabled={submitting || !selectedCustomer}
                        >
                            {submitting ? (
                                <><Spinner /> Creating Account…</>
                            ) : (
                                <><i className="ri-user-add-line" /> Create Bank Account</>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
