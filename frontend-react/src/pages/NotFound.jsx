import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px', opacity: 0.3 }}>🏦</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '72px', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px' }}>404</h1>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Page not found</p>
            <Link to="/" className="btn btn-primary">
                <i className="ri-home-line" /> Go Home
            </Link>
        </div>
    );
}
