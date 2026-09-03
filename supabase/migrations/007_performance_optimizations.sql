-- ==========================================
-- 007_performance_optimizations.sql
-- Optimization of Employee Performance Queries
-- ==========================================

-- 1. RPC for Employee List with Performance (Avoids N+1 and JS filtering)
CREATE OR REPLACE FUNCTION public.get_employees_with_performance(
    p_page INT,
    p_page_size INT,
    p_search TEXT DEFAULT NULL,
    p_department TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    employee_id UUID,
    full_name TEXT,
    email TEXT,
    employee_code TEXT,
    department TEXT,
    is_active BOOLEAN,
    monthly_sales NUMERIC,
    monthly_target NUMERIC,
    achievement_pct NUMERIC,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    RETURN QUERY
    WITH filtered_profiles AS (
        SELECT p.id, p.full_name, p.email, p.employee_code, p.department, p.is_active
        FROM public.profiles p
        WHERE p.role = 'employee'
          AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.employee_code ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
          AND (p_department IS NULL OR p.department = p_department)
          AND (p_is_active IS NULL OR p.is_active = p_is_active)
    ),
    performance AS (
        SELECT
            fp.id as emp_id,
            COALESCE(SUM(s.total_amount), 0) as m_sales,
            COALESCE(t.target_amount, 0) as m_target
        FROM filtered_profiles fp
        LEFT JOIN public.sales s ON fp.id = s.employee_id
            AND EXTRACT(MONTH FROM s.sale_date) = v_month
            AND EXTRACT(YEAR FROM s.sale_date) = v_year
        LEFT JOIN public.monthly_targets t ON fp.id = t.employee_id
            AND t.month = v_month
            AND t.year = v_year
        GROUP BY fp.id, t.target_amount
    )
    SELECT
        fp.id,
        fp.full_name,
        fp.email,
        fp.employee_code,
        fp.department,
        fp.is_active,
        perf.m_sales,
        perf.m_target,
        CASE WHEN perf.m_target > 0 THEN ROUND((perf.m_sales / perf.m_target) * 100, 2) ELSE 0 END,
        (SELECT count(*) FROM filtered_profiles)::BIGINT
    FROM filtered_profiles fp
    JOIN performance perf ON fp.id = perf.emp_id
    ORDER BY fp.full_name
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$;

-- 2. Index for sales performance queries (critical for scale)
CREATE INDEX IF NOT EXISTS idx_sales_performance_lookup ON public.sales (employee_id, sale_date);
