import { NextRequest, NextResponse } from 'next/server';
import { getItineraryEvents } from '@/lib/db';
import { getConfig } from '@/lib/config';
import { generateICalendar, generateSingleEventIcs } from '@/lib/ical';
import { verifyAuthTokenNode } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function verifyCalendarToken(token: string): Promise<boolean> {
  const secret = process.env.VACATION_HUB_SECRET;
  if (!secret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('calendar-subscribe'));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return token === expected;
}

function isAuthenticated(request: NextRequest): boolean {
  const secret = process.env.VACATION_HUB_SECRET;
  if (!secret) return false;
  const authCookie = request.cookies.get('vacation-hub-auth');
  if (authCookie && verifyAuthTokenNode(authCookie.value, secret)) {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const token = searchParams.get('token');

    // Auth: cookie or token
    let authenticated = isAuthenticated(request);
    if (!authenticated && token) {
      authenticated = await verifyCalendarToken(token);
    }
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await getItineraryEvents();
    const config = await getConfig();
    const tripName = config?.tripName ?? 'Trip';

    if (id) {
      // Single event download
      const event = events.find(e => String(e.id) === id);
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      const ics = generateSingleEventIcs(event, tripName, config?.timezone);
      return new Response(ics, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="event-${id}.ics"`,
        },
      });
    }

    // Full calendar download/subscription
    const ics = generateICalendar(events, tripName, config?.timezone);
    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${tripName}-itinerary.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error exporting itinerary:', error);
    return NextResponse.json({ error: 'Failed to export itinerary' }, { status: 500 });
  }
}
