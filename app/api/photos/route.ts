import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getPhotos, createPhoto, updatePhotoName, deletePhoto, getPhotoById } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const photos = await getPhotos(limit, offset);
    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch photos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, original_filename, file_size, mime_type, public_url, storage_path, uploaded_by } = body;

    if (!filename || !original_filename || !public_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const photo = await createPhoto({
      filename,
      original_filename,
      file_size: file_size || 0,
      mime_type: mime_type || 'image/jpeg',
      width: null,
      height: null,
      uploaded_by: uploaded_by || 'Anonymous',
      storage_path: storage_path || filename,
      public_url,
      description: null,
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Error saving photo metadata:', error);
    const message = error instanceof Error ? error.message : 'Failed to save photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, original_filename } = body;

    if (!id || !original_filename) {
      return NextResponse.json({ error: 'id and original_filename are required' }, { status: 400 });
    }

    const photo = await updatePhotoName(id, original_filename);
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
