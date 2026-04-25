import { startOfWeek, addDays, format } from 'date-fns'

/**
 * Returns the UTC instant that corresponds to midnight on the current calendar
 * day in Pacific time (America/Los_Angeles), automatically accounting for
 * whether PDT (UTC-7) or PST (UTC-8) is in effect.
 *
 * An event whose event_starts_at is on or after this instant is considered
 * "active" (still today or future); one before it is "past".
 */
export function startOfTodayPacific(now: Date = new Date()): Date {

  // Today's date string in Pacific time, e.g. "2026-04-24"
  const todayPT = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(now)

  const [y, m, d] = todayPT.split('-').map(Number)

  // Pacific is UTC-7 (PDT) or UTC-8 (PST).
  // Try both candidate UTC hours (7 and 8) and use the one where
  // the Pacific clock reads 00:00.
  for (const utcH of [7, 8]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, utcH, 0, 0, 0))
    const ptHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(candidate)
    )
    if (ptHour === 0) return candidate
  }

  // Fallback: PST (should never be reached for Pacific time)
  return new Date(Date.UTC(y, m - 1, d, 8, 0, 0, 0))
}

/**
 * Groups an array of objects that have an `event_starts_at` ISO string into
 * weekly buckets labelled "Mon d – Mon d, yyyy" (e.g. "Apr 21 – Apr 27, 2026").
 * Weeks start on Monday.
 */
export function groupEventsByWeek<T extends { event_starts_at: string }>(
  events: T[],
): { label: string; items: T[] }[] {
  const buckets: Map<string, T[]> = new Map()
  for (const event of events) {
    const date   = new Date(event.event_starts_at)
    const monday = startOfWeek(date, { weekStartsOn: 1 })
    const sunday = addDays(monday, 6)
    const key    = `${format(monday, 'MMM d')} – ${format(sunday, 'MMM d, yyyy')}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(event)
  }
  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }))
}
