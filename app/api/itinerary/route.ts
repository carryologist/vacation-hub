import { NextRequest, NextResponse } from 'next/server';
import { getItineraryEvents, createItineraryEvent, updateItineraryEvent, deleteItineraryEvent } from '@/lib/db';
import { validateItineraryEventInput, sanitizePartialUpdate, ITINERARY_FIELD_LIMITS } from '@/lib/validate';

export async function GET() {
  try {
    const events = await getItineraryEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching itinerary events:', error);
    return NextResponse.json({ error: 'Failed to fetch itinerary events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const result = validateItineraryEventInput(raw);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const event = await createItineraryEvent(result.data);
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating itinerary event:', error);
    return NextResponse.json({ error: 'Failed to create itinerary event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const deleted = await deleteItineraryEvent(Number(id));
    if (!deleted) {
      return NextResponse.json({ error: 'Itinerary event not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting itinerary event:', error);
    return NextResponse.json({ error: 'Failed to delete itinerary event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...rawData } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const data = sanitizePartialUpdate(rawData, ITINERARY_FIELD_LIMITS);
    const updated = await updateItineraryEvent(Number(id), data);
    if (!updated) {
      return NextResponse.json({ error: 'Itinerary event not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating itinerary event:', error);
    return NextResponse.json({ error: 'Failed to update itinerary event' }, { status: 500 });
  }
}
