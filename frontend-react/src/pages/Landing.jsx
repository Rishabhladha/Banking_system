import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export default function Landing() {
    const navRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            if (navRef.current) navRef.current.classList.toggle('scrolled', window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.12 });
        document.querySelectorAll('.feature-card,.step-card,.hero-stat').forEach(el => {
            el.classList.add('fade-in');
            observer.observe(el);
        });
        return () => observer.disconnect();
    }, []);

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />

            {/* NAVBAR */}
            <nav className="navbar" id="navbar" ref={navRef}>
                <div className="navbar-inner">
                    <Link to="/" className="nav-logo">
                        <div className="nav-logo-icon">🏦</div>
                        <span className="nav-logo-text">NexaBank</span>
                    </Link>
                    <div className="nav-links">
                        <button className="nav-link" onClick={() => scrollTo('features')}>Features</button>
                        <button className="nav-link" onClick={() => scrollTo('how')}>How It Works</button>
                        <button className="nav-link" onClick={() => scrollTo('security')}>Security</button>
                    </div>
                    <div className="nav-actions">
                        <Link to="/auth" className="btn btn-outline btn-sm">Sign In</Link>
                        <Link to="/auth?tab=register" className="btn btn-primary btn-sm">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot" />
                        Enterprise-Grade Banking Platform
                    </div>
                    <h1 className="hero-title">
                        Banking Built for the{' '}
                        <span className="gradient-text">Digital Age</span>
                    </h1>
                    <p className="hero-subtitle">
                        Experience real-time transfers, double-entry ledger accounting,
                        and bank-level security — all in one elegantly designed platform.
                    </p>
                    <div className="hero-cta">
                        <Link to="/auth?tab=register" className="btn btn-primary btn-lg" id="hero-cta-btn">
                            <i className="ri-rocket-line" /> Open Free Account
                        </Link>
                        <Link to="/auth" className="btn btn-outline btn-lg">
                            <i className="ri-login-circle-line" /> Sign In
                        </Link>
                    </div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hero-stat-value">ACID</span>
                            <span className="hero-stat-label">Transactions</span>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                            <span className="hero-stat-value">JWT</span>
                            <span className="hero-stat-label">Auth + Blacklist</span>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                            <span className="hero-stat-value">Real-time</span>
                            <span className="hero-stat-label">Notifications</span>
                        </div>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="hero-card hero-card-main glass-card">
                        <div className="hc-header">
                            <div className="hc-header-left">
                                <div className="hc-avatar">R</div>
                                <div>
                                    <div className="hc-name">Rishabh Ladha</div>
                                    <div className="hc-account-num">•••• •••• •••• 4827</div>
                                </div>
                            </div>
                            <div className="chip-icon">💳</div>
                        </div>
                        <div className="hc-balance">
                            <div className="hc-balance-label">Total Balance</div>
                            <div className="hc-balance-value">₹2,47,850.00</div>
                        </div>
                        <div className="hc-footer">
                            <div>
                                <div className="hc-footer-label">Monthly Income</div>
                                <div className="hc-footer-value text-green">+₹85,000</div>
                            </div>
                            <div>
                                <div className="hc-footer-label">Monthly Spend</div>
                                <div className="hc-footer-value text-red">-₹32,400</div>
                            </div>
                        </div>
                        <div className="card-glow" />
                    </div>
                    <div className="float-pill pill-1 glass-card">
                        <div className="pill-icon text-green"><i className="ri-arrow-down-line" /></div>
                        <div>
                            <div className="pill-title">Received</div>
                            <div className="pill-amount text-green">+₹15,000</div>
                        </div>
                    </div>
                    <div className="float-pill pill-2 glass-card">
                        <div className="pill-icon text-red"><i className="ri-arrow-up-line" /></div>
                        <div>
                            <div className="pill-title">Sent</div>
                            <div className="pill-amount text-red">-₹4,200</div>
                        </div>
                    </div>
                    <div className="float-pill pill-3 glass-card">
                        <i className="ri-shield-check-fill text-green" style={{ fontSize: '16px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Secured</span>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="features" id="features">
                <div className="section-header">
                    <div className="section-tag">Core Features</div>
                    <h2 className="section-title">Built for Production, <br />Designed for People</h2>
                    <p className="section-subtitle">Every feature is engineered to industry standard, from the database layer up.</p>
                </div>
                <div className="features-grid">
                    {[
                        { icon: 'ri-exchange-funds-fill', color: 'rgba(124,58,237,.15)', textColor: 'var(--purple-light)', title: 'Double-Entry Ledger', desc: 'Every transaction creates both a DEBIT and CREDIT ledger entry. Balance is computed from aggregation — no stale data ever.' },
                        { icon: 'ri-lock-password-fill', color: 'rgba(245,158,11,.12)', textColor: 'var(--gold)', title: 'ACID Transactions', desc: 'MongoDB multi-document sessions ensure your money transfers are atomic — either everything succeeds or everything rolls back.' },
                        { icon: 'ri-key-2-fill', color: 'rgba(16,185,129,.12)', textColor: 'var(--green)', title: 'Idempotent Transfers', desc: 'Every transfer carries a unique idempotency key — retrying a failed transfer never charges you twice. Zero duplicate risk.' },
                        { icon: 'ri-shield-keyhole-fill', color: 'rgba(6,182,212,.12)', textColor: 'var(--cyan)', title: 'JWT + Token Blacklist', desc: 'Secure JWT authentication with a TTL-indexed blacklist ensures logged-out tokens are always revoked. CSRF and XSS protected cookies.' },
                        { icon: 'ri-mail-send-fill', color: 'rgba(124,58,237,.15)', textColor: 'var(--purple-light)', title: 'Email Notifications', desc: 'Instant email alerts on registration and every transaction via OAuth2-secured Gmail — fully async, never blocking your response.' },
                        { icon: 'ri-user-settings-fill', color: 'rgba(245,158,11,.12)', textColor: 'var(--gold)', title: 'Role-Based Access', desc: 'System users have elevated privileges to fund accounts. Regular users can only access their own accounts — proper RBAC.' },
                    ].map((f, i) => (
                        <div key={i} className="feature-card glass-card">
                            <div className="feature-icon" style={{ background: f.color, color: f.textColor }}>
                                <i className={f.icon} />
                            </div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="how-section" id="how">
                <div className="section-header">
                    <div className="section-tag">Process</div>
                    <h2 className="section-title">Transfer Money in Seconds</h2>
                    <p className="section-subtitle">Our 4-step process is fast, secure, and fully auditable.</p>
                </div>
                <div className="steps-grid">
                    {[
                        { num: '01', icon: 'ri-user-add-fill', title: 'Create Account', desc: 'Sign up in seconds. Your banking account is created instantly with a unique ID.', connector: true },
                        { num: '02', icon: 'ri-bank-fill', title: 'Fund Your Account', desc: 'Deposit funds instantly — every rupee is recorded in the immutable ledger.', connector: true },
                        { num: '03', icon: 'ri-send-plane-fill', title: 'Transfer Instantly', desc: 'Send to any account ID. DEBIT and CREDIT ledger entries are created atomically.', connector: true },
                        { num: '04', icon: 'ri-history-fill', title: 'Track Everything', desc: 'Every transaction is permanently recorded. Your balance is always accurate, always live.', connector: false },
                    ].map((s, i) => (
                        <div key={i} className="step-card">
                            <div className="step-num">{s.num}</div>
                            <div className="step-icon"><i className={s.icon} /></div>
                            <h3 className="step-title">{s.title}</h3>
                            <p className="step-desc">{s.desc}</p>
                            {s.connector && <div className="step-connector" />}
                        </div>
                    ))}
                </div>
            </section>

            {/* SECURITY */}
            <section className="security-section" id="security">
                <div className="security-inner glass-card">
                    <div className="security-left">
                        <div className="section-tag">Security</div>
                        <h2 className="section-title" style={{ marginBottom: '16px' }}>
                            Your Money is Protected <br /><span className="gradient-text">at Every Layer</span>
                        </h2>
                        <p className="section-subtitle" style={{ marginBottom: '28px' }}>
                            Bank-grade security isn't optional. Every endpoint is protected, every token is verified.
                        </p>
                        <div className="security-list">
                            {[
                                'httpOnly + Secure + SameSite cookies',
                                'Password hashed with bcrypt (10 rounds)',
                                'JWT token blacklist with auto-expiry',
                                'Immutable ledger — no record can be deleted',
                                'MongoDB ACID sessions — no partial transfers',
                                'CORS locked to frontend origin',
                            ].map((item, i) => (
                                <div key={i} className="sec-item">
                                    <i className="ri-checkbox-circle-fill text-green" /> {item}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="security-right">
                        <div className="sec-graphic">
                            <div className="sec-shield">
                                <i className="ri-shield-check-fill" style={{ fontSize: '64px', color: 'var(--green)' }} />
                                <div className="sec-shield-glow" />
                            </div>
                            <div className="sec-ring sec-ring-1" />
                            <div className="sec-ring sec-ring-2" />
                            <div className="sec-ring sec-ring-3" />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <h2 className="cta-title">Ready to Experience <span className="gradient-text">Modern Banking?</span></h2>
                <p className="cta-subtitle">Join today. Zero fees. Full control over your money.</p>
                <Link to="/auth?tab=register" className="btn btn-gold btn-lg">
                    <i className="ri-rocket-line" /> Create Your Account — Free
                </Link>
            </section>

            {/* FOOTER */}
            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-logo">
                        <div className="nav-logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px' }}>🏦</div>
                        <span className="nav-logo-text" style={{ fontSize: '18px' }}>NexaBank</span>
                    </div>
                    <p className="footer-copy">© 2025 NexaBank. Built with ❤️ for the future.</p>
                    <div className="footer-links">
                        <Link to="/auth">Login</Link>
                        <Link to="/auth?tab=register">Register</Link>
                    </div>
                </div>
            </footer>
        </>
    );
}
