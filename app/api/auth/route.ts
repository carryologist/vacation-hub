import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';

function createAuthToken(secret: string): string {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { password, rememberMe } = await request.json();
    const config = await getConfig();
    
    if (!config || !config.passwordHash) {
      return NextResponse.json({ error: 'Site not configured' }, { status: 500 });
    }

    const isValid = await bcrypt.compare(password, config.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const secret = process.env.VACATION_HUB_SECRET || 'fallback';
    const token = createAuthToken(secret);
    
    const response = NextResponse.json({ success: true });
    response.cookies.set('vacation-hub-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 1 day
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
