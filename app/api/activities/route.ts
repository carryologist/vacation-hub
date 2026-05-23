import { NextRequest, NextResponse } from 'next/server';
import { getActivitySuggestions, createActivitySuggestion, deleteActivitySuggestion } from '@/lib/db';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const suggestions = await getActivitySuggestions();
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const deleted = await deleteActivitySuggestion(Number(id));
    if (!deleted) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    await sql`UPDATE activity_suggestions SET 
      title = COALESCE(${data.title || null}, title),
      description = COALESCE(${data.description || null}, description),
      location = COALESCE(${data.location || null}, location),
      url = COALESCE(${data.url || null}, url),
      suggested_by = COALESCE(${data.suggested_by || null}, suggested_by)
    WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const suggestion = await createActivitySuggestion(data);

    // Asynchronously fetch an OG image for the suggestion
    try {
      const origin = request.nextUrl.origin;
      const params = new URLSearchParams();
      if (data.url) {
        params.set('url', data.url);
      }
      params.set('query', `${data.title} ${data.category}`);

      const ogResponse = await fetch(`${origin}/api/og-image?${params.toString()}`);
      const ogData = await ogResponse.json();

      if (ogData.imageUrl) {
        await sql`UPDATE activity_suggestions SET image_url = ${ogData.imageUrl} WHERE id = ${suggestion.id}`;
        suggestion.image_url = ogData.imageUrl;
      }
    } catch (imageError) {
      console.error('Error fetching OG image:', imageError);
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
