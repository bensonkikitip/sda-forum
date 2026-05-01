'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function ChurchSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (value.trim()) params.set('q', value.trim())
      router.push(`/admin/churches${value.trim() ? `?${params}` : ''}`)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, router])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Search churches…"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
