import { NextRequest, NextResponse } from 'next/server';
import { parseItineraryFromText, getApiKey } from '@/lib/llm';
import { getConfig } from '@/lib/config';
import { extractText } from 'unpdf';

// Allow up to 60s for PDF parsing + LLM call
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Accept application/pdf and also empty type (iOS Safari sometimes sends empty)
    const isPdf = file && (
      file.type === 'application/pdf' ||
      file.name?.toLowerCase().endsWith('.pdf')
    );
    if (!file || !isPdf) {
      return NextResponse.json(
        { error: `Please upload a PDF file. (Received type: "${file?.type || 'none'}", name: "${file?.name || 'none'}")` },
        { status: 400 }
      );
    }

    // Enforce 4.5MB limit (Vercel serverless body limit)
    const MAX_PDF_SIZE = 4.5 * 1024 * 1024;
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: 'PDF file is too large. Maximum size is 4.5MB.' },
        { status: 400 }
      );
    }

    // Extract text from PDF using unpdf (serverless-compatible)
    let text: string;
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const { text: extractedText } = await extractText(buffer, { mergePages: true });
      text = extractedText;
    } catch (pdfErr) {
      console.error('PDF text extraction error:', pdfErr);
      return NextResponse.json(
        { error: 'Failed to read PDF. The file may be corrupted or password-protected.' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. It may be scanned/image-based.' },
        { status: 400 }
      );
    }

    // Get LLM config
    const config = await getConfig();
    if (!config?.llmProvider) {
      return NextResponse.json(
        { error: 'No AI provider configured. Go to Settings to set one up.' },
        { status: 400 }
      );
    }

    const apiKey = await getApiKey(config.llmProvider);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key found for the configured AI provider.' },
        { status: 400 }
      );
    }

    // Parse with LLM
    const events = await parseItineraryFromText({
      provider: config.llmProvider as 'openai' | 'anthropic' | 'gemini',
      apiKey,
      text: text.substring(0, 15000), // Limit to ~15k chars to stay within token limits
      tripStartDate: config.startDate,
      tripEndDate: config.endDate,
      timezone: config.timezone || 'America/New_York',
    });

    return NextResponse.json({ events, textLength: text.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PDF parse error:', message, error);
    return NextResponse.json(
      { error: `Failed to parse itinerary: ${message}` },
      { status: 500 }
    );
  }
}
