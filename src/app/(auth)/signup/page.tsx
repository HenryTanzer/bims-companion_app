'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckSquare, Square } from 'lucide-react'
import Image from 'next/image'

type Subject = { id: string; name: string }

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('subjects').select('id, name').then(({ data }) => {
      if (data) setSubjects(data as Subject[])
    })
  }, [])

  function toggleSubject(id: string) {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (role === 'student' && selectedSubjects.length === 0) {
      setError('Please select at least one subject')
      setLoading(false)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Signup failed. Please try again.')
      setLoading(false)
      return
    }

    // Wait for the DB trigger to create the profile row
    await new Promise(r => setTimeout(r, 600))

    // Enrol student in selected subjects
    if (role === 'student' && selectedSubjects.length > 0) {
      await supabase.from('enrollments').insert(
        selectedSubjects.map(subject_id => ({
          student_id: data.user!.id,
          subject_id,
        })) as any
      )
    }

    router.push(role === 'teacher' ? '/teacher' : '/student')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-1.5">
            <Image src="/logo.png" alt="BIMS School" width={68} height={68} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BIMS Companion</h1>
          <p className="text-muted-foreground text-sm">Your A-Level Study Platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Sign up with your school email address</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

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
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['student', 'teacher'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setSelectedSubjects([]) }}
                      className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        role === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject selection — students only */}
              {role === 'student' && subjects.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    My subjects{' '}
                    <span className="text-muted-foreground font-normal text-xs">
                      — select all that apply
                    </span>
                  </Label>
                  <div className="space-y-2">
                    {subjects.map(s => {
                      const checked = selectedSubjects.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSubject(s.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${
                            checked
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {checked
                            ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                            : <Square className="w-4 h-4 shrink-0" />
                          }
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    You won&apos;t be able to change these yourself after signing up. Contact your teacher if corrections are needed.
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create account
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
