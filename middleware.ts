import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // First, ensure session cookies are up to date (also redirects unauthenticated users to /login)
  const sessionResponse = await updateSession(request)

  const isAdminRoute = new URL(request.url).pathname.startsWith('/admin')
  if (isAdminRoute) {
    // Create a Supabase client bound to the current request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(_cookiesToSet) {
            // No-op here; cookie refresh is handled by updateSession above
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const role = (user.user_metadata as any)?.role
    if (role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return sessionResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}