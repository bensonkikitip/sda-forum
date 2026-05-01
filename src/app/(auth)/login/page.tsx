'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Read directly from the DOM so browser autofill is captured correctly
    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string).trim()
    const password = formData.get('password') as string

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/home')
      router.refresh()
    }
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
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="w-full border shadow-sm">
          <CardHeader className="sr-only">
            <CardTitle>SDA Community</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {reason === 'banned' && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                Your account has been suspended. Please contact an administrator.
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
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
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-sm text-center text-muted-foreground">
            <Link href="/forgot-password" className="hover:underline">
              Forgot your password?
            </Link>
            <span>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-foreground hover:underline font-medium">
                Sign up
              </Link>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
