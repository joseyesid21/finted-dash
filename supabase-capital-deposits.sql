-- Tabla de Depósitos de Capital (fondeo del negocio de préstamos)
CREATE TABLE IF NOT EXISTS public.capital_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    monto NUMERIC NOT NULL,
    descripcion TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.capital_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own capital deposits" ON public.capital_deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own capital deposits" ON public.capital_deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own capital deposits" ON public.capital_deposits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own capital deposits" ON public.capital_deposits FOR DELETE USING (auth.uid() = user_id);
