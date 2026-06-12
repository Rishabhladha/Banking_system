import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import Spinner from '../../components/Spinner';
import { useToastContext } from '../../context/ToastContext';
import { adminApi } from '../../api/banking';
import { formatCurrency } from '../../utils';

const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminDashboard() {
    const showToast = useToastContext();
    const [stats, setStats] = useState(null);
    const [monthlyUsers, setMonthlyUsers] = useState([]);
    const [monthlyVolume, setMonthlyVolume] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await adminApi.getDashboard();
            setStats(data.stats);
            setMonthlyUsers(data.monthlyUsers || []);
            setMonthlyVolume(data.monthlyVolume || []);
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const statCards = stats ? [
        { label: 'Total Customers',      value: stats.totalUsers.toLocaleString(),             icon: 'ri-group-fill',               color: 'var(--purple-light)', bg: 'rgba(124,58,237,.12)',  to: '/admin/customers' },
        { label: 'Total Accounts',       value: stats.totalAccounts.toLocaleString(),           icon: 'ri-bank-fill',                color: 'var(--cyan)',          bg: 'rgba(6,182,212,.12)' },
        { label: 'Frozen Accounts',      value: stats.frozenAccounts.toLocaleString(),          icon: 'ri-lock-fill',                color: 'var(--red)',           bg: 'rgba(239,68,68,.12)' },
        { label: 'Assets Under Mgmt',    value: formatCurrency(stats.aum),                      icon: 'ri-money-dollar-circle-fill', color: 'var(--gold)',          bg: 'rgba(245,158,11,.12)' },
        { label: 'Total Transactions',   value: stats.totalTransactions.toLocaleString(),       icon: 'ri-exchange-funds-fill',      color: 'var(--green)',         bg: 'rgba(16,185,129,.12)' },
        { label: 'Pending Loans',        value: stats.pendingLoans.toLocaleString(),            icon: 'ri-time-fill',                color: 'var(--gold)',          bg: 'rgba(245,158,11,.12)', sub: 'Awaiting review',     to: '/admin/loans' },
        { label: 'Deposit Requests',     value: stats.pendingDepositRequests.toLocaleString(),  icon: 'ri-inbox-fill',              color: '#f59e0b',              bg: 'rgba(245,158,11,.12)', sub: 'Pending approval',    to: '/admin/deposit-requests', urgent: stats.pendingDepositRequests > 0 },
        { label: "Today's Transactions", value: stats.dailyTransactionCount.toLocaleString(),   icon: 'ri-calendar-fill',            color: 'var(--cyan)',          bg: 'rgba(6,182,212,.12)',  sub: formatCurrency(stats.dailyTransactionVolume) + ' volume' },
    ] : [];

    const maxUsers = Math.max(...monthlyUsers.map(m => m.count), 1);
    const maxVolume = Math.max(...monthlyVolume.map(m => m.volume), 1);

    const quickActions = [
        { to: '/admin/customers',        icon: 'ri-group-fill',               label: 'Customers',       color: 'rgba(124,58,237,.15)', iconColor: 'var(--purple-light)' },
        { to: '/admin/deposit-requests', icon: 'ri-inbox-fill',               label: 'Deposit Reqs',    color: 'rgba(245,158,11,.12)', iconColor: '#f59e0b', badge: stats?.pendingDepositRequests },
        { to: '/admin/create-account',   icon: 'ri-user-add-fill',            label: 'Create Account',  color: 'rgba(6,182,212,.12)',  iconColor: 'var(--cyan)' },
        { to: '/admin/deposit',          icon: 'ri-money-dollar-box-fill',    label: 'Admin Deposit',   color: 'rgba(16,185,129,.12)', iconColor: 'var(--green)' },
        { to: '/admin/loans',            icon: 'ri-bank-fill',                label: 'Review Loans',    color: 'rgba(245,158,11,.12)', iconColor: 'var(--gold)', badge: stats?.pendingLoans },
        { to: '/admin/transactions',     icon: 'ri-exchange-funds-fill',      label: 'Transactions',    color: 'rgba(239,68,68,.12)',  iconColor: 'var(--red)' },
        { to: '/admin/customers',        icon: 'ri-shield-user-fill',         label: 'KYC Reviews',     color: 'rgba(124,58,237,.12)', iconColor: 'var(--purple-light)' },
        { to: '/admin/audit-log',        icon: 'ri-shield-check-fill',        label: 'Audit Log',       color: 'rgba(124,58,237,.12)', iconColor: 'var(--purple-light)' },
    ];

    return (
        <AdminLayout title="Admin Dashboard" subtitle="System overview and key metrics">
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="admin-stats-grid">
                        {statCards.map(s => (
                            <div key={s.label}
                                className="stat-card glass-card"
                                style={{ cursor: s.to ? 'pointer' : 'default', position: 'relative', outline: s.urgent ? '1px solid rgba(245,158,11,0.4)' : 'none' }}
                                onClick={() => s.to && (window.location.href = s.to)}>
                                {s.urgent && (
                                    <div style={{
                                        position: 'absolute', top: '-6px', right: '-6px',
                                        width: '12px', height: '12px', borderRadius: '50%',
                                        background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.8)',
                                        animation: 'pulse 2s infinite'
                                    }} />
                                )}
                                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                                    <i className={s.icon} />
                                </div>
                                <div className="stat-label">{s.label}</div>
                                <div className="stat-value" style={{ fontSize: '22px' }}>{s.value}</div>
                                {s.sub && <div className="stat-sub">{s.sub}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Charts row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
                        {/* New Customers Chart */}
                        {monthlyUsers.length > 0 && (
                            <div className="glass-card chart-wrapper">
                                <div className="chart-title">New Customers (6 Months)</div>
                                <div className="chart-bars">
                                    {monthlyUsers.map((m, i) => (
                                        <div key={i} className="chart-bar-group">
                                            <div className="chart-bar credit"
                                                style={{ height: `${(m.count / maxUsers) * 100}%` }}
                                                title={`${m.count} customers`} />
                                            <div className="chart-month">{MONTH_NAMES[m._id?.month || 0]}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-legend">
                                    <div className="chart-legend-item">
                                        <div className="chart-legend-dot" style={{ background: 'var(--green)' }} />
                                        New registrations
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Transaction Volume Chart */}
                        {monthlyVolume.length > 0 && (
                            <div className="glass-card chart-wrapper">
                                <div className="chart-title">Transaction Volume (6 Months)</div>
                                <div className="chart-bars">
                                    {monthlyVolume.map((m, i) => (
                                        <div key={i} className="chart-bar-group">
                                            <div className="chart-bar"
                                                style={{ height: `${(m.volume / maxVolume) * 100}%`, background: 'linear-gradient(to top, rgba(124,58,237,0.8), rgba(6,182,212,0.6))' }}
                                                title={`${formatCurrency(m.volume)} (${m.count} txns)`} />
                                            <div className="chart-month">{MONTH_NAMES[m._id?.month || 0]}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-legend">
                                    <div className="chart-legend-item">
                                        <div className="chart-legend-dot" style={{ background: 'var(--purple-light)' }} />
                                        Transaction volume
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>Quick Actions</div>
                    <div className="qa-grid">
                        {quickActions.map(qa => (
                            <Link key={qa.to + qa.label} to={qa.to} className="qa-card glass-card" style={{ position: 'relative', textDecoration: 'none' }}>
                                <div className="qa-icon" style={{ background: qa.color, color: qa.iconColor }}>
                                    <i className={qa.icon} />
                                </div>
                                <div className="qa-label">{qa.label}</div>
                                {qa.badge > 0 && (
                                    <div className="nav-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>{qa.badge}</div>
                                )}
                            </Link>
                        ))}
                    </div>

                    <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
                </>
            )}
        </AdminLayout>
    );
}
