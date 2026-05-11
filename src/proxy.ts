import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public routes — allow unauthenticated
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/offline']
  if (publicRoutes.includes(pathname)) {
    if (user) {
      return redirectByRole(request, supabase, user.id)
    }
    return supabaseResponse
  }

  // Protected routes — require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role guard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as any)?.role

  // Admin portal — admin only
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL(role === 'teacher' ? '/teacher' : '/student', request.url))
    }
    return supabaseResponse
  }

  if (role === 'admin') {
    // Admins can visit teacher and student portals freely (for now)
    return supabaseResponse
  }

  if (pathname.startsWith('/teacher') && role === 'student') {
    return NextResponse.redirect(new URL('/student', request.url))
  }
  if (pathname.startsWith('/student') && role === 'teacher') {
    return NextResponse.redirect(new URL('/teacher', request.url))
  }

  return supabaseResponse
}

async function redirectByRole(request: NextRequest, supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const role = (profile as any)?.role ?? 'student'
  let destination = '/student'
  if (role === 'admin') destination = '/admin'
  else if (role === 'teacher') destination = '/teacher'
  return NextResponse.redirect(new URL(destination, request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
