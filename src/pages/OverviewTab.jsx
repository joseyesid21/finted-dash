import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

const COLORS = ['#8baf88', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

// Mock data for overall dashboard performance
const globalPerformanceData = [
    { name: 'Ene', value: 100000 },
    { name: 'Feb', value: 105000 },
    { name: 'Mar', value: 108000 },
    { name: 'Abr', value: 115000 },
    { name: 'May', value: 112000 },
    { name: 'Jun', value: 125000 },
    { name: 'Jul', value: 132000 },
    { name: 'Ago', value: 145000 },
    { name: 'Sep', value: 155000 },
];

export default function OverviewTab() {
    const { totalCapital, allocationData, portfolios } = usePortfolio();

    return (
        <div className="animate-fade-in">
            {/* Stats Grid */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Capital Total Fondeado</div>
                    <div className="stat-value">${totalCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className="trend-up"><ArrowUpRight size={16} /> Base + Depósitos</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Rendimiento Proyectado</div>
                    <div className="stat-value">+${(totalCapital * 0.068).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className="trend-up"><ArrowUpRight size={16} /> +6.8% este mes</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Portafolios Activos</div>
                    <div className="stat-value">{portfolios.filter(p => p.initialCapital > 0 || (p.transactions && p.transactions.length > 0)).length} / 6</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nivel de diversificación</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid-2">
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '1rem' }}>Crecimiento del Capital</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={globalPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--accent-gold)' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="var(--accent-gold)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel">
                    <h3 style={{ marginBottom: '1rem' }}>Distribución de Activos</h3>
                    {totalCapital > 0 ? (
                        <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
                            <ResponsiveContainer width="60%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {allocationData.map((item, index) => (
                                    <div key={item.name} className="flex items-center gap-4" style={{ fontSize: '0.875rem' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index] }}></div>
                                        <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-secondary">
                            No hay capital registrado para mostrar la distribución.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
