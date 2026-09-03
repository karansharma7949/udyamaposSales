-- ====================================================================
-- 014_notifications.sql
-- In-app notification system for employee target alerts
-- ====================================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'target_assigned',
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}'::JSONB,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index for fast employee notification lookup
CREATE INDEX IF NOT EXISTS idx_notifications_employee_id
    ON public.notifications(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications(employee_id, is_read)
    WHERE is_read = FALSE;

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Employees: can only read their own notifications
DROP POLICY IF EXISTS "Employees can view own notifications" ON public.notifications;
CREATE POLICY "Employees can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = employee_id);

-- 5. Employees: can mark their own as read (UPDATE is_read only)
DROP POLICY IF EXISTS "Employees can update own notifications" ON public.notifications;
CREATE POLICY "Employees can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);

-- 6. Employees: can delete their own notifications
DROP POLICY IF EXISTS "Employees can delete own notifications" ON public.notifications;
CREATE POLICY "Employees can delete own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = employee_id);

-- NOTE: Inserts are done via the server API route using the service role key
-- which bypasses RLS entirely. No INSERT policy is needed on the client side.

-- 7. Enable Realtime replication for live badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
