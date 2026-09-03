-- ====================================================================
-- 013_target_history_and_isolation.sql
-- 1. Monthly Target Performance History RPC
-- 2. Performance Indexes for target history & sales lookups
-- 3. Monthly Target Isolation verification
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. PERFORMANCE INDEXES
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_monthly_targets_emp_period 
ON public.monthly_targets(employee_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_sales_emp_date 
ON public.sales(employee_id, sale_date DESC);

-- --------------------------------------------------------------------
-- 2. TARGET HISTORY RPC FUNCTION
-- Returns monthly targets vs actual points earned, units, and completion status
-- for any employee across all active months.
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_employee_monthly_target_history(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_employee_monthly_target_history(p_employee_id UUID)
RETURNS TABLE (
    month INTEGER,
    year INTEGER,
    target_points NUMERIC,
    points_earned NUMERIC,
    units_sold BIGINT,
    achievement_pct NUMERIC,
    is_assigned BOOLEAN,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cur_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    v_cur_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    RETURN QUERY
    WITH periods AS (
        -- Combine all periods where employee had targets, sales, or current month
        SELECT mt.month, mt.year
        FROM public.monthly_targets mt
        WHERE mt.employee_id = p_employee_id
        UNION
        SELECT EXTRACT(MONTH FROM s.sale_date)::INTEGER, EXTRACT(YEAR FROM s.sale_date)::INTEGER
        FROM public.sales s
        WHERE s.employee_id = p_employee_id
        UNION
        SELECT v_cur_month, v_cur_year
    ),
    monthly_sales AS (
        SELECT
            EXTRACT(MONTH FROM s.sale_date)::INTEGER AS m,
            EXTRACT(YEAR FROM s.sale_date)::INTEGER AS y,
            COALESCE(SUM(s.points_earned), 0)::NUMERIC AS pts,
            COALESCE(SUM(s.quantity), 0)::BIGINT AS units
        FROM public.sales s
        WHERE s.employee_id = p_employee_id
        GROUP BY EXTRACT(YEAR FROM s.sale_date), EXTRACT(MONTH FROM s.sale_date)
    )
    SELECT
        p.month,
        p.year,
        COALESCE(mt.target_points, 0)::NUMERIC AS target_points,
        COALESCE(ms.pts, 0)::NUMERIC AS points_earned,
        COALESCE(ms.units, 0)::BIGINT AS units_sold,
        CASE
            WHEN COALESCE(mt.target_points, 0) > 0 THEN
                ROUND((COALESCE(ms.pts, 0) / mt.target_points) * 100, 0)::NUMERIC
            ELSE 0::NUMERIC
        END AS achievement_pct,
        (COALESCE(mt.target_points, 0) > 0) AS is_assigned,
        CASE
            WHEN COALESCE(mt.target_points, 0) <= 0 THEN 'Not Assigned'
            WHEN COALESCE(ms.pts, 0) > mt.target_points THEN 'Exceeded'
            WHEN COALESCE(ms.pts, 0) = mt.target_points THEN 'Completed'
            WHEN p.year = v_cur_year AND p.month = v_cur_month THEN
                CASE
                    WHEN (COALESCE(ms.pts, 0) / mt.target_points) >= 0.75 THEN 'On Track'
                    WHEN (COALESCE(ms.pts, 0) / mt.target_points) >= 0.25 THEN 'In Progress'
                    ELSE 'Behind'
                END
            WHEN (p.year < v_cur_year) OR (p.year = v_cur_year AND p.month < v_cur_month) THEN 'Missed'
            ELSE 'Pending'
        END AS status
    FROM periods p
    LEFT JOIN public.monthly_targets mt
        ON mt.employee_id = p_employee_id
       AND mt.month = p.month
       AND mt.year = p.year
    LEFT JOIN monthly_sales ms
        ON ms.m = p.month
       AND ms.y = p.year
    ORDER BY p.year DESC, p.month DESC;
END;
$$;
