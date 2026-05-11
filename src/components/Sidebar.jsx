import { Link } from 'react-router-dom';
import { Home, TrendingUp, Briefcase, Coins, Landmark, Activity, Cpu, BarChart2, LogOut } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

const getPortfolioIcon = (id) => {
    switch (id) {
        case 1: return <TrendingUp size={18} />;
        case 2: return <Briefcase size={18} />;
        case 3: return <Coins size={18} />;
        case 4: return <Landmark size={18} />;
        case 5: return <Activity size={18} />;
        case 6: return <Cpu size={18} />;
        default: return <BarChart2 size={18} />;
    }
};

export default function Sidebar({ activeTab, setActiveTab }) {
    const { portfolios, selectedPortfolioId, setSelectedPortfolioId } = usePortfolio();

    return (
        <aside className="sidebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="50" width="15" height="40" fill="var(--accent-gold)" />
                    <rect x="35" y="30" width="15" height="60" fill="var(--accent-gold)" />
                    <rect x="60" y="10" width="15" height="80" fill="var(--accent-gold)" />
                    <path d="M 0 90 Q 50 30 100 20" stroke="var(--bg-dark)" strokeWidth="6" fill="none" />
                    <path d="M 0 90 Q 50 30 100 20" stroke="var(--accent-gold)" strokeWidth="2" fill="none" />
                </svg>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-primary)' }}>
                    FINTED <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>DASH</span>
                </span>
            </div>

            <nav className="sidebar-nav">
                <button
                    onClick={() => { setActiveTab('overview'); setSelectedPortfolioId(null); }}
                    className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                    style={{ width: '100%', textAlign: 'left', background: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.05)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
                >
                    <Home size={20} /> Resumen General
                </button>

                <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', paddingLeft: '1rem' }}>
                    Tus Portafolios
                </div>

                {portfolios.map(p => (
                    <button
                        key={p.id}
                        onClick={() => { setActiveTab('portfolios'); setSelectedPortfolioId(p.id); }}
                        className={`sidebar-link ${(activeTab === 'portfolios' && selectedPortfolioId === p.id) ? 'active' : ''}`}
                        style={{
                            width: '100%', textAlign: 'left',
                            background: (activeTab === 'portfolios' && selectedPortfolioId === p.id) ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem',
                            color: (activeTab === 'portfolios' && selectedPortfolioId === p.id) ? 'var(--accent-gold)' : 'var(--text-primary)'
                        }}
                    >
                        {getPortfolioIcon(p.id)} {p.name}
                    </button>
                ))}
            </nav>

            <div style={{ marginTop: 'auto' }}>
                <Link to="/" className="sidebar-link">
                    <LogOut size={20} /> Volver al inicio
                </Link>
            </div>
        </aside>
    );
}

export { getPortfolioIcon };
