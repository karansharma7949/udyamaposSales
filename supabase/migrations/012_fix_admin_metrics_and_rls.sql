-- ====================================================================
-- 012_fix_admin_metrics_and_rls.sql
-- 1. Fix Infinite Recursion in Profiles RLS policies
-- 2. Update get_admin_metrics() function:
--    - Add total_units, top_performer_code, top_performer_avatar_url, top_performer_points
--    - Fix top_performer order by rank (removes broken achievement_percentage reference)
--    - Fix department filter matching ('all', empty string, or NULL)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. FIX PROFILES RLS RECURSION
-- --------------------------------------------------------------------

-- Ensure is_admin() runs as SECURITY DEFINER with search_path = public
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop all old/redundant policies on profiles that cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- Allow all authenticated users to read profiles (needed for leaderboards, sales, employee list)
-- Uses USING (true) so there is ZERO subquery and ZERO infinite recursion risk
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to manage all profiles
CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- --------------------------------------------------------------------
-- 2. UPDATE get_admin_metrics FUNCTION
-- --------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_admin_metrics(INT, INT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_metrics(INT, INT) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_metrics(p_month INT, p_year INT, p_department TEXT DEFAULT NULL)
RETURNS TABLE (
    total_employees BIGINT,
    active_employees BIGINT,
    total_sales NUMERIC,
    total_target NUMERIC,
    total_points NUMERIC,
    total_target_points NUMERIC,
    total_units BIGINT,
    achievement_pct NUMERIC,
    total_products BIGINT,
    top_performer_name TEXT,
    top_performer_code TEXT,
    top_performer_avatar_url TEXT,
    top_performer_points NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_sales NUMERIC := 0;
    v_total_units BIGINT := 0;
    v_total_points NUMERIC := 0;
    v_total_target NUMERIC := 0;
    v_total_target_points NUMERIC := 0;
    v_top_name TEXT := 'N/A';
    v_top_code TEXT := '';
    v_top_avatar TEXT := '';
    v_top_pts NUMERIC := 0;
    v_dept_filter TEXT := NULL;
BEGIN
    -- Normalize department filter
    IF p_department IS NOT NULL AND p_department <> 'all' AND trim(p_department) <> '' THEN
        v_dept_filter := lower(trim(p_department));
    END IF;

    -- 1. Aggregates from sales
    SELECT
        COALESCE(SUM(s.total_amount), 0),
        COALESCE(SUM(s.quantity), 0),
        COALESCE(SUM(s.points_earned), 0)
    INTO v_total_sales, v_total_units, v_total_points
    FROM public.sales s
    WHERE EXTRACT(MONTH FROM s.sale_date) = p_month
      AND EXTRACT(YEAR FROM s.sale_date) = p_year
      AND (v_dept_filter IS NULL OR s.employee_id IN (
          SELECT p.id FROM public.profiles p WHERE lower(p.department) = v_dept_filter
      ));

    -- 2. Aggregates from monthly targets
    SELECT
        COALESCE(SUM(mt.target_amount), 0),
        COALESCE(SUM(mt.target_points), 0)
    INTO v_total_target, v_total_target_points
    FROM public.monthly_targets mt
    WHERE mt.month = p_month AND mt.year = p_year
      AND (v_dept_filter IS NULL OR mt.employee_id IN (
          SELECT p.id FROM public.profiles p WHERE lower(p.department) = v_dept_filter
      ));

    -- 3. Top performer from get_leaderboard
    SELECT
        COALESCE(lb.full_name, 'N/A'),
        COALESCE(lb.employee_code, ''),
        COALESCE(lb.avatar_url, ''),
        COALESCE(lb.total_points, 0)
    INTO v_top_name, v_top_code, v_top_avatar, v_top_pts
    FROM public.get_leaderboard(p_month, p_year) lb
    WHERE (v_dept_filter IS NULL OR lower(lb.department) = v_dept_filter)
    ORDER BY lb.current_rank ASC, lb.total_points DESC
    LIMIT 1;

    -- 4. Return results
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.profiles pr
         WHERE pr.role = 'employee'
           AND (v_dept_filter IS NULL OR lower(pr.department) = v_dept_filter))::BIGINT AS total_employees,
        (SELECT count(DISTINCT sl.employee_id) FROM public.sales sl
         WHERE EXTRACT(MONTH FROM sl.sale_date) = p_month
           AND EXTRACT(YEAR FROM sl.sale_date) = p_year
           AND (v_dept_filter IS NULL OR sl.employee_id IN (
               SELECT pr.id FROM public.profiles pr WHERE lower(pr.department) = v_dept_filter
           )))::BIGINT AS active_employees,
        v_total_sales,
        v_total_target,
        v_total_points,
        v_total_target_points,
        v_total_units,
        CASE
            WHEN v_total_target_points > 0 THEN ROUND((v_total_points / v_total_target_points) * 100, 0)::NUMERIC
            WHEN v_total_target > 0 THEN ROUND((v_total_sales / v_total_target) * 100, 0)::NUMERIC
            ELSE 0::NUMERIC
        END AS achievement_pct,
        (SELECT count(*) FROM public.products pd WHERE pd.is_active = true)::BIGINT AS total_products,
        v_top_name AS top_performer_name,
        v_top_code AS top_performer_code,
        v_top_avatar AS top_performer_avatar_url,
        v_top_pts AS top_performer_points;
END;
$$;
