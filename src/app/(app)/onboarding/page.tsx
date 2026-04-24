'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Church = { id: string; name: string; region: string | null }

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [displayName, setDisplayName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [city, setCity] = useState('')
  const [churchSearch, setChurchSearch] = useState('')
  const [churchId, setChurchId] = useState('')
  const [churches, setChurches] = useState<Church[]>([])
  const [churchNoResults, setChurchNoResults] = useState(false)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search churches as the user types (debounced 300ms, min 2 chars)
  useEffect(() => {
    setChurchNoResults(false)
    if (churchSearch.length < 2 || churchId) { setChurches([]); return }
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from('churches')
        .select('id, name, region')
        .ilike('name', `%${churchSearch}%`)
        .order('name')
        .limit(20)
      if (!error) {
        setChurches(data ?? [])
        setChurchNoResults((data ?? []).length === 0)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [churchSearch, churchId, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let avatar_url: string | null = null

    if (avatar) {
      const ext = avatar.name.split('.').pop()
      const path = `${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatar, { upsert: true })
      if (uploadError) {
        setError('Avatar upload failed: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = urlData.publicUrl
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      date_of_birth: dob || null,
      gender: gender || null,
      city: city || null,
      church_id: churchId || null,
      avatar_url,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete your profile</CardTitle>
          <CardDescription>Tell us a bit about yourself</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name *</Label>
              <Input
                id="displayName"
                placeholder="How you want to appear on the forum"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label htmlFor="avatar">Profile picture (optional)</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF — max 2 MB</p>
            </div>

            {/* Date of birth */}
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select onValueChange={(v: string | null) => setGender(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g. Los Angeles"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            {/* Church picker */}
            <div className="space-y-2">
              <Label htmlFor="churchSearch">SDA Church *</Label>
              <Input
                id="churchSearch"
                placeholder="Type at least 2 letters to search…"
                value={churchSearch}
                onChange={(e) => {
                  setChurchSearch(e.target.value)
                  setChurchId('')
                  setChurchNoResults(false)
                }}
              />
              {churches.length > 0 && !churchId && (
                <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                  {churches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                      onClick={() => {
                        setChurchId(c.id)
                        setChurchSearch(c.name)
                        setChurches([])
                        setChurchNoResults(false)
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.region && (
                        <span className="text-muted-foreground ml-1">— {c.region}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {churchNoResults && !churchId && (
                <p className="text-xs text-muted-foreground">
                  No churches found for &ldquo;{churchSearch}&rdquo;. Contact an admin to add your church.
                </p>
              )}
              {churchId && (
                <p className="text-xs text-green-600">
                  ✓ Church selected.{' '}
                  <button
                    type="button"
                    className="underline text-muted-foreground"
                    onClick={() => { setChurchId(''); setChurchSearch(''); setChurchNoResults(false) }}
                  >
                    Change
                  </button>
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading || !displayName || !churchId}>
              {loading ? 'Saving…' : 'Save and continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
