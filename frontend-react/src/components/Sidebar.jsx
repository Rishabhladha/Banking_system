import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { notificationsApi } from '../api/banking';

const navItems = [
    { to: '/dashboard',            icon: 'ri-dashboard-fill',          label: 'Dashboard' },
    { to: '/deposit',              icon: 'ri-inbox-line',              label: 'Request Deposit' },
    { to: '/withdraw',             icon: 'ri-arrow-down-circle-fill',  label: 'Withdraw' },
    { to: '/transfer',             icon: 'ri-send-plane-fill',         label: 'Transfer' },
    { to: '/transactions',         icon: 'ri-history-line',            label: 'Transactions' },
    { to: '/statement',            icon: 'ri-file-list-3-fill',        label: 'Statement' },
    { divider: true },
    { to: '/beneficiaries',        icon: 'ri-contacts-fill',           label: 'Beneficiaries' },
    { to: '/scheduled-transfers',  icon: 'ri-time-fill',               label: 'Scheduled' },
    { divider: true },
    { to: '/fixed-deposits',       icon: 'ri-safe-fill',               label: 'Fixed Deposits' },
    { to: '/loans',                icon: 'ri-bank-fill',               label: 'Loans' },
    { divider: true },
    { to: '/cards',                icon: 'ri-bank-card-fill',          label: 'Virtual Cards' },
    { to: '/notifications',        icon: 'ri-notification-3-fill',     label: 'Notifications', badge: true },
    { to: '/profile',              icon: 'ri-user-settings-fill',      label: 'Profile' },
];

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [collapsed, setCollapsed] = useState(false);

    const avatarLetter = user?.name ? user.name[0].toUpperCase() : '?';

    useEffect(() => {
        notificationsApi.getAll({ unreadOnly: 'true', limit: 1 })
            .then(d => setUnreadCount(d.unreadCount || 0))
            .catch(() => {});
        const interval = setInterval(() => {
            notificationsApi.getAll({ unreadOnly: 'true', limit: 1 })
                .then(d => setUnreadCount(d.unreadCount || 0))
                .catch(() => {});
        }, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
            <div className="sidebar-logo">
                <div className="logo-icon">🏦</div>
                {!collapsed && <span className="logo-text">NexaBank</span>}
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(c => !c)}
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    <i className={`ri-${collapsed ? 'menu-unfold' : 'menu-fold'}-line`} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item, i) => {
                    if (item.divider) return <div key={i} className="nav-divider" />;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                            title={collapsed ? item.label : ''}
                        >
                            <i className={item.icon} />
                            {!collapsed && <span>{item.label}</span>}
                            {item.badge && unreadCount > 0 && (
                                <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                            )}
                        </NavLink>
                    );
                })}
                {isAdmin && (
                    <>
                        <div className="nav-divider" />
                        <NavLink to="/admin" className={({ isActive }) => `nav-item nav-item-admin${isActive ? ' active' : ''}`}>
                            <i className="ri-shield-star-fill" />
                            {!collapsed && <span>Admin Portal</span>}
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-bottom">
                <div className="sidebar-user">
                    <div className="user-avatar">{avatarLetter}</div>
                    {!collapsed && (
                        <div className="user-info">
                            <div className="user-name" id="sidebar-user-name">{user?.name || '—'}</div>
                            <div className="user-email" id="sidebar-user-email">{user?.email || ''}</div>
                        </div>
                    )}
                    <button
                        className="logout-btn"
                        title="Logout"
                        onClick={logout}
                        id="logout-btn"
                    >
                        <i className="ri-logout-circle-r-line" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
