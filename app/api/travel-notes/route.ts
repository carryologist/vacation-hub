import { NextRequest, NextResponse } from 'next/server';
import { getTravelNotes, createTravelNote, updateTravelNote, deleteTravelNote } from '@/lib/db';
import { validateTravelNoteInput, sanitizePartialUpdate, TRAVEL_NOTE_FIELD_LIMITS } from '@/lib/validate';

export async function GET() {
  try {
    const notes = await getTravelNotes();
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching travel notes:', error);
    return NextResponse.json({ error: 'Failed to fetch travel notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const result = validateTravelNoteInput(raw);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const note = await createTravelNote(result.data);
    return NextResponse.json(note);
  } catch (error) {
    console.error('Error creating travel note:', error);
    return NextResponse.json({ error: 'Failed to create travel note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const deleted = await deleteTravelNote(Number(id));
    if (!deleted) {
      return NextResponse.json({ error: 'Travel note not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting travel note:', error);
    return NextResponse.json({ error: 'Failed to delete travel note' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...rawData } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const data = sanitizePartialUpdate(rawData, TRAVEL_NOTE_FIELD_LIMITS);
    const updated = await updateTravelNote(Number(id), data);
    if (!updated) {
      return NextResponse.json({ error: 'Travel note not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating travel note:', error);
    return NextResponse.json({ error: 'Failed to update travel note' }, { status: 500 });
  }
}
