import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';

export default function AdminCustomers() {
    const showToast = useToastContext();
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [kycFilter, setKycFilter] = useState('');
    const searchTimeout = useRef(null);

    const load = useCallback(async (page = 1, s = search, kyc = kycFilter) => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (s) params.search = s;
            if (kyc) params.kycStatus = kyc;
            const data = await adminApi.getCustomers(params);
            setCustomers(data.customers || []);
            setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [search, kycFilter, showToast]);

    useEffect(() => { load(); }, []);

    const handleSearch = (val) => {
        setSearch(val);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => load(1, val, kycFilter), 400);
    };

    const handleKycFilter = (val) => {
        setKycFilter(val);
        load(1, search, val);
    };

    const kycColors = { VERIFIED: 'var(--green)', PENDING: 'var(--gold)', REJECTED: 'var(--red)' };

    return (
        <AdminLayout title="Customer Management" subtitle={`${pagination.total} customers total`}>
            <div className="filter-row">
                <div className="search-bar-wrapper" style={{ flex: 1, minWidth: '200px' }}>
                    <i className="search-bar-icon ri-search-line" />
                    <input className="form-input search-bar" placeholder="Search by name or email…" value={search} onChange={e => handleSearch(e.target.value)} id="customer-search" />
                </div>
                <select className="form-input" style={{ width: '160px' }} value={kycFilter} onChange={e => handleKycFilter(e.target.value)} id="kyc-filter">
                    <option value="">All KYC</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div>
            ) : (
                <>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Phone</th>
                                    <th>KYC Status</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.length === 0 ? (
                                    <tr><td colSpan={7} className="data-table-empty">No customers found</td></tr>
                                ) : customers.map(c => (
                                    <tr key={c._id}>
                                        <td>
                                            <div className="customer-row">
                                                <div className="customer-avatar-sm">{c.name?.[0]?.toUpperCase()}</div>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{c.name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{c.phone || '—'}</td>
                                        <td>
                                            <span className="badge" style={{ background: `${kycColors[c.kycStatus]}18`, color: kycColors[c.kycStatus], border: `1px solid ${kycColors[c.kycStatus]}40` }}>
                                                ● {c.kycStatus}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{c.role}</td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.lastLogin ? new Date(c.lastLogin).toLocaleDateString('en-IN') : '—'}</td>
                                        <td>
                                            <a href={`/admin/customers/${c._id}`} className="btn btn-primary btn-sm">
                                                <i className="ri-eye-fill" /> View
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Prev</button>
                            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
                                <button key={p} className={`pagination-btn${pagination.page === p ? ' active' : ''}`} onClick={() => load(p)}>{p}</button>
                            ))}
                            <button className="pagination-btn" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Next →</button>
                            <span className="pagination-info">{pagination.total} total</span>
                        </div>
                    )}
                </>
            )}
        </AdminLayout>
    );
}
