import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-dark)', color: 'var(--text-secondary)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="animate-spin" style={{
                        width: '40px', height: '40px', border: '3px solid var(--border-color)',
                        borderTop: '3px solid var(--accent-gold)', borderRadius: '50%', margin: '0 auto 1rem'
                    }} />
                    <p>Cargando Finted Dash...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <AuthPage onAuth={setSession} />;
    }

    return <Dashboard session={session} />;
}
