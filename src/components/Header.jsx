export default function Header({ trm }) {
    return (
        <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
            <div>
                <h1 style={{ fontSize: '1.8rem' }}>Bienvenido, Inversor</h1>
                <p>Panel de administración de fondos</p>
            </div>
            <div className="flex gap-4 items-center">
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>TRM Actual</div>
                    <div style={{ fontWeight: 600, color: '#10b981' }}>${trm.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ID Inversor</div>
                    <div style={{ fontWeight: 600 }}>#FNT-8492</div>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#121c26', fontWeight: 'bold' }}>
                    IN
                </div>
            </div>
        </header>
    );
}
