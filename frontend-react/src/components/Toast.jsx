import { useEffect, useRef } from 'react';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

function ToastItem({ toast }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const timer = setTimeout(() => el.classList.add('toast-out'), 3600);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div ref={ref} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{ICONS[toast.type] || 'ℹ️'}</span>
            <span>{toast.message}</span>
        </div>
    );
}

export default function Toast({ toasts }) {
    return (
        <div id="toast-container">
            {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
        </div>
    );
}
