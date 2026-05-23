import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function verifyAuthToken(token: string, secret: string): Promise<boolean> {
  try {
    const [timestamp, signature] = token.split('.');
    if (!timestamp || !signature) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
    const expected = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expected;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Gate 1: Setup check
  const setupDone = request.cookies.get('vacation-hub-setup-done');
  if (!setupDone) {
    if (pathname === '/setup' || pathname.startsWith('/setup')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  // Gate 2: Auth check (setup is done)
  if (pathname === '/password') {
    return NextResponse.next();
  }

  // Also allow /setup through so users can re-run the wizard
  if (pathname === '/setup' || pathname.startsWith('/setup')) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('vacation-hub-auth');
  const secret = process.env.VACATION_HUB_SECRET || '';

  if (!authCookie || !secret || !(await verifyAuthToken(authCookie.value, secret))) {
    return NextResponse.redirect(new URL('/password', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
