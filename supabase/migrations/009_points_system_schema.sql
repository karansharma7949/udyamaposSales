-- Corrected Leaderboard Function
DROP FUNCTION IF EXISTS public.get_leaderboard(INT, INT) CASCADE;
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
            p.full_name::TEXT AS f_name,
            p.avatar_url::TEXT AS a_url,
            p.employee_code::TEXT AS e_code,
            COALESCE(SUM(s.total_amount), 0)::NUMERIC as t_sales,
            COALESCE(SUM(s.quantity), 0)::BIGINT as t_units,
            COALESCE(SUM(s.points_earned), 0)::NUMERIC as t_points,
            COALESCE(t.target_amount, 0)::NUMERIC as t_amount,
            COALESCE(t.target_points, 0)::NUMERIC as t_points_target
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
            ms.emp_id,
            ms.f_name,
            ms.a_url,
            ms.e_code,
            ms.t_sales,
            ms.t_units,
            ms.t_points,
            ms.t_amount,
            ms.t_points_target,
            RANK() OVER (
                ORDER BY
                    (CASE WHEN ms.t_points_target > 0 THEN (ms.t_points / ms.t_points_target) ELSE 0 END) DESC,
                    ms.t_points DESC,
                    ms.t_sales DESC
            )::BIGINT as c_rank,
            PERCENT_RANK() OVER (
                ORDER BY
                    (CASE WHEN ms.t_points_target > 0 THEN (ms.t_points / ms.t_points_target) ELSE 0 END) ASC,
                    ms.t_points ASC,
                    ms.t_sales ASC
            ) as percentile
        FROM monthly_stats ms
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
            WHEN rs.t_points_target > 0 THEN ROUND((rs.t_points / rs.t_points_target) * 100, 2)::NUMERIC
            WHEN rs.t_amount > 0 THEN ROUND((rs.t_sales / rs.t_amount) * 100, 2)::NUMERIC
            ELSE 0::NUMERIC
        END as achievement_percentage,
        rs.c_rank,
        CASE
            WHEN rs.percentile >= 0.90 THEN 'Top 10%'::TEXT
            WHEN rs.percentile >= 0.75 THEN 'Top 25%'::TEXT
            WHEN rs.percentile >= 0.50 THEN 'Top 50%'::TEXT
            ELSE 'Below 50%'::TEXT
        END as performance_class,
        (SELECT s.rank::BIGINT FROM public.leaderboard_snapshots s
         WHERE s.employee_id = rs.emp_id
         AND s.snapshot_date < CURRENT_DATE
         ORDER BY s.snapshot_date DESC LIMIT 1) as previous_rank
    FROM ranked_stats rs;
END;
$$;

-- Corrected Admin Metrics Function
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
        COALESCE(SUM(s.total_amount), 0),
        COALESCE(SUM(s.points_earned), 0)
    INTO v_total_sales, v_total_points
    FROM public.sales s
    WHERE EXTRACT(MONTH FROM s.sale_date) = p_month
      AND EXTRACT(YEAR FROM s.sale_date) = p_year
      AND (p_department IS NULL OR s.employee_id IN (SELECT p.id FROM public.profiles p WHERE p.department = p_department));

    SELECT
        COALESCE(SUM(mt.target_amount), 0),
        COALESCE(SUM(mt.target_points), 0)
    INTO v_total_target, v_total_target_points
    FROM public.monthly_targets mt
    WHERE mt.month = p_month AND mt.year = p_year
      AND (p_department IS NULL OR mt.employee_id IN (SELECT p.id FROM public.profiles p WHERE p.department = p_department));

    SELECT lb.full_name INTO v_top_performer
    FROM public.get_leaderboard(p_month, p_year) lb
    ORDER BY lb.achievement_percentage DESC, lb.total_points DESC
    LIMIT 1;

    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.profiles pr WHERE pr.role = 'employee' AND (p_department IS NULL OR pr.department = p_department))::BIGINT as total_employees,
        (SELECT count(DISTINCT sl.employee_id) FROM public.sales sl
         WHERE EXTRACT(MONTH FROM sl.sale_date) = p_month AND EXTRACT(YEAR FROM sl.sale_date) = p_year
         AND (p_department IS NULL OR sl.employee_id IN (SELECT pr.id FROM public.profiles pr WHERE pr.department = p_department)))::BIGINT as active_employees,
        v_total_sales,
        v_total_target,
        v_total_points,
        v_total_target_points,
        CASE
            WHEN v_total_target_points > 0 THEN ROUND((v_total_points / v_total_target_points) * 100, 2)::NUMERIC
            WHEN v_total_target > 0 THEN ROUND((v_total_sales / v_total_target) * 100, 2)::NUMERIC
            ELSE 0::NUMERIC
        END as achievement_pct,
        (SELECT count(*) FROM public.products pd WHERE pd.is_active = true)::BIGINT as total_products,
        COALESCE(v_top_performer, 'N/A'::TEXT) as top_performer_name;
END;
$$;
