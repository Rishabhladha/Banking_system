import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const navigate = useNavigate();

    const [user, setUser] = useState(() => {
        try {
            const u = localStorage.getItem('nexabank_user');
            return u ? JSON.parse(u) : null;
        } catch { return null; }
    });

    const [token, setToken] = useState(() => localStorage.getItem('nexabank_token'));

    const isLoggedIn = !!token;
    const isAdmin = user?.role === 'admin' || user?.role === 'staff';

    const login = useCallback((userData, tokenValue) => {
        localStorage.setItem('nexabank_token', tokenValue);
        localStorage.setItem('nexabank_user', JSON.stringify(userData));
        setToken(tokenValue);
        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        localStorage.removeItem('nexabank_token');
        localStorage.removeItem('nexabank_user');
        setToken(null);
        setUser(null);
        navigate('/auth');
    }, [navigate]);

    const updateUser = useCallback((updatedData) => {
        const updated = { ...user, ...updatedData };
        localStorage.setItem('nexabank_user', JSON.stringify(updated));
        setUser(updated);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, token, isLoggedIn, isAdmin, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
