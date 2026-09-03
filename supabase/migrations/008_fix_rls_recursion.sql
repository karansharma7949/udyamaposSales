-- ==========================================
-- 008_fix_rls_recursion.sql
-- Fix Infinite Recursion in Profiles RLS
-- ==========================================

-- 1. Helper function with SECURITY DEFINER to check if user is admin
-- SECURITY DEFINER executes with owner privileges, bypassing RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix profiles admin policy
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
CREATE POLICY "Admins have full profile access"
ON public.profiles FOR ALL
USING ( public.is_admin() );

-- 3. Update other policies to use is_admin() for optimal performance
DROP POLICY IF EXISTS "Admins have full product access" ON public.products;
CREATE POLICY "Admins have full product access"
ON public.products FOR ALL
USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admins have full sales access" ON public.sales;
CREATE POLICY "Admins have full sales access"
ON public.sales FOR ALL
USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admins have full target access" ON public.monthly_targets;
CREATE POLICY "Admins have full target access"
ON public.monthly_targets FOR ALL
USING ( public.is_admin() );
