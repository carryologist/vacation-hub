import { NextRequest, NextResponse } from 'next/server';
import { getItineraryEvents, createItineraryEvent, updateItineraryEvent, deleteItineraryEvent } from '@/lib/db';

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
    const data = await request.json();
    const event = await createItineraryEvent(data);
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
    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
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
