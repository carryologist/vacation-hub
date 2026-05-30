import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getWeatherForTrip } from '@/lib/weather';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getConfig();
    if (!config || !config.destination || !config.startDate || !config.endDate) {
      return NextResponse.json(
        { error: 'Trip not configured' },
        { status: 400 }
      );
    }

    const weather = await getWeatherForTrip(
      config.destination,
      config.startDate,
      config.endDate
    );

    if (!weather) {
      return NextResponse.json(
        { error: 'Unable to fetch weather data' },
        { status: 502 }
      );
    }

    return NextResponse.json(weather);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
