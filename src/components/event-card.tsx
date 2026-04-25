'use client'

import { Calendar, MapPin, Clock, ExternalLink, Download } from 'lucide-react'
import { format } from 'date-fns'

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

  // Pretty-format date + time in the viewer's local timezone.
  const datePretty = format(start, 'EEEE, MMMM d, yyyy')
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
    <div
      className={`rounded-lg border-l-4 p-4 space-y-2 ${
        isPast
          ? 'border-muted-foreground/30 bg-muted/30'
          : 'border-primary bg-primary/5'
      }`}
    >
      <div className="flex items-center gap-2">
        <Calendar className={`h-4 w-4 shrink-0 ${isPast ? 'text-muted-foreground' : 'text-primary'}`} />
        <p className={`text-xs font-semibold uppercase tracking-wider ${isPast ? 'text-muted-foreground' : 'text-primary'}`}>
          {isPast ? 'Past event' : 'Upcoming event'}
        </p>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <span className="font-medium">{datePretty}</span>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <span>{timePretty}</span>
        </div>
        {location && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            {locationUrl ? (
              <a
                href={locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline inline-flex items-center gap-1"
              >
                {location}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span>{location}</span>
            )}
          </div>
        )}
      </div>

      {!isPast && (
        <div className="pt-1">
          <a
            href={buildIcsDataUri()}
            download={`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Download className="h-3 w-3" />
            Add to calendar
          </a>
        </div>
      )}
    </div>
  )
}
