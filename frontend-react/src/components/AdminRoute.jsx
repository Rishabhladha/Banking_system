import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminPinGate, { SESSION_KEY } from './AdminPinGate';

export default function AdminRoute({ children }) {
    const { isLoggedIn, isAdmin } = useAuth();
    const [pinVerified, setPinVerified] = useState(
        () => sessionStorage.getItem(SESSION_KEY) === 'true'
    );

    useEffect(() => {
        // Listen for storage changes (e.g., logout in another tab)
        const onStorage = () => {
            setPinVerified(sessionStorage.getItem(SESSION_KEY) === 'true');
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    if (!isLoggedIn) {
        return <Navigate to="/auth" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // If admin is logged in but hasn't verified PIN this session
    if (!pinVerified) {
        return <AdminPinGate onVerified={() => setPinVerified(true)} />;
    }

    return children;
}
