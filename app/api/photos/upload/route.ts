import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Validate / authenticate here if needed
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
        };
      },
      onUploadCompleted: async () => {
        // Could save to DB here via webhook, but we handle it client-side instead
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error handling upload:', error);
    const message = error instanceof Error ? error.message : 'Upload token generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
