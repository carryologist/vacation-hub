import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

function verifyAuthToken(token: string, secret: string): boolean {
  try {
    const [timestamp, signature] = token.split('.');
    if (!timestamp || !signature) return false;
    const expected = createHmac('sha256', secret).update(timestamp).digest('hex');
    return signature === expected;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets and API setup routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/db') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Gate 1: Setup check
  const setupDone = request.cookies.get('vacation-hub-setup-done');
  if (!setupDone) {
    // Allow /setup and /api/auth routes through (auth is needed at end of setup wizard)
    if (pathname === '/setup' || pathname.startsWith('/setup') || pathname === '/api/auth') {
      return NextResponse.next();
    }
    // Redirect everything else to /setup
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  // Gate 2: Auth check (setup is done)
  // Allow public routes
  if (pathname === '/password' || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get('vacation-hub-auth');
  const secret = process.env.VACATION_HUB_SECRET || '';
  
  if (!authCookie || !secret || !verifyAuthToken(authCookie.value, secret)) {
    return NextResponse.redirect(new URL('/password', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
