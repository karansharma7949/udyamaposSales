-- ==========================================
-- 004_leaderboard_logic.sql
-- Analytics, Views, and Leaderboard
-- ==========================================

-- Cleanup old view if it exists from previous failed runs
DROP VIEW IF EXISTS public.v_leaderboard_current;

-- 1. Leaderboard Snapshots Table
-- Used to track rank history for "Previous Rank" calculation
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    rank INTEGER NOT NULL,
    total_sales NUMERIC(12, 2) NOT NULL,
    total_units INTEGER NOT NULL,
    target_achievement_pct NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON public.leaderboard_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_employee ON public.leaderboard_snapshots(employee_id);

-- 2. Leaderboard Logic via Security Definer Function
-- We use a function instead of a view because views are subject to RLS.
-- SECURITY DEFINER allows this function to bypass RLS to calculate aggregates across all users.

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_month INT, p_year INT)
RETURNS TABLE (
    employee_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    employee_code TEXT,
    total_sales NUMERIC,
    total_units BIGINT,
    target_amount NUMERIC,
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
            COALESCE(t.target_amount, 0) as t_amount
        FROM public.profiles p
        LEFT JOIN public.sales s ON p.id = s.employee_id
            AND EXTRACT(MONTH FROM s.sale_date) = p_month
            AND EXTRACT(YEAR FROM s.sale_date) = p_year
        LEFT JOIN public.monthly_targets t ON p.id = t.employee_id
            AND t.month = p_month
            AND t.year = p_year
        WHERE p.role = 'employee'
        GROUP BY p.id, p.full_name, p.avatar_url, p.employee_code, t.target_amount
    ),
    ranked_stats AS (
        SELECT
            *,
            RANK() OVER (
                ORDER BY
                    (CASE WHEN t_amount > 0 THEN (t_sales / t_amount) ELSE 0 END) DESC,
                    t_sales DESC,
                    t_units DESC
            ) as c_rank,
            PERCENT_RANK() OVER (
                ORDER BY
                    (CASE WHEN t_amount > 0 THEN (t_sales / t_amount) ELSE 0 END) ASC,
                    t_sales ASC,
                    t_units ASC
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
        rs.t_amount,
        CASE
            WHEN rs.t_amount > 0 THEN ROUND((rs.t_sales / rs.t_amount) * 100, 2)
            ELSE 0
        END as achievement_pct,
        rs.c_rank,
        CASE
            WHEN rs.percentile >= 0.99 THEN 'Top 1%'
            WHEN rs.percentile >= 0.95 THEN 'Top 5%'
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

-- 3. RPC function to capture monthly snapshot
CREATE OR REPLACE FUNCTION public.capture_monthly_leaderboard_snapshot()
RETURNS void AS $$
BEGIN
    INSERT INTO public.leaderboard_snapshots (employee_id, snapshot_date, rank, total_sales, total_units, target_achievement_pct)
    SELECT
        employee_id,
        CURRENT_DATE,
        current_rank,
        total_sales,
        total_units,
        achievement_percentage
    FROM public.get_leaderboard(
        EXTRACT(MONTH FROM CURRENT_DATE)::INT,
        EXTRACT(YEAR FROM CURRENT_DATE)::INT
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
