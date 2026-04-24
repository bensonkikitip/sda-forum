'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { SignOutButton } from '@/components/sign-out-button'
import { toast } from 'sonner'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [dmOptIn, setDmOptIn] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('dm_opt_in')
        .eq('id', user.id)
        .maybeSingle()
      setDmOptIn(data?.dm_opt_in ?? true)
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleDmToggle(checked: boolean) {
    setDmOptIn(checked)
    if (!userId) return
    const { error } = await supabase
      .from('profiles')
      .update({ dm_opt_in: checked })
      .eq('id', userId)
    if (error) {
      toast.error(error.message)
      setDmOptIn(!checked)
    } else {
      toast.success(checked ? 'Direct messages enabled' : 'Direct messages disabled')
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
          <CardDescription>Control who can contact you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="dm-toggle">Allow direct messages</Label>
              <p className="text-xs text-muted-foreground">
                When off, other members cannot start a new DM conversation with you.
              </p>
            </div>
            <Switch
              id="dm-toggle"
              checked={dmOptIn}
              onCheckedChange={handleDmToggle}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/profile/edit" className={cn(buttonVariants({ variant: 'outline' }))}>
            Edit profile
          </Link>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <p className="text-sm text-muted-foreground mb-3">Signed in to SDA Forum</p>
        <SignOutButton />
      </div>
    </div>
  )
}
