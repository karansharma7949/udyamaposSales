-- ==========================================
-- 003_rls_policies.sql
-- Row Level Security (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. PROFILES POLICIES
-- ==========================================

-- Employees: Can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Admins: Full access to all profiles
CREATE POLICY "Admins have full profile access"
ON public.profiles FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ==========================================
-- 2. PRODUCTS POLICIES
-- ==========================================

-- Everyone: Can view products
CREATE POLICY "Anyone can view products"
ON public.products FOR SELECT
USING (true);

-- Admins: Full access to products
CREATE POLICY "Admins have full product access"
ON public.products FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ==========================================
-- 3. SALES POLICIES
-- ==========================================

-- Employees: Can view and manage their own sales
CREATE POLICY "Employees can manage own sales"
ON public.sales FOR ALL
USING (auth.uid() = employee_id)
WITH CHECK (auth.uid() = employee_id);

-- Admins: Full access to all sales
CREATE POLICY "Admins have full sales access"
ON public.sales FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- ==========================================
-- 4. TARGETS POLICIES
-- ==========================================

-- Employees: Can only view their own targets
CREATE POLICY "Employees can view own targets"
ON public.monthly_targets FOR SELECT
USING (auth.uid() = employee_id);

-- Admins: Full access to monthly targets
CREATE POLICY "Admins have full target access"
ON public.monthly_targets FOR ALL
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
