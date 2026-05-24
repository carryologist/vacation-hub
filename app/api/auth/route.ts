import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import bcrypt from 'bcryptjs';
import { createAuthToken, getRequiredSecret } from '@/lib/auth';

/**
 * In-memory rate limiter for password attempts.
 * Tracks failed attempts per IP. Resets on serverless cold start,
 * which is acceptable — bcrypt's ~100ms cost is the primary defense.
 */
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 10;        // Max failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;  // Clean stale entries every 5 min
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [ip, data] of failedAttempts) {
    if (now - data.lastAttempt > LOCKOUT_DURATION) {
      failedAttempts.delete(ip);
    }
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  cleanupStaleEntries();
  const record = failedAttempts.get(ip);
  if (!record) return false;

  // If lockout period has passed, reset
  if (Date.now() - record.lastAttempt > LOCKOUT_DURATION) {
    failedAttempts.delete(ip);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const record = failedAttempts.get(ip);
  const now = Date.now();

  if (record) {
    // Reset if lockout window has passed
    if (now - record.lastAttempt > LOCKOUT_DURATION) {
      failedAttempts.set(ip, { count: 1, lastAttempt: now });
    } else {
      record.count++;
      record.lastAttempt = now;
    }
  } else {
    failedAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate limiting check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const { password, rememberMe } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const config = await getConfig();
    
    if (!config || !config.passwordHash) {
      return NextResponse.json({ error: 'Site not configured' }, { status: 500 });
    }

    const isValid = await bcrypt.compare(password, config.passwordHash);
    if (!isValid) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Successful login — clear failed attempts
    clearFailedAttempts(ip);

    let secret: string;
    try {
      secret = getRequiredSecret();
    } catch {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const token = createAuthToken(secret);
    
    const response = NextResponse.json({ success: true });
    response.cookies.set('vacation-hub-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe === true ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 1 day
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
