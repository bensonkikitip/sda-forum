'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Church = { id: string; name: string; region: string | null }
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']

export default function ProfileEditPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [city, setCity] = useState('')
  const [churchSearch, setChurchSearch] = useState('')
  const [churchId, setChurchId] = useState('')
  const [churches, setChurches] = useState<Church[]>([])
  const [churchNoResults, setChurchNoResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, date_of_birth, gender, city, church_id, church:churches(id, name, region)')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        setDisplayName(data.display_name ?? '')
        setCurrentAvatarUrl(data.avatar_url ?? null)
        setDob(data.date_of_birth ?? '')
        setGender(data.gender ?? '' as string)
        setCity(data.city ?? '')
        if (data.church_id && data.church) {
          const church = Array.isArray(data.church) ? data.church[0] : data.church
          setChurchId(data.church_id)
          setChurchSearch(church?.name ?? '')
        }
      }
      setInitialLoading(false)
    }
    load()
  }, [supabase, router])

  // Church search
  useEffect(() => {
    setChurchNoResults(false)
    if (churchSearch.length < 2 || churchId) { setChurches([]); return }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('churches')
        .select('id, name, region')
        .ilike('name', `%${churchSearch}%`)
        .order('name')
        .limit(20)
      setChurches(data ?? [])
      setChurchNoResults((data ?? []).length === 0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [churchSearch, churchId, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)

    let avatar_url = currentAvatarUrl

    if (avatar) {
      const ext = avatar.name.split('.').pop()
      const path = `${userId}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatar, { upsert: true })
      if (uploadError) {
        toast.error('Avatar upload failed: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = urlData.publicUrl
    }

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: displayName,
      avatar_url,
      date_of_birth: dob || null,
      gender: gender || null,
      city: city || null,
      church_id: churchId || null,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile updated!')
      router.push(`/profile/${userId}`)
      router.refresh()
    }
    setLoading(false)
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const avatarPreview = avatar ? URL.createObjectURL(avatar) : currentAvatarUrl
  const initials = displayName?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link href={userId ? `/profile/${userId}` : '/home'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to profile
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                {avatarPreview && <AvatarImage src={avatarPreview} />}
              </Avatar>
              <div className="space-y-1">
                <Label htmlFor="avatar">Profile picture</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={e => setAvatar(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF — max 2 MB</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display name *</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={(v: string | null) => setGender(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="e.g. Los Angeles" value={city} onChange={e => setCity(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="churchSearch">SDA Church *</Label>
              <Input
                id="churchSearch"
                placeholder="Type at least 2 letters to search…"
                value={churchSearch}
                onChange={e => { setChurchSearch(e.target.value); setChurchId(''); setChurchNoResults(false) }}
              />
              {churches.length > 0 && !churchId && (
                <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                  {churches.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                      onClick={() => { setChurchId(c.id); setChurchSearch(c.name); setChurches([]); setChurchNoResults(false) }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.region && <span className="text-muted-foreground ml-1">— {c.region}</span>}
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
                  <button type="button" className="underline text-muted-foreground" onClick={() => { setChurchId(''); setChurchSearch(''); setChurchNoResults(false) }}>
                    Change
                  </button>
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading || !displayName || !churchId}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
