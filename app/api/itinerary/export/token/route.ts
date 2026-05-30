import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Generate the calendar subscription token.
 * Requires cookie auth (handled by middleware).
 * Returns the HMAC token that can be appended to subscription URLs.
 */
export async function GET() {
  try {
    const secret = process.env.VACATION_HUB_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('calendar-subscribe'));
    const token = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating calendar token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
