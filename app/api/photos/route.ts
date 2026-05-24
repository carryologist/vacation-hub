import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getPhotos, createPhoto, updatePhotoName, deletePhoto, getPhotoById } from '../../../lib/db';
import { validatePhotoInput, sanitizePartialUpdate, PHOTO_FIELD_LIMITS, stripHtml } from '../../../lib/validate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const photos = await getPhotos(limit, offset);
    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const result = validatePhotoInput(raw);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const data = result.data;

    const photo = await createPhoto({
      filename: data.filename,
      original_filename: data.original_filename,
      file_size: data.file_size || 0,
      mime_type: data.mime_type || 'image/jpeg',
      width: null,
      height: null,
      uploaded_by: data.uploaded_by || 'Anonymous',
      storage_path: data.storage_path || data.filename,
      public_url: data.public_url,
      description: null,
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Error saving photo metadata:', error);
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, original_filename } = body;

    if (!id || !original_filename) {
      return NextResponse.json({ error: 'id and original_filename are required' }, { status: 400 });
    }

    // Sanitize the filename for partial update
    const sanitized = sanitizePartialUpdate({ original_filename }, PHOTO_FIELD_LIMITS);
    const photo = await updatePhotoName(id, sanitized.original_filename as string);
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error('Error updating photo:', error);
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const photo = await getPhotoById(id);
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    await del(photo.public_url);
    await deletePhoto(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
