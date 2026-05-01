'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    // Read directly from the DOM so browser autofill is captured correctly
    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string).trim()
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation is disabled — logged in immediately
      router.push('/onboarding')
      router.refresh()
    } else {
      // Email confirmation required — show instructions
      setConfirmedEmail(email)
      setAwaitingConfirmation(true)
      setLoading(false)
    }
  }

  if (awaitingConfirmation) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{
          background: 'linear-gradient(160deg, oklch(0.97 0.006 258) 0%, oklch(0.985 0.004 258) 100%)',
        }}
      >
        <Card className="w-full max-w-md text-center border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{confirmedEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Click the link in that email to activate your account, then come back and sign in.</p>
            <p>Don&apos;t see it? Check your spam folder.</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Link href="/login" className="text-sm hover:underline">Back to sign in</Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(160deg, oklch(0.97 0.006 258) 0%, oklch(0.985 0.004 258) 100%)',
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo above card */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <span className="text-white font-black text-2xl leading-none">✝</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">SDA Community</h1>
          <p className="text-sm text-muted-foreground">Create your account to get started</p>
        </div>

        <Card className="w-full border shadow-sm">
          <CardHeader className="sr-only">
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Join the SDA Community</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground hover:underline font-medium ml-1">
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
