-- ==============================================================================
-- NERKLEY MARKETPLACE: SISTEMA MULTI-VENDEDOR, BILLETERAS Y RETENCIÓN DE FONDOS
-- Ejecuta este script en el Editor SQL de tu panel de Supabase (SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. TABLA DE VENDEDORES (SELLERS)
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    store_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_name TEXT NOT NULL,
    owner_document TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    city TEXT NOT NULL,
    department TEXT NOT NULL,
    category TEXT DEFAULT 'Variado',
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT DEFAULT 'Ahorros',
    commission_rate NUMERIC(5, 2) DEFAULT 12.00, -- Comisión porcentual que se queda NERKLEY (%)
    status TEXT DEFAULT 'pending',               -- 'pending' (por revisar), 'verified' (activo), 'paused', 'rejected'
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_sales_count INTEGER DEFAULT 0,
    logo_url TEXT,
    banner_url TEXT,
    bio TEXT
);

-- 2. TABLA DE BILLETERAS DE VENDEDORES (ESCROW / RETENCIÓN DE FONDOS)
CREATE TABLE IF NOT EXISTS public.seller_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    balance_pending NUMERIC(12, 2) DEFAULT 0.00,   -- Saldo bloqueado en garantía (en camino)
    balance_available NUMERIC(12, 2) DEFAULT 0.00, -- Saldo desbloqueado listo para retirar
    balance_withdrawn NUMERIC(12, 2) DEFAULT 0.00, -- Saldo total histórico transferido
    total_earned NUMERIC(12, 2) DEFAULT 0.00,      -- Ganancias netas totales del vendedor
    total_commission_paid NUMERIC(12, 2) DEFAULT 0.00, -- Comisión total ganada por NERKLEY
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE SOLICITUDES DE RETIRO (PAYOUT REQUESTS A NEQUI/BANCOLOMBIA)
CREATE TABLE IF NOT EXISTS public.seller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    proof_image_url TEXT,          -- URL del comprobante de transferencia
    notes TEXT,
    paid_at TIMESTAMPTZ
);

-- 4. AGREGAR COLUMNAS DE VENDEDOR A LA TABLA PRODUCTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id') THEN
        ALTER TABLE public.products ADD COLUMN seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_name') THEN
        ALTER TABLE public.products ADD COLUMN seller_name TEXT DEFAULT 'Tienda Oficial NERKLEY';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_official') THEN
        ALTER TABLE public.products ADD COLUMN is_official BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 5. ASIGNAR TODOS LOS PRODUCTOS EXISTENTES COMO TIENDA OFICIAL NERKLEY
UPDATE public.products 
SET is_official = TRUE, seller_name = 'Tienda Oficial NERKLEY' 
WHERE is_official IS NULL OR seller_name IS NULL;

-- 6. POLÍTICAS RLS PARA LECTURA Y OPERACIONES
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de vendedores" ON public.sellers;
CREATE POLICY "Lectura de vendedores" ON public.sellers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Registro de vendedores" ON public.sellers;
CREATE POLICY "Registro de vendedores" ON public.sellers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Modificación de vendedores" ON public.sellers;
CREATE POLICY "Modificación de vendedores" ON public.sellers FOR ALL USING (true);

DROP POLICY IF EXISTS "Operaciones en billeteras" ON public.seller_wallets;
CREATE POLICY "Operaciones en billeteras" ON public.seller_wallets FOR ALL USING (true);

DROP POLICY IF EXISTS "Operaciones de retiros" ON public.seller_payouts;
CREATE POLICY "Operaciones de retiros" ON public.seller_payouts FOR ALL USING (true);
