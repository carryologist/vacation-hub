import { NextRequest, NextResponse } from 'next/server';
import { createItineraryEvent, getItineraryEvents, ItineraryEvent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json();
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    // Get existing events for dedup
    const existing = await getItineraryEvents();

    let created = 0;
    let skipped = 0;

    for (const event of events) {
      // Dedup: skip if an event with the same title AND overlapping time already exists
      const isDupe = existing.some((e) => {
        const titleMatch =
          e.title.toLowerCase().trim() === event.title.toLowerCase().trim();
        if (!titleMatch) return false;
        // Check time overlap: events overlap if one starts before the other ends and vice versa
        const eStart = new Date(e.start_time).getTime();
        const eEnd = new Date(e.end_time).getTime();
        const nStart = new Date(event.start_time).getTime();
        const nEnd = new Date(event.end_time).getTime();
        return nStart < eEnd && nEnd > eStart;
      });

      if (isDupe) {
        skipped++;
        continue;
      }

      // Map category to color
      const colorMap: Record<string, string> = {
        general: '#0ea5e9',
        meal: '#f59e0b',
        activity: '#10b981',
        travel: '#8b5cf6',
        celebration: '#ef4444',
        rest: '#6b7280',
      };

      await createItineraryEvent({
        title: event.title,
        description: event.description || null,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location || null,
        url: event.url || null,
        category: event.category || 'general',
        color: colorMap[event.category] || '#0ea5e9',
        created_by: 'PDF Import',
      });

      // Add to existing array for dedup of subsequent events in this batch
      existing.push({
        id: 0,
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
      } as ItineraryEvent);

      created++;
    }

    return NextResponse.json({ created, skipped, total: events.length });
  } catch (error) {
    console.error('Batch create error:', error);
    return NextResponse.json({ error: 'Failed to create events' }, { status: 500 });
  }
}
