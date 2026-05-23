import { NextRequest, NextResponse } from 'next/server';
import { getTravelNotes, createTravelNote, updateTravelNote, deleteTravelNote } from '@/lib/db';

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
    const data = await request.json();
    const note = await createTravelNote(data);
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
    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
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
