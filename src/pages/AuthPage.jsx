import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LogIn, UserPlus, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

const DEFAULT_PORTFOLIOS = [
    { name: 'Acciones', initial_capital: 0 },
    { name: 'Préstamos', initial_capital: 0 },
    { name: 'Cryptos', initial_capital: 0 },
    { name: 'Renta Fija', initial_capital: 0 },
    { name: 'Trading Manual', initial_capital: 0 },
    { name: 'Trading Algorítmico', initial_capital: 0 },
];

export default function AuthPage({ onAuth }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
                if (authError) throw authError;
                onAuth(data.session);
            } else {
                const { data, error: authError } = await supabase.auth.signUp({ email, password });
                if (authError) throw authError;

                // Create default portfolios for the new user
                if (data.user) {
                    const portfoliosToInsert = DEFAULT_PORTFOLIOS.map(p => ({
                        ...p,
                        user_id: data.user.id
                    }));
                    await supabase.from('portfolios').insert(portfoliosToInsert);
                }
                onAuth(data.session);
            }
        } catch (err) {
            setError(err.message === 'Invalid login credentials'
                ? 'Email o contraseña incorrectos'
                : err.message || 'Error de autenticación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-dark)', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(139, 175, 136, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div className="glass-panel animate-slide-up" style={{
                width: '100%', maxWidth: '420px', padding: '2.5rem', position: 'relative',
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1rem' }}>
                        <rect x="10" y="50" width="15" height="40" fill="var(--accent-gold)" />
                        <rect x="35" y="30" width="15" height="60" fill="var(--accent-gold)" />
                        <rect x="60" y="10" width="15" height="80" fill="var(--accent-gold)" />
                        <path d="M 0 90 Q 50 30 100 20" stroke="var(--bg-dark)" strokeWidth="6" fill="none" />
                        <path d="M 0 90 Q 50 30 100 20" stroke="var(--accent-gold)" strokeWidth="2" fill="none" />
                    </svg>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                        FINTED <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>DASH</span>
                    </h2>
                    <p style={{ fontSize: '0.875rem' }}>
                        {isLogin ? 'Ingresa a tu panel de inversiones' : 'Crea tu cuenta de inversor'}
                    </p>
                </div>

                {/* Error message */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#ef4444'
                    }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            <Mail size={14} /> Correo electrónico
                        </label>
                        <input
                            type="email" required placeholder="inversor@finted.co"
                            value={email} onChange={e => setEmail(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)', background: 'var(--bg-dark)',
                                color: 'white', fontSize: '1rem', outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            <Lock size={14} /> Contraseña
                        </label>
                        <input
                            type="password" required placeholder="••••••••" minLength={6}
                            value={password} onChange={e => setPassword(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)', background: 'var(--bg-dark)',
                                color: 'white', fontSize: '1rem', outline: 'none'
                            }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem'
                        }}
                    >
                        {loading ? 'Procesando...' : (
                            <>
                                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{
                            background: 'none', border: 'none', color: 'var(--accent-gold)',
                            cursor: 'pointer', fontWeight: 600, textDecoration: 'underline',
                            fontSize: '0.875rem', fontFamily: 'inherit'
                        }}
                    >
                        {isLogin ? 'Regístrate' : 'Inicia sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
}
