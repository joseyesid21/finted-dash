-- ================================================
-- FINTED DASH: Database Schema
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- 1. PORTFOLIOS
CREATE TABLE portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    initial_capital NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own portfolios" ON portfolios FOR ALL USING (auth.uid() = user_id);

-- 2. ASSETS (posiciones abiertas)
CREATE TABLE assets (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    quantity NUMERIC DEFAULT 1,
    buy_price NUMERIC NOT NULL,
    total_value NUMERIC NOT NULL,
    date DATE NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    email TEXT DEFAULT '',
    interest_rate NUMERIC DEFAULT 0,
    plazo TEXT DEFAULT '1',
    score TEXT DEFAULT '700',
    riesgo TEXT DEFAULT 'Bajo',
    tipo_doc TEXT DEFAULT 'CC',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own assets" ON assets FOR ALL USING (auth.uid() = user_id);

-- 3. TRANSACTIONS (depósitos y retiros)
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC NOT NULL,
    commission NUMERIC DEFAULT 0,
    date DATE NOT NULL,
    comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- 4. CLOSED TRADES (operaciones cerradas / ventas)
CREATE TABLE closed_trades (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    asset_id BIGINT,
    ticker TEXT NOT NULL,
    name TEXT,
    sell_quantity NUMERIC NOT NULL,
    sell_price NUMERIC NOT NULL,
    buy_price NUMERIC NOT NULL,
    realized_pnl NUMERIC NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE closed_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own closed_trades" ON closed_trades FOR ALL USING (auth.uid() = user_id);

-- 5. BUY HISTORY (historial de compras)
CREATE TABLE buy_history (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    quantity NUMERIC NOT NULL,
    buy_price NUMERIC NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE buy_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own buy_history" ON buy_history FOR ALL USING (auth.uid() = user_id);
