import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

const MAX_TOKEN_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Create an auth token: {timestamp}:{nonce}.{hmac}
 * Nonce adds entropy so tokens aren't guessable from timestamp alone.
 */
export function createAuthToken(secret: string): string {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  const payload = `${timestamp}:${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verify an auth token server-side (Node.js crypto — for API routes).
 * Checks HMAC signature AND expiry.
 */
export function verifyAuthTokenNode(token: string, secret: string): boolean {
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

    // Constant-time comparison via double-HMAC
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const a = createHmac('sha256', secret).update(signature).digest('hex');
    const b = createHmac('sha256', secret).update(expected).digest('hex');
    return a === b;
  } catch {
    return false;
  }
}

/**
 * Get the VACATION_HUB_SECRET or throw.
 * Never falls back to a hardcoded value.
 */
export function getRequiredSecret(): string {
  const secret = process.env.VACATION_HUB_SECRET;
  if (!secret) {
    throw new Error('VACATION_HUB_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Require authentication on an API route.
 * Returns null if auth is valid, or a 401 NextResponse if not.
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  try {
    const secret = getRequiredSecret();
    const authCookie = request.cookies.get('vacation-hub-auth');

    if (!authCookie || !verifyAuthTokenNode(authCookie.value, secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null; // Auth is valid
  } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
}

/**
 * Create a signed setup-done cookie value.
 * Format: {payload}.{hmac} where payload is "setup-done:{timestamp}"
 */
export function createSignedSetupCookie(secret: string): string {
  const payload = `setup-done:${Date.now()}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}
