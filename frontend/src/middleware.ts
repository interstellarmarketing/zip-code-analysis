import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get the current pathname
    const pathname = request.nextUrl.pathname;

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    // Allow public routes
    if (pathname === '/' || pathname === '/login' || pathname === '/register') {
      return response;
    }

    // Protected routes require session
    if (!session && (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/lists') ||
      pathname.startsWith('/compare')
    )) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow access to public routes
    const pathname = request.nextUrl.pathname;
    if (pathname === '/' || pathname === '/login' || pathname === '/register') {
      return response;
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}; 