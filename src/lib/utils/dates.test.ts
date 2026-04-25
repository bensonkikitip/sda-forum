import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { startOfTodayPacific, groupEventsByWeek } from './dates'

// ── startOfTodayPacific ────────────────────────────────────────────────────

describe('startOfTodayPacific', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns midnight Pacific time during PDT (UTC-7)', () => {
    // April 24, 2026 is in PDT — midnight Pacific = 07:00 UTC
    vi.setSystemTime(new Date('2026-04-24T15:00:00Z')) // any time that day
    const result = startOfTodayPacific()
    expect(result.toISOString()).toBe('2026-04-24T07:00:00.000Z')
  })

  it('returns midnight Pacific time during PST (UTC-8)', () => {
    // January 15, 2026 is in PST — midnight Pacific = 08:00 UTC
    vi.setSystemTime(new Date('2026-01-15T15:00:00Z'))
    const result = startOfTodayPacific()
    expect(result.toISOString()).toBe('2026-01-15T08:00:00.000Z')
  })

  it('returns a Date whose Pacific-time hour is 0', () => {
    // Verify the returned instant actually reads as midnight in Pacific time
    vi.setSystemTime(new Date('2026-06-10T20:00:00Z'))
    const result = startOfTodayPacific()
    const ptHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false,
      }).format(result)
    )
    expect(ptHour).toBe(0)
  })

  it('handles the spring-forward DST transition day correctly (Mar 8, 2026)', () => {
    // On DST transition day clocks spring forward at 2am — midnight is still valid
    vi.setSystemTime(new Date('2026-03-08T18:00:00Z'))
    const result = startOfTodayPacific()
    const ptHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false,
      }).format(result)
    )
    expect(ptHour).toBe(0)
  })

  it('handles the fall-back DST transition day correctly (Nov 1, 2026)', () => {
    // On this day clocks fall back — midnight is still valid
    vi.setSystemTime(new Date('2026-11-01T18:00:00Z'))
    const result = startOfTodayPacific()
    const ptHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false,
      }).format(result)
    )
    expect(ptHour).toBe(0)
  })
})

// ── groupEventsByWeek ──────────────────────────────────────────────────────

describe('groupEventsByWeek', () => {
  it('returns empty array for empty input', () => {
    expect(groupEventsByWeek([])).toEqual([])
  })

  it('puts two events on the same week into one bucket', () => {
    const events = [
      { event_starts_at: '2026-04-21T10:00:00Z' }, // Tuesday Apr 21
      { event_starts_at: '2026-04-23T14:00:00Z' }, // Thursday Apr 23
    ]
    const result = groupEventsByWeek(events)
    expect(result).toHaveLength(1)
    expect(result[0].items).toHaveLength(2)
  })

  it('splits events in different weeks into separate buckets', () => {
    const events = [
      { event_starts_at: '2026-04-21T10:00:00Z' }, // week of Apr 20
      { event_starts_at: '2026-04-28T10:00:00Z' }, // week of Apr 27
      { event_starts_at: '2026-05-05T10:00:00Z' }, // week of May 4
    ]
    const result = groupEventsByWeek(events)
    expect(result).toHaveLength(3)
  })

  it('preserves the original order within a bucket', () => {
    const events = [
      { event_starts_at: '2026-04-21T08:00:00Z', title: 'First' },
      { event_starts_at: '2026-04-22T09:00:00Z', title: 'Second' },
    ]
    const result = groupEventsByWeek(events)
    expect(result[0].items[0].title).toBe('First')
    expect(result[0].items[1].title).toBe('Second')
  })

  it('produces bucket labels in "Mon d – Mon d, yyyy" format', () => {
    const events = [{ event_starts_at: '2026-03-11T10:00:00Z' }] // Wednesday Mar 11
    const result = groupEventsByWeek(events)
    // Week containing Mar 11: Mon Mar 9 – Sun Mar 15, 2026
    expect(result[0].label).toBe('Mar 9 – Mar 15, 2026')
  })

  it('buckets start on Monday, not Sunday', () => {
    // Sunday Apr 19 and Monday Apr 20 are in different weeks (weeks start Mon)
    const events = [
      { event_starts_at: '2026-04-19T10:00:00Z' }, // Sunday
      { event_starts_at: '2026-04-20T10:00:00Z' }, // Monday — new week
    ]
    const result = groupEventsByWeek(events)
    expect(result).toHaveLength(2)
  })
})
