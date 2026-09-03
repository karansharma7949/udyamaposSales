-- ==========================================
-- 006_employee_management.sql
-- Employee Management Updates
-- ==========================================

-- Add is_active to profiles to support activation/deactivation
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update RLS policies to allow admins to manage profiles
-- Assuming admins already have access, but ensuring they can update is_active
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
