'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, GraduationCap, Brain, BookOpen, Cpu, TrendingUp, FlaskConical } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = (profile as any)?.role
      if (role === 'admin') router.push('/admin')
      else router.push(role === 'teacher' ? '/teacher' : '/student')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Colour blobs */}
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      {/* Floating study icons */}
      <GraduationCap className="absolute top-10 left-10 w-10 h-10 text-primary/20 -rotate-12 pointer-events-none" />
      <Brain        className="absolute top-16 right-16 w-8  h-8  text-violet-400/20 rotate-6   pointer-events-none" />
      <BookOpen     className="absolute bottom-24 left-20 w-7  h-7  text-blue-400/20  rotate-12  pointer-events-none" />
      <FlaskConical className="absolute bottom-36 right-20 w-7  h-7  text-green-400/20 -rotate-6  pointer-events-none" />
      <Cpu          className="absolute top-1/2 left-10  w-6  h-6  text-cyan-400/15  rotate-3   pointer-events-none" />
      <TrendingUp   className="absolute top-1/3 right-10  w-6  h-6  text-orange-400/15 -rotate-3  pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-1.5 shadow-lg shadow-primary/20">
            <Image src="/logo.png" alt="BIMS School" width={68} height={68} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BIMS Companion</h1>
          <p className="text-muted-foreground text-sm">Your A-Level Study Platform</p>
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/20">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your school email and password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.ac.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign in
              </Button>
            </form>
            <div className="flex flex-col items-center gap-2 mt-4">
              <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                Forgot your password?
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
