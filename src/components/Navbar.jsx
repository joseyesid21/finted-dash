import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar animate-slide-up">
      <div className="container">
        <Link to="/" className="flex items-center gap-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Bars */}
              <rect x="10" y="50" width="15" height="40" fill="var(--accent-gold)" />
              <rect x="35" y="30" width="15" height="60" fill="var(--accent-gold)" />
              <rect x="60" y="10" width="15" height="80" fill="var(--accent-gold)" />
              {/* Swoosh */}
              <path d="M 0 90 Q 50 30 100 20" stroke="var(--bg-dark)" strokeWidth="6" fill="none" />
              <path d="M 0 90 Q 50 30 100 20" stroke="var(--accent-gold)" strokeWidth="2" fill="none" />
            </svg>
            <div className="flex-col" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--accent-gold)', lineHeight: 1 }}>
                FINTED
              </span>
            </div>
          </div>
        </Link>
        <div className="nav-links">
          <a href="#portfolios">Portafolios</a>
          <a href="#about">Nosotros</a>
          <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            Portal Inversor
          </Link>
        </div>
      </div>
    </nav>
  );
}
