import { useState, useCallback } from 'react';
import { authApi } from '../api/auth';

const SESSION_KEY = 'nexabank_admin_pin_verified';

/**
 * AdminPinGate
 * Renders a full-screen security modal requiring admin PIN verification.
 * Verified status is stored in sessionStorage (cleared on browser close).
 * On success, calls onVerified() to let parent render the protected content.
 */
export default function AdminPinGate({ onVerified }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [locked, setLocked] = useState(false);

    const MAX_ATTEMPTS = 5;

    const handleKeypad = useCallback((digit) => {
        if (locked) return;
        if (digit === 'DEL') {
            setPin(p => p.slice(0, -1));
        } else if (pin.length < 20) {
            setPin(p => p + digit);
        }
        setError('');
    }, [pin, locked]);

    const handleVerify = useCallback(async () => {
        if (!pin || loading || locked) return;
        if (pin.length < 1) {
            setError('Please enter the admin PIN');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await authApi.verifyAdminPin(pin);
            // Success — store in sessionStorage and notify parent
            sessionStorage.setItem(SESSION_KEY, 'true');
            onVerified();
        } catch (err) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPin('');

            if (newAttempts >= MAX_ATTEMPTS) {
                setLocked(true);
                setError('Too many incorrect attempts. Please log out and log in again.');
            } else {
                setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`);
            }
        } finally {
            setLoading(false);
        }
    }, [pin, loading, locked, attempts, onVerified]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') handleVerify();
    }, [handleVerify]);

    const keypadButtons = ['1','2','3','4','5','6','7','8','9','0','DEL'];

    return (
        <div id="admin-pin-gate" style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #020212 0%, #0a0a2e 50%, #020212 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body, Inter, sans-serif)'
        }}>
            {/* Animated background particles */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {[...Array(12)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: `${Math.random() * 300 + 50}px`,
                        height: `${Math.random() * 300 + 50}px`,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        animation: `float ${4 + i * 0.7}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.3}s`
                    }} />
                ))}
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                background: 'rgba(10,10,40,0.92)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '24px',
                padding: '48px 40px',
                width: '100%', maxWidth: '420px',
                boxShadow: '0 0 80px rgba(124,58,237,0.15), 0 24px 80px rgba(0,0,0,0.8)',
                textAlign: 'center'
            }}>
                {/* Shield icon */}
                <div style={{
                    width: '80px', height: '80px',
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px',
                    border: '1px solid rgba(124,58,237,0.4)',
                    boxShadow: '0 0 30px rgba(124,58,237,0.3)'
                }}>
                    <i className="ri-shield-keyhole-fill" style={{ fontSize: '36px', color: '#7c3aed' }} />
                </div>

                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
                    Admin Access Verification
                </h1>
                <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '14px', marginBottom: '32px', lineHeight: '1.5' }}>
                    Enter your Admin PIN to continue. This session verification protects the admin portal.
                </p>

                {/* PIN input display */}
                <div style={{
                    display: 'flex', justifyContent: 'center', gap: '10px',
                    marginBottom: '28px', minHeight: '44px', alignItems: 'center'
                }}>
                    {pin.length === 0 ? (
                        <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: '14px' }}>Enter your PIN below</span>
                    ) : (
                        [...pin].map((_, i) => (
                            <div key={i} style={{
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                boxShadow: '0 0 8px rgba(124,58,237,0.6)',
                                animation: 'pinDot 0.15s ease-out'
                            }} />
                        ))
                    )}
                </div>

                {/* Text input (hidden behind keypad) */}
                <input
                    id="admin-pin-input"
                    type="password"
                    value={pin}
                    onChange={e => { if (!locked) { setPin(e.target.value); setError(''); } }}
                    onKeyDown={handleKeyDown}
                    placeholder="Or type your PIN here"
                    disabled={locked}
                    style={{
                        width: '100%', padding: '12px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(124,58,237,0.3)'}`,
                        borderRadius: '12px', color: '#fff', fontSize: '14px',
                        outline: 'none', textAlign: 'center', letterSpacing: '4px',
                        marginBottom: '16px', boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                    }}
                />

                {/* Keypad */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px', marginBottom: '20px'
                }}>
                    {keypadButtons.map(btn => (
                        <button
                            key={btn}
                            id={`pin-btn-${btn}`}
                            onClick={() => handleKeypad(btn)}
                            disabled={locked}
                            style={{
                                padding: '14px', borderRadius: '12px',
                                background: btn === 'DEL'
                                    ? 'rgba(239,68,68,0.1)'
                                    : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${btn === 'DEL' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                color: btn === 'DEL' ? '#ef4444' : '#fff',
                                fontSize: btn === 'DEL' ? '12px' : '18px',
                                fontWeight: '600', cursor: locked ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                gridColumn: btn === '0' ? '2' : 'auto'
                            }}
                            onMouseEnter={e => {
                                if (!locked) e.target.style.background = btn === 'DEL' ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)';
                            }}
                            onMouseLeave={e => {
                                e.target.style.background = btn === 'DEL' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)';
                            }}
                        >
                            {btn === 'DEL' ? <i className="ri-delete-back-2-line" /> : btn}
                        </button>
                    ))}
                </div>

                {/* Error message */}
                {error && (
                    <div style={{
                        padding: '10px 16px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px', marginBottom: '16px',
                        color: '#f87171', fontSize: '13px',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <i className="ri-error-warning-line" />
                        {error}
                    </div>
                )}

                {/* Verify button */}
                <button
                    id="admin-pin-verify-btn"
                    onClick={handleVerify}
                    disabled={loading || locked || !pin}
                    style={{
                        width: '100%', padding: '14px',
                        background: locked
                            ? 'rgba(100,100,100,0.3)'
                            : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                        border: 'none', borderRadius: '12px',
                        color: '#fff', fontSize: '15px', fontWeight: '700',
                        cursor: (loading || locked || !pin) ? 'not-allowed' : 'pointer',
                        opacity: (loading || !pin) ? 0.7 : 1,
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: locked ? 'none' : '0 4px 24px rgba(124,58,237,0.4)'
                    }}
                >
                    {loading
                        ? <><span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Verifying…</>
                        : locked
                        ? <><i className="ri-lock-fill" /> Access Locked</>
                        : <><i className="ri-shield-check-line" /> Verify & Enter Admin Portal</>
                    }
                </button>

                <p style={{ marginTop: '20px', color: 'rgba(148,163,184,0.5)', fontSize: '12px' }}>
                    <i className="ri-information-line" style={{ marginRight: '4px' }} />
                    Verification resets on each browser session.
                </p>
            </div>

            <style>{`
                @keyframes float {
                    from { transform: translate(-50%, -50%) scale(1); }
                    to { transform: translate(-50%, -50%) scale(1.3); }
                }
                @keyframes pinDot {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export { SESSION_KEY };
