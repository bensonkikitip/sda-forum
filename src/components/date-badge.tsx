import { format } from 'date-fns'

type Props = {
  date: Date
  /** Optional hex color used for the month-strip header. Defaults to primary. */
  color?: string | null
}

/**
 * DateBadge — mini calendar widget for event post cards.
 *
 * Renders a small tile with the month abbreviation on top and the day number
 * large below, similar to an Apple Calendar day icon.
 *
 *   ┌──────┐
 *   │ MAR  │  ← colored header strip
 *   │  18  │  ← large day number
 *   └──────┘
 */
export function DateBadge({ date, color }: Props) {
  const month = format(date, 'MMM').toUpperCase()
  const day = format(date, 'd')
  const headerBg = color ?? 'var(--primary)'

  return (
    <div className="flex flex-col items-center rounded-lg overflow-hidden shrink-0 w-12 shadow-sm border border-border/60">
      <div
        className="w-full text-center py-0.5 text-[9px] font-bold tracking-widest text-white"
        style={{ backgroundColor: headerBg }}
      >
        {month}
      </div>
      <div className="w-full text-center py-1 bg-card">
        <span className="text-xl font-black leading-none text-foreground">{day}</span>
      </div>
    </div>
  )
}
