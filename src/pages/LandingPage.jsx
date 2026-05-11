import Navbar from '../components/Navbar';
import { Shield, TrendingUp, Bitcoin, PieChart, Activity, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

const portfolios = [
  {
    id: 1,
    title: 'Deuda Privada & Financiamiento',
    description: 'Estructuración de crédito corporativo e individual con garantías reales, enfocado en retornos consistentes y baja volatilidad.',
    icon: Shield,
    color: '#fbbf24'
  },
  {
    id: 2,
    title: 'Renta Variable Global',
    description: 'Estrategias de inversión en mercados accionarios internacionales, priorizando el crecimiento de capital y generación de dividendos.',
    icon: TrendingUp,
    color: '#3b82f6'
  },
  {
    id: 3,
    title: 'Activos Digitales',
    description: 'Gestión activa en criptoactivos de alta liquidez y capitalización, aplicando estrictos modelos de gestión de riesgo.',
    icon: Bitcoin,
    color: '#f59e0b'
  },
  {
    id: 4,
    title: 'Renta Fija Institucional',
    description: 'Preservación de patrimonio mediante la adquisición de bonos soberanos y deuda corporativa de grado de inversión.',
    icon: PieChart,
    color: '#10b981'
  },
  {
    id: 5,
    title: 'Trading Discrecional',
    description: 'Operativa táctica en múltiples marcos temporales (Intraday & Swing), ejecutada por nuestro comité de inversiones.',
    icon: Activity,
    color: '#ef4444'
  },
  {
    id: 6,
    title: 'Estrategias Cuantitativas',
    description: 'Despliegue de algoritmos propietarios y modelos matemáticos para capitalizar ineficiencias estructurales del mercado.',
    icon: Cpu,
    color: '#8b5cf6'
  }
];

export default function LandingPage() {
  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow"></div>
        <div className="container" style={{ textAlign: 'center', zIndex: 1 }}>
          <h1 className="animate-slide-up" style={{ marginBottom: '1.5rem', fontSize: '4rem', color: 'var(--accent-gold)' }}>
            FINTED
          </h1>
          <p className="animate-slide-up" style={{ animationDelay: '0.2s', maxWidth: '700px', margin: '0 auto 3rem auto', fontSize: '1.5rem', fontWeight: 300 }}>
            Inteligencia financiera para mercados globales.
          </p>
          <div className="flex justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <a href="#portfolios" className="btn btn-primary">Estrategias de Inversión</a>
            <Link to="/dashboard" className="btn btn-outline">Portal de Clientes</Link>
          </div>
        </div>
      </section>

      {/* Portfolios Section */}
      <section id="portfolios" className="section-padding" style={{ background: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="text-gradient">Nuestras Estrategias Principales</h2>
            <p style={{ maxWidth: '600px', margin: '0 auto' }}>Diversificación estructurada diseñada para optimizar el retorno ajustado al riesgo a través de múltiples clases de activos.</p>
          </div>
          
          <div className="grid-3">
            {portfolios.map((portfolio, index) => {
              const Icon = portfolio.icon;
              return (
                <div key={portfolio.id} className="glass-panel animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div style={{ 
                    background: `rgba(${parseInt(portfolio.color.slice(1, 3), 16)}, ${parseInt(portfolio.color.slice(3, 5), 16)}, ${parseInt(portfolio.color.slice(5, 7), 16)}, 0.1)`, 
                    display: 'inline-flex', 
                    padding: '1rem', 
                    borderRadius: '50%',
                    marginBottom: '1.5rem'
                  }}>
                    <Icon size={32} color={portfolio.color} />
                  </div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{portfolio.title}</h3>
                  <p>{portfolio.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer style={{ padding: '3rem 0', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Finted Investments. Alternative Asset Management. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
}
