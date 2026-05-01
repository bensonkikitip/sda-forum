'use client'

import { Calendar, MapPin, Clock, ExternalLink, Download } from 'lucide-react'
import { format, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  startsAt: string              // ISO string
  endsAt: string | null
  location: string | null
  locationUrl: string | null
}

/**
 * Event Card — rendered above a post's body when event_starts_at is set.
 *
 * "Add to calendar" builds an .ics file as a data URI on the fly — no
 * server roundtrip. Works in Apple Calendar, Google Calendar, Outlook.
 */
export function EventCard({ title, startsAt, endsAt, location, locationUrl }: Props) {
  const start = new Date(startsAt)
  const end = endsAt ? new Date(endsAt) : null
  const isPast = start.getTime() < Date.now()

  // Status label: TODAY / TOMORROW / "In X days" / PAST EVENT
  function getStatusLabel() {
    if (isPast) return { text: 'Past event', accent: false }
    if (isToday(start)) return { text: 'Today', accent: true }
    if (isTomorrow(start)) return { text: 'Tomorrow', accent: false }
    const days = differenceInCalendarDays(start, new Date())
    if (days <= 7) return { text: `In ${days} days`, accent: false }
    return { text: 'Upcoming', accent: false }
  }

  const status = getStatusLabel()

  // Pretty-format date + time in the viewer's local timezone.
  const dayName = format(start, 'EEEE')
  const datePretty = format(start, 'MMMM d, yyyy')
  const timePretty = end
    ? `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
    : format(start, 'h:mm a')

  // Build an .ics download link. The format is strict — CRLF line endings
  // and UTC-only timestamps (the "Z" suffix).
  function buildIcsDataUri(): string {
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const escape = (s: string) => s.replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n')

    const dtEnd = end ?? new Date(start.getTime() + 60 * 60 * 1000) // default 1h
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SDA Community//Events//EN',
      'BEGIN:VEVENT',
      `UID:${start.getTime()}-${Math.random().toString(36).slice(2)}@sda-community`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(dtEnd)}`,
      `SUMMARY:${escape(title)}`,
      location ? `LOCATION:${escape(location)}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean)

    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'))
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Header strip */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{
          backgroundColor: status.accent
            ? 'var(--accent)'
            : isPast
            ? 'oklch(0.96 0.005 258)'
            : 'var(--primary)',
        }}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: isPast ? 'var(--muted-foreground)' : 'white' }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: isPast ? 'var(--muted-foreground)' : 'white' }}
          >
            {status.text}
          </span>
        </div>
        {!isPast && (
          <a
            href={buildIcsDataUri()}
            download={`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`}
            className="flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white transition-colors"
          >
            <Download className="h-3 w-3" />
            Add to calendar
          </a>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3 bg-card">
        {/* Day + date */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{dayName}</p>
          <p className="text-xl font-black text-foreground leading-tight">{datePretty}</p>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary/60" />
          <span className="font-medium">{timePretty}</span>
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
            {locationUrl ? (
              <a
                href={locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                {location}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-foreground">{location}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
