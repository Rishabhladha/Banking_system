import Sidebar from './Sidebar';

export default function Layout({ title, subtitle, headerRight, children }) {
    return (
        <div className="app-layout">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <Sidebar />
            <main className="app-main">
                <header className="app-header">
                    <div>
                        <h1 className="page-title" style={{ fontSize: '22px', marginBottom: 0 }}>{title}</h1>
                        {subtitle && <p className="page-subtitle">{subtitle}</p>}
                    </div>
                    {headerRight && <div>{headerRight}</div>}
                </header>
                <div className="app-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
