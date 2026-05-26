import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { authApi } from '../api/auth';
import Spinner from '../components/Spinner';

export default function Auth() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isLoggedIn, login } = useAuth();
    const showToast = useToastContext();

    const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');

    // Redirect if already logged in
    useEffect(() => {
        if (isLoggedIn) navigate('/dashboard', { replace: true });
    }, [isLoggedIn, navigate]);

    // ----- Login state -----
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginPw, setShowLoginPw] = useState(false);

    // ----- Register state -----
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [showRegPw, setShowRegPw] = useState(false);
    const [pwScore, setPwScore] = useState(0);

    // Password strength
    const calcStrength = (val) => {
        let score = 0;
        if (val.length >= 6)  score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^a-zA-Z0-9]/.test(val)) score++;
        return score;
    };
    const strengthLevels = [
        { pct: '20%', color: 'var(--red)',   text: 'Very weak' },
        { pct: '40%', color: '#f97316',      text: 'Weak' },
        { pct: '60%', color: 'var(--gold)',   text: 'Fair' },
        { pct: '80%', color: 'var(--cyan)',   text: 'Strong' },
        { pct: '100%',color: 'var(--green)',  text: 'Very strong' },
    ];
    const pwLevel = strengthLevels[Math.min(pwScore, 4)];

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (!loginEmail || !loginPassword) { setLoginError('Please fill in all fields.'); return; }
        setLoginError('');
        setLoginLoading(true);
        try {
            const data = await authApi.login(loginEmail, loginPassword);
            login(data.user, data.token);
            showToast(`Welcome back, ${data.user.name}! 👋`, 'success');
            navigate('/dashboard');
        } catch (err) {
            setLoginError(err.message);
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!regName || !regEmail || !regPassword) { setRegError('Please fill in all fields.'); return; }
        if (regPassword.length < 6) { setRegError('Password must be at least 6 characters.'); return; }
        setRegError('');
        setRegLoading(true);
        try {
            const data = await authApi.register(regName, regEmail, regPassword);
            login(data.user, data.token);
            showToast(`Account created! Welcome, ${data.user.name} 🎉`, 'success');
            navigate('/dashboard');
        } catch (err) {
            setRegError(err.message);
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <>
            <div className="orb orb-1" />
            <div className="orb orb-2" />

            <div className="auth-page">
                {/* Left branding panel */}
                <div className="auth-brand">
                    <Link to="/" className="brand-logo">
                        <div className="brand-logo-icon">🏦</div>
                        <span className="brand-logo-text">NexaBank</span>
                    </Link>
                    <div className="brand-body">
                        <h2 className="brand-headline">
                            Secure Banking, <span className="gradient-text">Simplified.</span>
                        </h2>
                        <p className="brand-sub">
                            A full-stack banking platform with ACID transactions, double-entry ledger, and enterprise-grade security.
                        </p>
                        <div className="brand-features">
                            <div className="brand-feat"><i className="ri-shield-check-fill text-green" /><span>JWT Auth + Token Blacklist</span></div>
                            <div className="brand-feat"><i className="ri-exchange-funds-fill text-purple" /><span>Double-Entry Ledger System</span></div>
                            <div className="brand-feat"><i className="ri-lock-fill text-gold" /><span>bcrypt + Secure Cookies</span></div>
                            <div className="brand-feat"><i className="ri-database-2-fill" style={{ color: 'var(--cyan)' }} /><span>MongoDB ACID Sessions</span></div>
                        </div>
                    </div>
                    <div className="brand-card glass-card">
                        <div className="brand-card-top">
                            <div className="bc-dot bc-dot-1" /><div className="bc-dot bc-dot-2" /><div className="bc-dot bc-dot-3" />
                        </div>
                        <div className="bc-balance-label">Available Balance</div>
                        <div className="bc-balance">₹2,47,850.00</div>
                        <div className="bc-footer">
                            <span className="badge badge-active">● ACTIVE</span>
                            <span className="bc-id">ACC-4827</span>
                        </div>
                    </div>
                </div>

                {/* Right form panel */}
                <div className="auth-form-panel">
                    <div className="auth-card glass-card">
                        {/* Tab switcher */}
                        <div className="auth-tabs">
                            <button
                                className={`auth-tab${tab === 'login' ? ' active' : ''}`}
                                id="tab-login"
                                onClick={() => { setTab('login'); setLoginError(''); setRegError(''); }}
                            >
                                <i className="ri-login-circle-line" /> Sign In
                            </button>
                            <button
                                className={`auth-tab${tab === 'register' ? ' active' : ''}`}
                                id="tab-register"
                                onClick={() => { setTab('register'); setLoginError(''); setRegError(''); }}
                            >
                                <i className="ri-user-add-line" /> Register
                            </button>
                        </div>

                        {/* LOGIN */}
                        {tab === 'login' && (
                            <div className="auth-form-body" id="form-login">
                                <div className="form-welcome">
                                    <h1 className="form-title">Welcome back</h1>
                                    <p className="form-subtitle">Sign in to your NexaBank account</p>
                                </div>
                                <form id="login-form" onSubmit={handleLoginSubmit} noValidate>
                                    <div className="form-stack">
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="login-email">Email Address</label>
                                            <div className="input-wrapper">
                                                <i className="ri-mail-line input-icon" />
                                                <input
                                                    type="email" id="login-email"
                                                    className="form-input input-with-icon"
                                                    placeholder="you@example.com"
                                                    value={loginEmail}
                                                    onChange={e => setLoginEmail(e.target.value)}
                                                    autoComplete="email"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="login-password">Password</label>
                                            <div className="input-wrapper">
                                                <i className="ri-lock-line input-icon" />
                                                <input
                                                    type={showLoginPw ? 'text' : 'password'}
                                                    id="login-password"
                                                    className="form-input input-with-icon"
                                                    placeholder="Enter your password"
                                                    value={loginPassword}
                                                    onChange={e => setLoginPassword(e.target.value)}
                                                    autoComplete="current-password"
                                                />
                                                <button type="button" className="toggle-pw" tabIndex={-1} onClick={() => setShowLoginPw(v => !v)}>
                                                    <i className={showLoginPw ? 'ri-eye-line' : 'ri-eye-off-line'} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {loginError && <div id="login-error" className="form-error">{loginError}</div>}
                                    <button type="submit" className="btn btn-primary btn-full btn-lg" id="login-btn" disabled={loginLoading}>
                                        {loginLoading
                                            ? <><Spinner /> Signing in…</>
                                            : <><i className="ri-login-circle-line" /> Sign In</>
                                        }
                                    </button>
                                </form>
                                <p className="auth-switch">
                                    Don't have an account?{' '}
                                    <button className="auth-switch-link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={() => setTab('register')}>Create one free</button>
                                </p>
                            </div>
                        )}

                        {/* REGISTER */}
                        {tab === 'register' && (
                            <div className="auth-form-body" id="form-register">
                                <div className="form-welcome">
                                    <h1 className="form-title">Create account</h1>
                                    <p className="form-subtitle">Join NexaBank — free forever</p>
                                </div>
                                <form id="register-form" onSubmit={handleRegisterSubmit} noValidate>
                                    <div className="form-stack">
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="reg-name">Full Name</label>
                                            <div className="input-wrapper">
                                                <i className="ri-user-3-line input-icon" />
                                                <input
                                                    type="text" id="reg-name"
                                                    className="form-input input-with-icon"
                                                    placeholder="Rishabh Ladha"
                                                    value={regName}
                                                    onChange={e => setRegName(e.target.value)}
                                                    autoComplete="name"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="reg-email">Email Address</label>
                                            <div className="input-wrapper">
                                                <i className="ri-mail-line input-icon" />
                                                <input
                                                    type="email" id="reg-email"
                                                    className="form-input input-with-icon"
                                                    placeholder="you@example.com"
                                                    value={regEmail}
                                                    onChange={e => setRegEmail(e.target.value)}
                                                    autoComplete="email"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="reg-password">
                                                Password <span className="text-muted">(min 6 chars)</span>
                                            </label>
                                            <div className="input-wrapper">
                                                <i className="ri-lock-line input-icon" />
                                                <input
                                                    type={showRegPw ? 'text' : 'password'}
                                                    id="reg-password"
                                                    className="form-input input-with-icon"
                                                    placeholder="Choose a strong password"
                                                    value={regPassword}
                                                    onChange={e => { setRegPassword(e.target.value); setPwScore(calcStrength(e.target.value)); }}
                                                    autoComplete="new-password"
                                                    minLength={6}
                                                />
                                                <button type="button" className="toggle-pw" tabIndex={-1} onClick={() => setShowRegPw(v => !v)}>
                                                    <i className={showRegPw ? 'ri-eye-line' : 'ri-eye-off-line'} />
                                                </button>
                                            </div>
                                            {regPassword && (
                                                <div className="pw-strength" id="pw-strength">
                                                    <div className="pw-strength-bar">
                                                        <div className="pw-strength-fill" id="pw-fill" style={{ width: pwLevel.pct, background: pwLevel.color }} />
                                                    </div>
                                                    <span className="pw-strength-label" id="pw-label" style={{ color: pwLevel.color }}>{pwLevel.text}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {regError && <div id="reg-error" className="form-error">{regError}</div>}
                                    <button type="submit" className="btn btn-primary btn-full btn-lg" id="reg-btn" disabled={regLoading}>
                                        {regLoading
                                            ? <><Spinner /> Creating account…</>
                                            : <><i className="ri-user-add-line" /> Create Account</>
                                        }
                                    </button>
                                </form>
                                <p className="auth-switch">
                                    Already have an account?{' '}
                                    <button className="auth-switch-link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={() => setTab('login')}>Sign in</button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
