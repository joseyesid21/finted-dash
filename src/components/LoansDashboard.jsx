import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, ChevronLeft, Trash2, Edit2, DollarSign, User, Calendar, Percent, CheckCircle, Search, CreditCard, Receipt } from 'lucide-react';

// Math function to calculate PMT (Sistema de Amortización Francés)
const calculatePMT = (rate, nper, pv) => {
    if (rate === 0) return pv / nper;
    return (pv * rate) / (1 - Math.pow(1 + rate, -nper));
};

export default function LoansDashboard({ session }) {
    const [view, setView] = useState('list');
    const [clients, setClients] = useState([]);
    const [loans, setLoans] = useState([]);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [payments, setPayments] = useState([]);
    const [detailTab, setDetailTab] = useState('amortizacion');
    const [clientFound, setClientFound] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ monto: '', fecha: new Date().toISOString().split('T')[0], numero_cuota: '' });
    const [editingPayment, setEditingPayment] = useState(null);
    const [formData, setFormData] = useState({
        cedula: '', nombre: '', telefono: '',
        monto: '', tasa: '', plazo: '', fecha: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchLoansData();
        }
    }, [session]);

    const fetchLoansData = async () => {
        setLoading(true);
        try {
            const { data: clientsData } = await supabase.from('clients').select('*');
            const { data: loansData } = await supabase.from('loans').select('*, clients(*)');
            if (clientsData) setClients(clientsData);
            if (loansData) setLoans(loansData);
        } catch (error) {
            console.error("Error fetching loans data", error);
        }
        setLoading(false);
    };

    const fetchPayments = async (loanId) => {
        const { data } = await supabase.from('loan_payments').select('*').eq('loan_id', loanId).order('numero_cuota');
        if (data) setPayments(data);
    };

    const viewLoanDetails = (loan) => {
        setSelectedLoan(loan);
        fetchPayments(loan.id);
        setDetailTab('amortizacion');
        setView('details');
    };

    // Auto-detect client by cedula
    const handleCedulaChange = (cedula) => {
        setFormData(prev => ({ ...prev, cedula }));
        const found = clients.find(c => c.cedula === cedula);
        if (found) {
            setClientFound(found);
            setFormData(prev => ({ ...prev, nombre: found.nombre, telefono: found.telefono || '' }));
        } else {
            setClientFound(null);
        }
    };

    // CRUD Payments
    const handleSavePayment = async (e) => {
        e.preventDefault();
        if (!selectedLoan) return;
        const schedule = generateSchedule();
        const cuotaNum = parseInt(paymentForm.numero_cuota) || 0;
        const row = schedule.find(r => r.nper === cuotaNum);
        const payload = {
            loan_id: selectedLoan.id, user_id: session.user.id,
            numero_cuota: cuotaNum, fecha_pago: paymentForm.fecha,
            monto_pagado: parseFloat(paymentForm.monto),
            interes_cobrado: row ? row.interes : 0,
            capital_abonado: row ? row.capital : parseFloat(paymentForm.monto),
        };
        if (editingPayment) {
            await supabase.from('loan_payments').update(payload).eq('id', editingPayment.id);
        } else {
            await supabase.from('loan_payments').insert([payload]);
        }
        setEditingPayment(null);
        setPaymentForm({ monto: '', fecha: new Date().toISOString().split('T')[0], numero_cuota: '' });
        fetchPayments(selectedLoan.id);
    };

    const handleEditPayment = (p) => {
        setEditingPayment(p);
        setPaymentForm({ monto: String(p.monto_pagado), fecha: p.fecha_pago, numero_cuota: String(p.numero_cuota) });
    };

    const handleDeletePayment = async (id) => {
        if (!window.confirm('¿Eliminar este pago?')) return;
        await supabase.from('loan_payments').delete().eq('id', id);
        fetchPayments(selectedLoan.id);
    };

    const handleCreateLoan = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Check or Create Client
            let clientId;
            const existingClient = clients.find(c => c.cedula === formData.cedula);
            
            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient, error: clientErr } = await supabase.from('clients').insert([{
                    user_id: session.user.id,
                    cedula: formData.cedula,
                    nombre: formData.nombre,
                    telefono: formData.telefono
                }]).select().single();
                
                if (clientErr) throw clientErr;
                clientId = newClient.id;
            }

            // 2. Create Loan
            const { error: loanErr } = await supabase.from('loans').insert([{
                user_id: session.user.id,
                client_id: clientId,
                monto_prestado: parseFloat(formData.monto),
                tasa_interes_mensual: parseFloat(formData.tasa),
                plazo_meses: parseInt(formData.plazo),
                fecha_desembolso: formData.fecha,
                estado: 'Activo'
            }]);

            if (loanErr) throw loanErr;

            await fetchLoansData();
            setView('list');
            setFormData({ cedula: '', nombre: '', telefono: '', monto: '', tasa: '', plazo: '', fecha: new Date().toISOString().split('T')[0] });
        } catch (error) {
            console.error("Error creating loan:", error);
            alert("Error al crear el préstamo. Asegúrate de haber ejecutado el script SQL en Supabase.");
        }
        setLoading(false);
    };

    const handleDeleteLoan = async (loanId) => {
        if (!window.confirm('¿Estás seguro de eliminar este préstamo y todo su historial de pagos?')) return;
        await supabase.from('loans').delete().eq('id', loanId);
        await fetchLoansData();
    };

    // Calculate Amortization Table for UI
    const generateSchedule = () => {
        if (!selectedLoan) return [];
        
        let balance = parseFloat(selectedLoan.monto_prestado);
        const rate = parseFloat(selectedLoan.tasa_interes_mensual) / 100;
        const nper = parseInt(selectedLoan.plazo_meses);
        const pmt = calculatePMT(rate, nper, parseFloat(selectedLoan.monto_prestado));

        let schedule = [];
        
        // Row 0
        schedule.push({ nper: 0, cuota: 0, abonoAdicional: 0, interes: 0, capital: 0, saldoDiferido: balance });

        for (let i = 1; i <= nper; i++) {
            if (balance <= 0.01) break; // Paid off
            
            let interest = balance * rate;
            let capital = pmt - interest;
            
            // In a real advanced system, we check `payments` array here to see if user paid early/extra
            // For now, we project the theoretical table as requested in the Excel image
            balance = balance - capital;
            
            schedule.push({
                nper: i,
                cuota: pmt,
                abonoAdicional: 0,
                interes: interest,
                capital: capital,
                saldoDiferido: balance < 0 ? 0 : balance
            });
        }
        return schedule;
    };

    // Financial Balance Computations
    const totalCapitalPrestado = useMemo(() => loans.reduce((s, l) => s + parseFloat(l.monto_prestado || 0), 0), [loans]);
    const totalInteresesProyectados = useMemo(() => {
        return loans.reduce((s, l) => {
            const r = parseFloat(l.tasa_interes_mensual) / 100;
            const n = parseInt(l.plazo_meses);
            const pv = parseFloat(l.monto_prestado);
            const pmt = calculatePMT(r, n, pv);
            return s + (pmt * n - pv);
        }, 0);
    }, [loans]);
    const totalCobrado = useMemo(() => payments.reduce((s, p) => s + parseFloat(p.monto_pagado || 0), 0), [payments]);
    const saldoActualLoan = useMemo(() => {
        if (!selectedLoan) return 0;
        const paid = payments.reduce((s, p) => s + parseFloat(p.capital_abonado || 0), 0);
        return parseFloat(selectedLoan.monto_prestado) - paid;
    }, [selectedLoan, payments]);
    const gananciaIntLoan = useMemo(() => payments.reduce((s, p) => s + parseFloat(p.interes_cobrado || 0), 0), [payments]);

    const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);

    return (
        <div className="animate-fade-in" style={{ padding: '1rem' }}>
            
            {/* Header */}
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign /> Módulo de Préstamos
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestión financiera profesional de créditos y amortización.</p>
                </div>
                {view === 'list' && (
                    <button 
                        onClick={() => setView('new_loan')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-gold)', color: '#000', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        <Plus size={18} /> Nuevo Crédito
                    </button>
                )}
                {view !== 'list' && (
                    <button 
                        onClick={() => setView('list')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                    >
                        <ChevronLeft size={18} /> Volver
                    </button>
                )}
            </div>

            {/* GLOBAL BALANCE CARDS */}
            {view === 'list' && loans.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '2px solid #10b981' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Capital Total Prestado</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(totalCapitalPrestado)}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '2px solid #3b82f6' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total a Recuperar (Capital + Interés)</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(totalCapitalPrestado + totalInteresesProyectados)}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '2px solid #f59e0b' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ganancia Proyectada (Intereses)</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(totalInteresesProyectados)}</div>
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && (
                <div className="glass-panel" style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Cliente</th>
                                <th style={{ padding: '1rem' }}>Cédula</th>
                                <th style={{ padding: '1rem' }}>Monto Crédito</th>
                                <th style={{ padding: '1rem' }}>Tasa</th>
                                <th style={{ padding: '1rem' }}>Plazo</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay préstamos registrados.</td></tr>
                            ) : loans.map(loan => (
                                <tr key={loan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{loan.clients?.nombre}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{loan.clients?.cedula}</td>
                                    <td style={{ padding: '1rem', color: '#10b981' }}>{formatCurrency(loan.monto_prestado)}</td>
                                    <td style={{ padding: '1rem' }}>{loan.tasa_interes_mensual}%</td>
                                    <td style={{ padding: '1rem' }}>{loan.plazo_meses} meses</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button onClick={() => viewLoanDetails(loan)} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>Ver Tabla</button>
                                        <button onClick={() => handleDeleteLoan(loan.id)} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* NEW LOAN VIEW */}
            {view === 'new_loan' && (
                <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Registrar Nuevo Crédito</h3>
                    <form onSubmit={handleCreateLoan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="grid-2">
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}><Search size={14} style={{display:'inline',marginRight:'4px'}}/>Cédula Cliente</label>
                                <input type="text" required value={formData.cedula} onChange={e => handleCedulaChange(e.target.value)} placeholder="Buscar por cédula..." style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: `1px solid ${clientFound ? '#10b981' : 'var(--border-color)'}`, color: 'white', borderRadius: '0.5rem' }} />
                                {clientFound && <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12}/> Cliente encontrado: {clientFound.nombre}</div>}
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nombre Completo</label>
                                <input type="text" required value={formData.nombre} readOnly={!!clientFound} onChange={e => setFormData({...formData, nombre: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: clientFound ? 'rgba(16,185,129,0.1)' : 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.5rem' }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Teléfono</label>
                            <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.5rem' }} />
                        </div>
                        
                        <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />
                        
                        <div className="grid-2">
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Monto a Prestar (S/ o $)</label>
                                <input type="number" step="0.01" required value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.5rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tasa Mensual (%)</label>
                                <input type="number" step="0.01" required value={formData.tasa} onChange={e => setFormData({...formData, tasa: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.5rem' }} />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Plazo (Meses)</label>
                                <input type="number" required value={formData.plazo} onChange={e => setFormData({...formData, plazo: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.5rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fecha Desembolso</label>
                                <input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.5rem' }} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={{ marginTop: '1rem', padding: '1rem', background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                            {loading ? 'Guardando...' : 'Generar Préstamo'}
                        </button>
                    </form>
                </div>
            )}

            {/* DETAILS VIEW */}
            {view === 'details' && selectedLoan && (
                <div>
                    {/* Client Info + Credit Conditions */}
                    <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Información del Cliente</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{selectedLoan.clients?.nombre}</div>
                            <div>Cédula: {selectedLoan.clients?.cedula}</div>
                            <div>Teléfono: {selectedLoan.clients?.telefono}</div>
                        </div>
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Condiciones del Crédito</div>
                            <div className="grid-2">
                                <div>Crédito:<br/><strong style={{color:'#10b981'}}>{formatCurrency(selectedLoan.monto_prestado)}</strong></div>
                                <div>Tasa:<br/><strong>{selectedLoan.tasa_interes_mensual}%</strong></div>
                                <div>Plazo:<br/><strong>{selectedLoan.plazo_meses} meses</strong></div>
                                <div>Cuota Fija:<br/><strong style={{color:'#f59e0b'}}>{formatCurrency(calculatePMT(selectedLoan.tasa_interes_mensual/100, selectedLoan.plazo_meses, selectedLoan.monto_prestado))}</strong></div>
                            </div>
                        </div>
                    </div>

                    {/* Balance Cards for this Loan */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Capital Prestado</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>{formatCurrency(selectedLoan.monto_prestado)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Saldo Actual</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.25rem' }}>{formatCurrency(saldoActualLoan)}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #3b82f6' }}>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ganancia (Intereses Cobrados)</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.25rem' }}>{formatCurrency(gananciaIntLoan)}</div>
                        </div>
                    </div>

                    {/* Detail Tabs */}
                    <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                        {[{key:'amortizacion', label:'Tabla de Amortización', icon: <Receipt size={14}/>}, {key:'depositos', label:'Depósitos / Pagos', icon: <CreditCard size={14}/>}].map(t => (
                            <button key={t.key} onClick={() => setDetailTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: '0.75rem 1.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: detailTab === t.key ? 'var(--accent-gold)' : 'var(--text-secondary)', borderBottom: detailTab === t.key ? '2px solid var(--accent-gold)' : '2px solid transparent' }}>{t.icon}{t.label}</button>
                        ))}
                    </div>

                    {/* TAB: Amortización */}
                    {detailTab === 'amortizacion' && (
                        <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Nper</th>
                                        <th style={{ padding: '0.75rem' }}>Cuotas</th>
                                        <th style={{ padding: '0.75rem' }}>Abono Adicional</th>
                                        <th style={{ padding: '0.75rem' }}>Interés</th>
                                        <th style={{ padding: '0.75rem' }}>Capital</th>
                                        <th style={{ padding: '0.75rem' }}>Saldo Diferido</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {generateSchedule().map((row, idx) => {
                                        const isPaid = payments.some(p => p.numero_cuota === row.nper);
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isPaid ? 'rgba(16,185,129,0.08)' : 'transparent' }}>
                                                <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{row.nper}</td>
                                                <td style={{ padding: '0.75rem', color: row.nper > 0 ? '#10b981' : 'inherit' }}>{row.nper > 0 ? formatCurrency(row.cuota) : ''}</td>
                                                <td style={{ padding: '0.75rem' }}>{row.nper > 0 ? formatCurrency(row.abonoAdicional) : ''}</td>
                                                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{row.nper > 0 ? formatCurrency(row.interes) : ''}</td>
                                                <td style={{ padding: '0.75rem' }}>{row.nper > 0 ? formatCurrency(row.capital) : ''}</td>
                                                <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{formatCurrency(row.saldoDiferido)}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{row.nper === 0 ? '' : isPaid ? <CheckCircle size={16} color="#10b981"/> : <span style={{color:'var(--text-secondary)', fontSize:'0.75rem'}}>Pendiente</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: Depósitos / Pagos */}
                    {detailTab === 'depositos' && (
                        <div>
                            {/* Payment Form */}
                            <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>{editingPayment ? 'Editar Pago' : 'Registrar Pago'}</h4>
                                <form onSubmit={handleSavePayment} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '120px' }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No. Cuota</label>
                                        <input type="number" min="1" required value={paymentForm.numero_cuota} onChange={e => setPaymentForm({...paymentForm, numero_cuota: e.target.value})} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.375rem' }}/>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monto Pagado</label>
                                        <input type="number" step="0.01" required value={paymentForm.monto} onChange={e => setPaymentForm({...paymentForm, monto: e.target.value})} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.375rem' }}/>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fecha de Pago</label>
                                        <input type="date" required value={paymentForm.fecha} onChange={e => setPaymentForm({...paymentForm, fecha: e.target.value})} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '0.375rem' }}/>
                                    </div>
                                    <button type="submit" style={{ padding: '0.6rem 1.5rem', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '0.375rem', fontWeight: 700, cursor: 'pointer' }}>{editingPayment ? 'Actualizar' : 'Guardar'}</button>
                                    {editingPayment && <button type="button" onClick={() => { setEditingPayment(null); setPaymentForm({ monto: '', fecha: new Date().toISOString().split('T')[0], numero_cuota: '' }); }} style={{ padding: '0.6rem 1rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancelar</button>}
                                </form>
                            </div>

                            {/* Payments Table */}
                            <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)' }}>
                                            <th style={{ padding: '0.75rem 1rem' }}>Cuota #</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>Fecha Pago</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Monto Pagado</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>A Interés</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>A Capital</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? (
                                            <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay pagos registrados para este préstamo.</td></tr>
                                        ) : payments.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{p.numero_cuota}</td>
                                                <td style={{ padding: '0.75rem 1rem' }}>{p.fecha_pago}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatCurrency(p.monto_pagado)}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(p.interes_cobrado)}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{formatCurrency(p.capital_abonado)}</td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button onClick={() => handleEditPayment(p)} style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeletePayment(p.id)} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
