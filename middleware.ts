import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAX_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Verify auth token in Edge Runtime using Web Crypto API.
 * Checks HMAC signature (timing-safe via double-HMAC) AND token expiry.
 */
async function verifyAuthToken(token: string, secret: string): Promise<boolean> {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return false;

    const payload = token.substring(0, dotIndex);
    const signature = token.substring(dotIndex + 1);
    if (!payload || !signature) return false;

    // Extract timestamp (first segment before ':')
    const timestamp = parseInt(payload.split(':')[0], 10);
    if (isNaN(timestamp)) return false;

    // Check expiry
    if (Date.now() - timestamp > MAX_TOKEN_AGE_MS) return false;

    // Compute expected HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison via double-HMAC:
    // HMAC(expected) === HMAC(signature) — comparing two HMACs with === is safe
    // because the attacker can't control the HMAC output to exploit timing.
    const hmacA = await crypto.subtle.sign('HMAC', key, encoder.encode(signature));
    const hmacB = await crypto.subtle.sign('HMAC', key, encoder.encode(expected));
    const arrA = new Uint8Array(hmacA);
    const arrB = new Uint8Array(hmacB);
    if (arrA.length !== arrB.length) return false;
    let diff = 0;
    for (let i = 0; i < arrA.length; i++) {
      diff |= arrA[i] ^ arrB[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/** Public API routes that don't require auth */
const PUBLIC_API_ROUTES = [
  '/api/auth',       // Login endpoint
  '/api/db/init',    // DB initialization (idempotent, creates tables)
];

/** API routes with mixed auth (some methods public, some protected) */
const MIXED_AUTH_API_ROUTES = [
  '/api/setup/config', // GET is limited-public (for setup check), POST/DELETE require auth
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function isMixedAuthApiRoute(pathname: string): boolean {
  return MIXED_AUTH_API_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // API route handling — no longer blanket-allowed
  if (pathname.startsWith('/api')) {
    // Public API routes (no auth needed)
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    // Mixed auth routes: allow GET for setup checking, protect mutations
    if (isMixedAuthApiRoute(pathname)) {
      if (request.method === 'GET') {
        return NextResponse.next();
      }
      // POST/PUT/DELETE fall through to auth check below
    }

    // All other API routes require auth
    const authCookie = request.cookies.get('vacation-hub-auth');
    const secret = process.env.VACATION_HUB_SECRET;

    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!authCookie || !(await verifyAuthToken(authCookie.value, secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.next();
  }

  // --- Page routes below ---

  // Gate 1: Setup check — verify against DB-backed cookie
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

  // Allow /setup through so users can re-run the wizard (requires auth below)
  // No — setup re-run should also be gated by auth after initial setup
  const authCookie = request.cookies.get('vacation-hub-auth');
  const secret = process.env.VACATION_HUB_SECRET;

  if (!secret) {
    return NextResponse.redirect(new URL('/password', request.url));
  }

  if (!authCookie || !(await verifyAuthToken(authCookie.value, secret))) {
    return NextResponse.redirect(new URL('/password', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
