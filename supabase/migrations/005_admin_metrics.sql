-- ==========================================
-- 005_admin_metrics.sql
-- Admin Dashboard Aggregates
-- ==========================================

-- 1. High-level Company Metrics
CREATE OR REPLACE FUNCTION public.get_admin_metrics(p_month INT, p_year INT, p_department TEXT DEFAULT NULL)
RETURNS TABLE (
    total_employees BIGINT,
    active_employees BIGINT,
    total_sales NUMERIC,
    total_target NUMERIC,
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
    v_top_performer TEXT;
BEGIN
    -- Total Sales
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_sales
    FROM public.sales
    WHERE EXTRACT(MONTH FROM sale_date) = p_month
      AND EXTRACT(YEAR FROM sale_date) = p_year
      AND (p_department IS NULL OR employee_id IN (SELECT id FROM public.profiles WHERE department = p_department));

    -- Total Target
    SELECT COALESCE(SUM(target_amount), 0) INTO v_total_target
    FROM public.monthly_targets
    WHERE month = p_month AND year = p_year
      AND (p_department IS NULL OR employee_id IN (SELECT id FROM public.profiles WHERE department = p_department));

    -- Top Performer (by achievement %)
    SELECT full_name INTO v_top_performer
    FROM public.get_leaderboard(p_month, p_year)
    ORDER BY achievement_percentage DESC, total_sales DESC
    LIMIT 1;

    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.profiles WHERE role = 'employee' AND (p_department IS NULL OR department = p_department))::BIGINT as total_employees,
        (SELECT count(DISTINCT employee_id) FROM public.sales
         WHERE EXTRACT(MONTH FROM sale_date) = p_month AND EXTRACT(YEAR FROM sale_date) = p_year
         AND (p_department IS NULL OR employee_id IN (SELECT id FROM public.profiles WHERE department = p_department)))::BIGINT as active_employees,
        v_total_sales,
        v_total_target,
        CASE WHEN v_total_target > 0 THEN ROUND((v_total_sales / v_total_target) * 100, 2) ELSE 0 END as achievement_pct,
        (SELECT count(*) FROM public.products WHERE is_active = true)::BIGINT as total_products,
        v_top_performer;
END;
$$;

-- 2. Sales Trend (Daily)
CREATE OR REPLACE FUNCTION public.get_sales_trend(p_month INT, p_year INT)
RETURNS TABLE (
    day INT,
    daily_sales NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(DAY FROM sale_date)::INT as day,
        SUM(total_amount) as daily_sales
    FROM public.sales
    WHERE EXTRACT(MONTH FROM sale_date) = p_month
      AND EXTRACT(YEAR FROM sale_date) = p_year
    GROUP BY day
    ORDER BY day;
END;
$$;

-- 3. Sales by Product
CREATE OR REPLACE FUNCTION public.get_sales_by_product(p_month INT, p_year INT)
RETURNS TABLE (
    product_name TEXT,
    total_sales NUMERIC,
    total_units BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.product_name,
        SUM(s.total_amount) as total_sales,
        SUM(s.quantity)::BIGINT as total_units
    FROM public.sales s
    JOIN public.products p ON s.product_id = p.id
    WHERE EXTRACT(MONTH FROM s.sale_date) = p_month
      AND EXTRACT(YEAR FROM s.sale_date) = p_year
    GROUP BY p.product_name
    ORDER BY total_sales DESC;
END;
$$;

-- 4. Target vs Actual (Last 6 Months)
CREATE OR REPLACE FUNCTION public.get_target_vs_actual(p_year INT)
RETURNS TABLE (
    month TEXT,
    actual_sales NUMERIC,
    target_sales NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT
            EXTRACT(MONTH FROM s.sale_date) as m,
            SUM(s.total_amount) as actual
        FROM public.sales s
        WHERE EXTRACT(YEAR FROM s.sale_date) = p_year
        GROUP BY m
    ),
    target_data AS (
        SELECT
            month as m,
            SUM(target_amount) as target
        FROM public.monthly_targets
        WHERE year = p_year
        GROUP BY m
    )
    SELECT
        to_char(to_date(m::text, 'MM'), 'Month'),
        COALESCE(md.actual, 0),
        COALESCE(td.target, 0)
    FROM generate_series(1, 12) m
    LEFT JOIN monthly_data md ON m = md.m
    LEFT JOIN target_data td ON m = td.m
    ORDER BY m;
END;
$$;
