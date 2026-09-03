-- ==========================================
-- 011_points_system_final.sql
-- Pure Points-Centric Performance Tracker Schema & Triggers
-- ==========================================

-- 1. Ensure points_per_unit on products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS points_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (points_per_unit >= 0);

-- 2. Ensure points_earned and sold_at_price on sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS points_earned NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (points_earned >= 0);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS sold_at_price NUMERIC(10, 2);

-- 3. Ensure target_points on monthly_targets table
ALTER TABLE public.monthly_targets
ADD COLUMN IF NOT EXISTS target_points NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (target_points >= 0);

-- 4. Ensure avatar_url on profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 5. Trigger to auto-calculate points_earned on sales insert/update
CREATE OR REPLACE FUNCTION public.handle_sale_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points_per_unit NUMERIC(10, 2);
BEGIN
    SELECT points_per_unit INTO v_points_per_unit
    FROM public.products
    WHERE id = NEW.product_id;

    IF v_points_per_unit IS NOT NULL THEN
        NEW.points_earned := COALESCE(NEW.quantity, 1) * v_points_per_unit;
    ELSE
        NEW.points_earned := 0;
    END IF;

    -- If sold_at_price is provided, set total_amount = sold_at_price * quantity
    IF NEW.sold_at_price IS NOT NULL AND NEW.sold_at_price > 0 THEN
        NEW.total_amount := NEW.sold_at_price * COALESCE(NEW.quantity, 1);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_calculate_sale_points ON public.sales;
CREATE TRIGGER trigger_calculate_sale_points
    BEFORE INSERT OR UPDATE OF product_id, quantity, sold_at_price ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_sale_points();

-- 6. RPC Function for Points-Only Leaderboard
DROP FUNCTION IF EXISTS public.get_leaderboard(INTEGER, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_month INTEGER, p_year INTEGER)
RETURNS TABLE (
    employee_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    employee_code TEXT,
    department TEXT,
    total_points NUMERIC,
    total_units BIGINT,
    target_points NUMERIC,
    points_remaining NUMERIC,
    current_rank BIGINT,
    previous_rank BIGINT
) AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_days_in_month INTEGER;
BEGIN
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month - 1 day'));
    v_start_date := MAKE_TIMESTAMPTZ(p_year, p_month, 1, 0, 0, 0, 'UTC');
    v_end_date := MAKE_TIMESTAMPTZ(p_year, p_month, v_days_in_month, 23, 59, 59, 'UTC');

    RETURN QUERY
    WITH emp_points AS (
        SELECT
            p.id AS emp_id,
            p.full_name AS emp_name,
            p.avatar_url AS emp_avatar,
            p.employee_code AS emp_code,
            p.department AS emp_dept,
            COALESCE(SUM(s.points_earned), 0)::NUMERIC AS sum_points,
            COALESCE(SUM(s.quantity), 0)::BIGINT AS sum_units,
            COALESCE(t.target_points, 0)::NUMERIC AS t_points
        FROM public.profiles p
        LEFT JOIN public.sales s ON s.employee_id = p.id
            AND s.sale_date >= v_start_date
            AND s.sale_date <= v_end_date
        LEFT JOIN public.monthly_targets t ON t.employee_id = p.id
            AND t.month = p_month
            AND t.year = p_year
        WHERE p.role = 'employee'
        GROUP BY p.id, p.full_name, p.avatar_url, p.employee_code, p.department, t.target_points
    ),
    ranked AS (
        SELECT
            ep.emp_id,
            ep.emp_name,
            ep.emp_avatar,
            ep.emp_code,
            ep.emp_dept,
            ep.sum_points,
            ep.sum_units,
            ep.t_points,
            GREATEST(0, ep.t_points - ep.sum_points)::NUMERIC AS rem_points,
            DENSE_RANK() OVER (ORDER BY ep.sum_points DESC) AS rnk
        FROM emp_points ep
    )
    SELECT
        r.emp_id,
        r.emp_name,
        r.emp_avatar,
        r.emp_code,
        r.emp_dept,
        r.sum_points,
        r.sum_units,
        r.t_points,
        r.rem_points,
        r.rnk,
        r.rnk AS prev_rnk
    FROM ranked r
    ORDER BY r.rnk ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
