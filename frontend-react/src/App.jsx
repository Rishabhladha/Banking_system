import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContext } from './context/ToastContext';
import { useToast } from './hooks/useToast';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Public pages
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

// Customer pages
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import Withdraw from './pages/Withdraw';
import Profile from './pages/Profile';
import Beneficiaries from './pages/Beneficiaries';
import FixedDeposits from './pages/FixedDeposits';
import Loans from './pages/Loans';
import Statement from './pages/Statement';
import Notifications from './pages/Notifications';
import ScheduledTransfers from './pages/ScheduledTransfers';
import Cards from './pages/Cards';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCustomerDetail from './pages/admin/AdminCustomerDetail';
import AdminCreateAccount from './pages/admin/AdminCreateAccount';
import AdminDeposit from './pages/admin/AdminDeposit';
import AdminLoans from './pages/admin/AdminLoans';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminDepositRequests from './pages/admin/AdminDepositRequests';

function AppInner() {
    const { toasts, showToast } = useToast();
    return (
        <ToastContext.Provider value={showToast}>
            <Toast toasts={toasts} />
            <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />

                {/* Customer Portal */}
                <Route path="/dashboard"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/deposit"            element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
                <Route path="/withdraw"           element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
                <Route path="/transfer"           element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
                <Route path="/transactions"       element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/statement"          element={<ProtectedRoute><Statement /></ProtectedRoute>} />
                <Route path="/beneficiaries"      element={<ProtectedRoute><Beneficiaries /></ProtectedRoute>} />
                <Route path="/fixed-deposits"     element={<ProtectedRoute><FixedDeposits /></ProtectedRoute>} />
                <Route path="/loans"              element={<ProtectedRoute><Loans /></ProtectedRoute>} />
                <Route path="/cards"              element={<ProtectedRoute><Cards /></ProtectedRoute>} />
                <Route path="/notifications"      element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/scheduled-transfers" element={<ProtectedRoute><ScheduledTransfers /></ProtectedRoute>} />
                <Route path="/profile"            element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* Admin Portal */}
                <Route path="/admin"                  element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/customers"        element={<AdminRoute><AdminCustomers /></AdminRoute>} />
                <Route path="/admin/customers/:id"    element={<AdminRoute><AdminCustomerDetail /></AdminRoute>} />
                <Route path="/admin/create-account"   element={<AdminRoute><AdminCreateAccount /></AdminRoute>} />
                <Route path="/admin/deposit"          element={<AdminRoute><AdminDeposit /></AdminRoute>} />
                <Route path="/admin/loans"            element={<AdminRoute><AdminLoans /></AdminRoute>} />
                <Route path="/admin/transactions"     element={<AdminRoute><AdminTransactions /></AdminRoute>} />
                <Route path="/admin/audit-log"          element={<AdminRoute><AdminAuditLog /></AdminRoute>} />
                <Route path="/admin/deposit-requests" element={<AdminRoute><AdminDepositRequests /></AdminRoute>} />

                {/* 404 */}
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
