-- Script para crear el esquema profesional del módulo de préstamos financieros

-- 1. Tabla de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cedula TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de Préstamos
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    monto_prestado NUMERIC NOT NULL,
    tasa_interes_mensual NUMERIC NOT NULL,
    plazo_meses INTEGER NOT NULL,
    fecha_desembolso DATE NOT NULL,
    estado TEXT DEFAULT 'Activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla de Pagos de Préstamos (Transacciones)
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    numero_cuota INTEGER, -- 0 si es abono extra no programado
    fecha_pago DATE NOT NULL,
    monto_pagado NUMERIC NOT NULL, -- El valor total que pagó el cliente
    interes_cobrado NUMERIC DEFAULT 0, -- Cuánto de ese pago fue a intereses
    capital_abonado NUMERIC DEFAULT 0, -- Cuánto de ese pago fue al capital
    abono_adicional NUMERIC DEFAULT 0, -- Si dio un excedente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Seguridad de Fila)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (Los usuarios solo pueden ver/editar sus propios datos)
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own loans" ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own loans" ON public.loans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own loans" ON public.loans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own loan payments" ON public.loan_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own loan payments" ON public.loan_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own loan payments" ON public.loan_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own loan payments" ON public.loan_payments FOR DELETE USING (auth.uid() = user_id);
