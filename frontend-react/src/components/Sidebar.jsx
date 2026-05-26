import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { to: '/dashboard',    icon: 'ri-dashboard-fill',      label: 'Dashboard' },
    { to: '/deposit',      icon: 'ri-add-circle-fill',     label: 'Deposit' },
    { to: '/transfer',     icon: 'ri-send-plane-fill',     label: 'Transfer' },
    { to: '/transactions', icon: 'ri-history-line',        label: 'Transactions' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();

    const avatarLetter = user?.name ? user.name[0].toUpperCase() : '?';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">🏦</div>
                <span className="logo-text">NexaBank</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <i className={item.icon}></i>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <div className="sidebar-user">
                    <div className="user-avatar">{avatarLetter}</div>
                    <div className="user-info">
                        <div className="user-name" id="sidebar-user-name">{user?.name || '—'}</div>
                        <div className="user-email" id="sidebar-user-email">{user?.email || ''}</div>
                    </div>
                    <button
                        className="logout-btn"
                        title="Logout"
                        onClick={logout}
                        id="logout-btn"
                    >
                        <i className="ri-logout-circle-r-line"></i>
                    </button>
                </div>
            </div>
        </aside>
    );
}
