/**
 * Client-side service for employee notification operations.
 * All requests go through Next.js API routes which enforce auth and RLS.
 */
export const notificationService = {
  /**
   * Fetch all notifications for the current authenticated employee.
   * Returns { data: Notification[], unread_count: number }
   */
  async getNotifications() {
    const res = await fetch('/api/employee/notifications', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch notifications')
    return res.json()
  },

  /**
   * Mark all unread notifications as read.
   */
  async markAllRead() {
    const res = await fetch('/api/employee/notifications', {
      method: 'PATCH',
    })
    if (!res.ok) throw new Error('Failed to mark notifications as read')
    return res.json()
  },

  /**
   * Delete a single notification by ID.
   */
  async deleteNotification(id) {
    const res = await fetch(`/api/employee/notifications/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete notification')
    return res.json()
  },

  /**
   * Create a notification (admin-side, called from targets page).
   * Uses the admin API route which uses service role key.
   */
  async createTargetNotification({ employee_id, employee_name, target_points, month, year }) {
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id, employee_name, target_points, month, year }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to create notification')
    }
    return res.json()
  },
}
