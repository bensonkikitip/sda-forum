'use client'

import { useState } from 'react'
import { Eye, AlertTriangle } from 'lucide-react'

interface Props {
  isBlurred: boolean
  isMod?: boolean
  children: React.ReactNode
}

export function BlurredContent({ isBlurred, isMod, children }: Props) {
  const [revealed, setRevealed] = useState(false)

  if (!isBlurred) return <>{children}</>

  if (isMod && !revealed) {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-60">{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-600">Reported content</span>
          <button
            onClick={() => setRevealed(true)}
            className="text-xs underline text-muted-foreground flex items-center gap-1"
          >
            <Eye className="h-3 w-3" /> Show (mod view)
          </button>
        </div>
      </div>
    )
  }

  if (isMod && revealed) {
    return (
      <div className="border border-amber-300 rounded-md p-2 space-y-2">
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Reported — pending review
        </p>
        {children}
      </div>
    )
  }

  // Regular users see a blurred placeholder
  return (
    <div className="relative rounded-md border bg-muted/30 min-h-[60px] flex items-center justify-center select-none">
      <div className="text-center space-y-1 py-4 px-6">
        <AlertTriangle className="h-5 w-5 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium text-muted-foreground">Content reported</p>
        <p className="text-xs text-muted-foreground">This content is under review.</p>
      </div>
    </div>
  )
}
