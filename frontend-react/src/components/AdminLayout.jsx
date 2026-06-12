import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/banking';

export default function AdminLayout({ title, subtitle, headerRight, children }) {
    const { user, logout } = useAuth();
    const avatarLetter = user?.name ? user.name[0].toUpperCase() : 'A';
    const [pendingDepositCount, setPendingDepositCount] = useState(0);
    const [pendingLoanCount, setPendingLoanCount] = useState(0);

    // Load badge counts
    useEffect(() => {
        const load = async () => {
            try {
                const data = await adminApi.getDashboard();
                setPendingDepositCount(data.stats?.pendingDepositRequests || 0);
                setPendingLoanCount(data.stats?.pendingLoans || 0);
            } catch { /* ignore */ }
        };
        load();
    }, []);

    const adminNavItems = [
        { to: '/admin',                  icon: 'ri-dashboard-fill',        label: 'Dashboard',         end: true },
        { to: '/admin/customers',        icon: 'ri-group-fill',            label: 'Customers' },
        { to: '/admin/create-account',   icon: 'ri-user-add-fill',         label: 'Create Account' },
        { divider: true },
        { to: '/admin/deposit-requests', icon: 'ri-inbox-fill',            label: 'Deposit Requests',  badge: pendingDepositCount },
        { to: '/admin/deposit',          icon: 'ri-money-dollar-box-fill', label: 'Admin Deposit' },
        { divider: true },
        { to: '/admin/loans',            icon: 'ri-bank-fill',             label: 'Loan Manager',      badge: pendingLoanCount },
        { to: '/admin/transactions',     icon: 'ri-exchange-funds-fill',   label: 'Transactions' },
        { divider: true },
        { to: '/admin/audit-log',        icon: 'ri-shield-check-fill',     label: 'Audit Log' },
    ];

    return (
        <div className="app-layout">
            <div className="orb orb-1" style={{ background: 'radial-gradient(circle,rgba(239,68,68,0.08),transparent 70%)' }} />
            <div className="orb orb-2" style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.06),transparent 70%)' }} />

            {/* Admin Sidebar */}
            <aside className="sidebar admin-sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon" style={{ background: 'linear-gradient(135deg,#dc2626,#7f1d1d)' }}>🛡️</div>
                    <span className="logo-text" style={{ background: 'linear-gradient(135deg,#fff,#fca5a5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Admin Portal
                    </span>
                </div>

                <nav className="sidebar-nav">
                    {adminNavItems.map((item, i) => {
                        if (item.divider) return <div key={i} className="nav-divider" />;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) => `nav-item${isActive ? ' active admin-active' : ''}`}
                            >
                                <i className={item.icon} />
                                <span>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="nav-badge" style={{ marginLeft: 'auto' }}>{item.badge}</span>
                                )}
                            </NavLink>
                        );
                    })}
                    <div className="nav-divider" />
                    <NavLink to="/dashboard" className="nav-item">
                        <i className="ri-arrow-left-circle-fill" />
                        <span>Back to Banking</span>
                    </NavLink>
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-user">
                        <div className="user-avatar" style={{ background: 'linear-gradient(135deg,#dc2626,#f59e0b)' }}>{avatarLetter}</div>
                        <div className="user-info">
                            <div className="user-name">{user?.name || '—'}</div>
                            <div className="user-email" style={{ color: '#fca5a5' }}>{user?.role?.toUpperCase() || 'ADMIN'}</div>
                        </div>
                        <button className="logout-btn" title="Logout" onClick={logout}>
                            <i className="ri-logout-circle-r-line" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Admin Main */}
            <main className="app-main">
                <header className="app-header admin-header">
                    <div>
                        <h1 className="page-title" style={{ fontSize: '22px', marginBottom: 0 }}>
                            {title}
                        </h1>
                        {subtitle && <p className="page-subtitle">{subtitle}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="badge" style={{ background: 'rgba(220,38,38,.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,.3)' }}>
                            <i className="ri-shield-star-fill" /> Admin Mode
                        </span>
                        {headerRight}
                    </div>
                </header>
                <div className="app-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
