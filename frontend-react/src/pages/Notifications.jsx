import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import { useToastContext } from '../context/ToastContext';
import { notificationsApi } from '../api/banking';

const NOTIF_ICONS = { SUCCESS: 'ri-check-circle-fill', INFO: 'ri-information-fill', WARNING: 'ri-error-warning-fill', ALERT: 'ri-alarm-warning-fill' };

function timeAgo(date) {
    const secs = Math.floor((Date.now() - new Date(date)) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
    return `${Math.floor(secs/86400)}d ago`;
}

export default function Notifications() {
    const showToast = useToastContext();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await notificationsApi.getAll({ limit: 100 });
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setLoading(false); }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    const handleMarkAll = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications(n => n.map(x => ({ ...x, read: true })));
            setUnreadCount(0);
            showToast('All notifications marked as read', 'info');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleMarkOne = async (id) => {
        try {
            await notificationsApi.markRead(id);
            setNotifications(n => n.map(x => x._id === id ? { ...x, read: true } : x));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch { /* silent */ }
    };

    return (
        <Layout title="Notifications" subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            headerRight={unreadCount > 0 && (
                <button className="btn btn-outline btn-sm" onClick={handleMarkAll} id="mark-all-read-btn">
                    <i className="ri-check-double-line" /> Mark all read
                </button>
            )}>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner /></div>
            ) : notifications.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <div className="empty-state-title">All caught up!</div>
                    <p style={{ fontSize: '14px' }}>No notifications to show</p>
                </div>
            ) : (
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div className="notif-list">
                        {notifications.map(n => (
                            <div key={n._id} className={`notif-item${!n.read ? ' unread' : ''}`} onClick={() => !n.read && handleMarkOne(n._id)}>
                                <div className={`notif-icon ${n.type}`}>
                                    <i className={NOTIF_ICONS[n.type] || 'ri-notification-fill'} />
                                </div>
                                <div className="notif-body">
                                    <div className="notif-title">{n.title}</div>
                                    <div className="notif-msg">{n.message}</div>
                                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                                </div>
                                {!n.read && <div className="notif-unread-dot" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Layout>
    );
}
