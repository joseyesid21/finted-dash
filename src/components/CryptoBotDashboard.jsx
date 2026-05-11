import React, { useState } from 'react';
import { Activity, ShieldCheck, ShieldAlert, Play, Square, Settings, Zap, ArrowDown, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Area, Line, ReferenceLine } from 'recharts';

export default function CryptoBotDashboard({ portfolio }) {
    const [botStatus, setBotStatus] = useState('inactive'); // 'inactive', 'running', 'triggered'
    const [config, setConfig] = useState({
        poolAddress: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8', // USDC/WETH
        minPrice: '2500',
        maxPrice: '3500',
        hlApiKey: '',
        hlSecretKey: '',
        leverage: '10',
        hedgeSize: '1000'
    });

    const [currentPrice, setCurrentPrice] = useState(2650.45);

    // Simulated chart data
    const generateChartData = () => {
        const data = [];
        let price = 2800;
        for (let i = 0; i < 20; i++) {
            data.push({ time: `T-${20-i}`, price: price });
            price = price + (Math.random() * 100 - 60); // trending down
        }
        data.push({ time: 'Ahora', price: currentPrice });
        return data;
    };

    const handleToggleBot = () => {
        if (botStatus === 'inactive') {
            if (!config.hlApiKey || !config.hlSecretKey) {
                alert('Por favor ingresa tus claves API de Hyperliquid para activar el bot de cobertura.');
                return;
            }
            setBotStatus('running');
        } else {
            setBotStatus('inactive');
        }
    };

    const handleSimulateDrop = () => {
        if (botStatus !== 'running') {
            alert('Activa el bot primero para simular.');
            return;
        }
        setCurrentPrice(parseFloat(config.minPrice) - 10);
        setBotStatus('triggered');
        alert(`¡ALERTA! El precio cayó por debajo del Mínimo (${config.minPrice}).\nBot activado: Orden SHORT enviada a Hyperliquid por $${config.hedgeSize} con apalancamiento ${config.leverage}x.`);
    };

    return (
        <div className="animate-slide-up" style={{ paddingBottom: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck color="#10b981" /> Bot de Cobertura DeFi (Uniswap + Hyperliquid)
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Protege tu liquidez contra el Impermanent Loss. Cuando el precio rompa tu rango mínimo, abriremos un SHORT automático.
                </p>
            </div>

            <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2rem', alignItems: 'start' }}>
                
                {/* Panel de Configuración */}
                <div className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Settings size={20} color="var(--accent-gold)" />
                        <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Configuración del Bot</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pool de Uniswap V3 (Dirección o Par)</label>
                            <input 
                                type="text" 
                                value={config.poolAddress} 
                                onChange={(e) => setConfig({...config, poolAddress: e.target.value})}
                                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: '#fff' }}
                            />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Precio Mínimo del Rango</label>
                                <input 
                                    type="number" 
                                    value={config.minPrice} 
                                    onChange={(e) => setConfig({...config, minPrice: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: '#fff', borderLeft: '3px solid #ef4444' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Precio Máximo del Rango</label>
                                <input 
                                    type="number" 
                                    value={config.maxPrice} 
                                    onChange={(e) => setConfig({...config, maxPrice: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: '#fff', borderLeft: '3px solid #10b981' }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={16} color="#3b82f6" /> Parámetros de Cobertura (Hyperliquid)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tamaño (USD)</label>
                                    <input 
                                        type="number" 
                                        value={config.hedgeSize} 
                                        onChange={(e) => setConfig({...config, hedgeSize: e.target.value})}
                                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Apalancamiento (x)</label>
                                    <input 
                                        type="number" 
                                        value={config.leverage} 
                                        onChange={(e) => setConfig({...config, leverage: e.target.value})}
                                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', color: '#fff' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>API Key</label>
                                <input 
                                    type="password" 
                                    placeholder="Ingresa tu API Key"
                                    value={config.hlApiKey} 
                                    onChange={(e) => setConfig({...config, hlApiKey: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', color: '#fff', marginBottom: '0.5rem' }}
                                />
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Secret Key</label>
                                <input 
                                    type="password" 
                                    placeholder="Ingresa tu Secret Key"
                                    value={config.hlSecretKey} 
                                    onChange={(e) => setConfig({...config, hlSecretKey: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', color: '#fff' }}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleToggleBot}
                            style={{ 
                                width: '100%', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none',
                                background: botStatus === 'inactive' ? 'var(--accent-gold)' : '#ef4444',
                                color: botStatus === 'inactive' ? '#121c26' : '#fff',
                            }}
                        >
                            {botStatus === 'inactive' ? <><Play size={18} /> Activar Bot de Cobertura</> : <><Square size={18} /> Detener Bot</>}
                        </button>
                    </div>
                </div>

                {/* Panel de Monitoreo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Status Card */}
                    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Estado del Sistema</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
                                {botStatus === 'inactive' && <><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-secondary)' }}></div> Apagado</>}
                                {botStatus === 'running' && <><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} className="animate-pulse"></div> Monitoreando...</>}
                                {botStatus === 'triggered' && <><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} className="animate-pulse"></div> ¡SHORT EJECUTADO!</>}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Precio Actual (Pool)</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: currentPrice < parseFloat(config.minPrice) ? '#ef4444' : '#fff' }}>
                                ${currentPrice.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="glass-panel" style={{ flexGrow: 1, minHeight: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16}/> Gráfico en Vivo (Simulado)</h3>
                            <button onClick={handleSimulateDrop} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                                Simular Caída
                            </button>
                        </div>
                        <div style={{ height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={generateChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                    
                                    <ReferenceLine y={parseFloat(config.maxPrice)} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'Límite Superior', fill: '#10b981', fontSize: 10 }} />
                                    <ReferenceLine y={parseFloat(config.minPrice)} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Límite Inferior (Gatillo)', fill: '#ef4444', fontSize: 10 }} />
                                    
                                    <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {botStatus === 'triggered' && (
                        <div className="glass-panel" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <ShieldAlert size={18} /> Posición de Cobertura Activa
                            </h3>
                            <div className="flex justify-between items-center" style={{ fontSize: '0.875rem' }}>
                                <span>Operación en Hyperliquid:</span>
                                <span style={{ fontWeight: 700, color: '#ef4444' }}>SHORT {config.leverage}x</span>
                            </div>
                            <div className="flex justify-between items-center" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                <span>Tamaño de la posición:</span>
                                <span style={{ fontWeight: 700 }}>${parseFloat(config.hedgeSize).toLocaleString()} USD</span>
                            </div>
                            <div className="flex justify-between items-center" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                <span>Estado de la API:</span>
                                <span style={{ color: '#10b981', fontWeight: 600 }}>Orden ejecutada correctamente</span>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
