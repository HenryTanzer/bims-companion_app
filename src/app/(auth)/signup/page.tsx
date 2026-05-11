'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckSquare, Square, AlertTriangle, CheckCircle2 } from 'lucide-react'
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

  // Student: multi-select
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  // Teacher: single-select with confirmation flow
  const [pendingTeacherSubject, setPendingTeacherSubject] = useState<string | null>(null)
  const [confirmedTeacherSubject, setConfirmedTeacherSubject] = useState<string | null>(null)

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

  function selectTeacherSubject(id: string) {
    // If already confirmed, clicking another subject resets confirmation
    setConfirmedTeacherSubject(null)
    setPendingTeacherSubject(id)
  }

  function confirmTeacherSubject() {
    setConfirmedTeacherSubject(pendingTeacherSubject)
    setPendingTeacherSubject(null)
  }

  function cancelTeacherSubject() {
    setPendingTeacherSubject(null)
    setConfirmedTeacherSubject(null)
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

    if (role === 'teacher' && !confirmedTeacherSubject) {
      setError('Please select and confirm your unit')
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

    if (role === 'student' && selectedSubjects.length > 0) {
      await supabase.from('enrollments').insert(
        selectedSubjects.map(subject_id => ({
          student_id: data.user!.id,
          subject_id,
        })) as any
      )
    }

    if (role === 'teacher' && confirmedTeacherSubject) {
      await (supabase as any).from('teacher_subjects').insert({
        teacher_id: data.user!.id,
        subject_id: confirmedTeacherSubject,
      })
    }

    router.push(role === 'teacher' ? '/teacher' : '/student')
    router.refresh()
  }

  const pendingSubjectName = subjects.find(s => s.id === pendingTeacherSubject)?.name
  const confirmedSubjectName = subjects.find(s => s.id === confirmedTeacherSubject)?.name

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
                      onClick={() => {
                        setRole(r)
                        setSelectedSubjects([])
                        setPendingTeacherSubject(null)
                        setConfirmedTeacherSubject(null)
                      }}
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

              {/* Subject selection — students: multi-select */}
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

              {/* Unit selection — teachers: single-select with confirmation */}
              {role === 'teacher' && subjects.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    My unit{' '}
                    <span className="text-muted-foreground font-normal text-xs">
                      — select one
                    </span>
                  </Label>

                  {/* Confirmed state: show locked-in subject */}
                  {confirmedTeacherSubject ? (
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-primary bg-primary/10">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground">{confirmedSubjectName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={cancelTeacherSubject}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    /* Subject picker buttons */
                    <div className="space-y-2">
                      {subjects.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectTeacherSubject(s.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${
                            pendingTeacherSubject === s.id
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            pendingTeacherSubject === s.id ? 'border-primary' : 'border-muted-foreground'
                          }`}>
                            {pendingTeacherSubject === s.id && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Confirmation box — appears after selecting, before confirming */}
                  {pendingTeacherSubject && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-3">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">
                          You&apos;re selecting <span className="font-semibold">{pendingSubjectName}</span> as your unit.
                          Once you register, only an administrator can change this.
                          Are you sure?
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={confirmTeacherSubject}
                          className="flex-1"
                        >
                          Yes, confirm
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelTeacherSubject}
                          className="flex-1"
                        >
                          Choose another
                        </Button>
                      </div>
                    </div>
                  )}

                  {!confirmedTeacherSubject && !pendingTeacherSubject && (
                    <p className="text-xs text-muted-foreground pt-1">
                      You will only be able to see and manage students in your unit. Contact an administrator if corrections are needed.
                    </p>
                  )}
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
