import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContext } from './context/ToastContext';
import { useToast } from './hooks/useToast';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import NotFound from './pages/NotFound';

function AppInner() {
    const { toasts, showToast } = useToast();
    return (
        <ToastContext.Provider value={showToast}>
            <Toast toasts={toasts} />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/deposit"   element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
                <Route path="/transfer"  element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </ToastContext.Provider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppInner />
        </AuthProvider>
    );
}
