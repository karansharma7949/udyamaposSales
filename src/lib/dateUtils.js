/**
 * dateUtils.js — Timezone-safe date utilities for UdyamaPOS Sales Tracker
 *
 * CRITICAL: Never use `date.toISOString().split('T')[0]` to get a "local date string".
 * toISOString() always returns UTC, which is 5h30m BEHIND IST. This causes:
 *   - A sale logged on Sept 2 at 10 PM IST (= Sept 2 16:30 UTC) to appear as "Sept 2" in UTC
 *   - But a grid cell labeled "Sept 2" uses midnight IST = Sept 1 18:30 UTC → key "Sept 1"
 *   - Result: the sale appears on the wrong day in the heatmap / dashboard
 *
 * Solution: Always use getFullYear(), getMonth(), getDate() (local fields) to build date strings.
 */

/**
 * Convert any Date object (or timestamp string) to a local 'YYYY-MM-DD' string.
 * Uses local timezone fields — correct for IST and any other timezone.
 *
 * @param {Date|string} date - A Date object or ISO timestamp string from Supabase
 * @returns {string} e.g. "2026-09-02"
 */
export function toLocalDateStr(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Get today's local date string in 'YYYY-MM-DD' format.
 * @returns {string} e.g. "2026-09-02"
 */
export function getTodayLocalStr() {
  return toLocalDateStr(new Date())
}

/**
 * Check if a Supabase UTC timestamp falls on today in the local timezone.
 * @param {string} utcTimestamp - e.g. "2026-09-02T16:50:00+00:00"
 * @returns {boolean}
 */
export function isToday(utcTimestamp) {
  if (!utcTimestamp) return false
  return toLocalDateStr(new Date(utcTimestamp)) === getTodayLocalStr()
}

/**
 * Get the local month number (1-12) of a UTC timestamp.
 * @param {string} utcTimestamp
 * @returns {number} 1-12
 */
export function getLocalMonth(utcTimestamp) {
  return new Date(utcTimestamp).getMonth() + 1
}

/**
 * Get the local year of a UTC timestamp.
 * @param {string} utcTimestamp
 * @returns {number}
 */
export function getLocalYear(utcTimestamp) {
  return new Date(utcTimestamp).getFullYear()
}

/**
 * Format a UTC timestamp as a human-readable local date + time string.
 * @param {string} utcTimestamp
 * @param {{ dateStyle?: string, timeStyle?: string }} opts
 * @returns {string}
 */
export function formatLocalDateTime(utcTimestamp, opts = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (!utcTimestamp) return '—'
  return new Date(utcTimestamp).toLocaleString(undefined, opts)
}

/**
 * Format a UTC timestamp as a human-readable local date string only.
 * @param {string} utcTimestamp
 * @returns {string}
 */
export function formatLocalDate(utcTimestamp) {
  if (!utcTimestamp) return '—'
  return new Date(utcTimestamp).toLocaleDateString()
}
