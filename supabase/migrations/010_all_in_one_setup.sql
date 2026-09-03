-- ==============================================================================
-- 010_all_in_one_setup.sql
-- COMPLETE ALL-IN-ONE SETUP FOR UDYAMAPOS SALES TRACKER
-- Run this SQL in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Helper function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Ensure RLS policies on profiles don't cause recursion
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
CREATE POLICY "Admins have full profile access"
  ON public.profiles
  FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 3. Add Points Columns to Tables
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS points_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (points_per_unit >= 0);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS points_earned NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (points_earned >= 0);

ALTER TABLE public.monthly_targets
ADD COLUMN IF NOT EXISTS target_points NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (target_points >= 0);

-- 4. Trigger to auto-calculate sale points
CREATE OR REPLACE FUNCTION public.handle_sale_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points_per_unit NUMERIC(10, 2);
BEGIN
    SELECT points_per_unit INTO v_points_per_unit
    FROM public.products
    WHERE id = NEW.product_id;

    NEW.points_earned := COALESCE(NEW.quantity * COALESCE(v_points_per_unit, 0), 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_calculate_sale_points ON public.sales;
CREATE TRIGGER trigger_calculate_sale_points
BEFORE INSERT OR UPDATE OF product_id, quantity ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.handle_sale_points();

-- 5. Drop old functions to allow new return types (fixes 42P13 error)
DROP FUNCTION IF EXISTS public.get_leaderboard(INT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_metrics(INT, INT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_metrics(INT, INT) CASCADE;

-- 6. Complete get_leaderboard function (Points + Revenue)
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_month INT, p_year INT)
RETURNS TABLE (
    employee_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    employee_code TEXT,
    total_sales NUMERIC,
    total_units BIGINT,
    total_points NUMERIC,
    target_amount NUMERIC,
    target_points NUMERIC,
    achievement_percentage NUMERIC,
    current_rank BIGINT,
    performance_class TEXT,
    previous_rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_stats AS (
        SELECT
            p.id AS emp_id,
            p.full_name AS f_name,
            p.avatar_url AS a_url,
            p.employee_code AS e_code,
            COALESCE(SUM(s.total_amount), 0) as t_sales,
            COALESCE(SUM(s.quantity), 0) as t_units,
            COALESCE(SUM(s.points_earned), 0) as t_points,
            COALESCE(t.target_amount, 0) as t_amount,
            COALESCE(t.target_points, 0) as t_points_target
        FROM public.profiles p
        LEFT JOIN public.sales s ON p.id = s.employee_id
            AND EXTRACT(MONTH FROM s.sale_date) = p_month
            AND EXTRACT(YEAR FROM s.sale_date) = p_year
        LEFT JOIN public.monthly_targets t ON p.id = t.employee_id
            AND t.month = p_month
            AND t.year = p_year
        WHERE p.role = 'employee'
        GROUP BY p.id, p.full_name, p.avatar_url, p.employee_code, t.target_amount, t.target_points
    ),
    ranked_stats AS (
        SELECT
            *,
            RANK() OVER (
                ORDER BY
                    (CASE WHEN t_points_target > 0 THEN (t_points / t_points_target) ELSE 0 END) DESC,
                    t_points DESC,
                    t_sales DESC
            ) as c_rank,
            PERCENT_RANK() OVER (
                ORDER BY
                    (CASE WHEN t_points_target > 0 THEN (t_points / t_points_target) ELSE 0 END) ASC,
                    t_points ASC,
                    t_sales ASC
            ) as percentile
        FROM monthly_stats
    )
    SELECT
        rs.emp_id,
        rs.f_name,
        rs.a_url,
        rs.e_code,
        rs.t_sales,
        rs.t_units,
        rs.t_points,
        rs.t_amount,
        rs.t_points_target,
        CASE
            WHEN rs.t_points_target > 0 THEN ROUND((rs.t_points / rs.t_points_target) * 100, 2)
            WHEN rs.t_amount > 0 THEN ROUND((rs.t_sales / rs.t_amount) * 100, 2)
            ELSE 0
        END as achievement_pct,
        rs.c_rank,
        CASE
            WHEN rs.percentile >= 0.90 THEN 'Top 10%'
            WHEN rs.percentile >= 0.75 THEN 'Top 25%'
            WHEN rs.percentile >= 0.50 THEN 'Top 50%'
            ELSE 'Below 50%'
        END as p_class,
        (SELECT s.rank FROM public.leaderboard_snapshots s
         WHERE s.employee_id = rs.emp_id
         AND s.snapshot_date < CURRENT_DATE
         ORDER BY s.snapshot_date DESC LIMIT 1) as prev_rank
    FROM ranked_stats rs;
END;
$$;

-- 7. Complete get_admin_metrics function
CREATE OR REPLACE FUNCTION public.get_admin_metrics(p_month INT, p_year INT, p_department TEXT DEFAULT NULL)
RETURNS TABLE (
    total_employees BIGINT,
    active_employees BIGINT,
    total_sales NUMERIC,
    total_target NUMERIC,
    total_points NUMERIC,
    total_target_points NUMERIC,
    achievement_pct NUMERIC,
    total_products BIGINT,
    top_performer_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_sales NUMERIC;
    v_total_target NUMERIC;
    v_total_points NUMERIC;
    v_total_target_points NUMERIC;
    v_top_performer TEXT;
BEGIN
    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(points_earned), 0)
    INTO v_total_sales, v_total_points
    FROM public.sales
    WHERE EXTRACT(MONTH FROM sale_date) = p_month
      AND EXTRACT(YEAR FROM sale_date) = p_year
      AND (p_department IS NULL OR employee_id IN (SELECT id FROM public.profiles WHERE department = p_department));

    SELECT
        COALESCE(SUM(target_amount), 0),
        COALESCE(SUM(target_points), 0)
    INTO v_total_target, v_total_target_points
    FROM public.monthly_targets
    WHERE month = p_month AND year = p_year
      AND (p_department IS NULL OR employee_id IN (SELECT id FROM public.profiles WHERE department = p_department));

    SELECT full_name INTO v_top_performer
    FROM public.get_leaderboard(p_month, p_year)
    ORDER BY achievement_percentage DESC, total_points DESC
    LIMIT 1;

    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.profiles WHERE role = 'employee' AND (p_department IS NULL OR department = p_department))::BIGINT as total_employees,
        (SELECT count(DISTINCT employee_id) FROM public.sales
         WHERE EXTRACT(MONTH FROM sale_date) = p_month AND EXTRACT(YEAR FROM sale_date) = p_year
         AND (p_department IS NULL OR employee_id IN (SELECT id FROM public.profiles WHERE department = p_department)))::BIGINT as active_employees,
        v_total_sales,
        v_total_target,
        v_total_points,
        v_total_target_points,
        CASE
            WHEN v_total_target_points > 0 THEN ROUND((v_total_points / v_total_target_points) * 100, 2)
            WHEN v_total_target > 0 THEN ROUND((v_total_sales / v_total_target) * 100, 2)
            ELSE 0
        END as achievement_pct,
        (SELECT count(*) FROM public.products WHERE is_active = true)::BIGINT as total_products,
        v_top_performer;
END;
$$;
