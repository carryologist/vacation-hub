import { NextRequest, NextResponse } from 'next/server';
import { parseItineraryFromText, getApiKey } from '@/lib/llm';
import { getConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 });
    }

    // Extract text from PDF — dynamic import to avoid pdf-parse test file issue at build time
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdf = (await import('pdf-parse')).default;
    const pdfData = await pdf(buffer);
    const text = pdfData.text;

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
    console.error('PDF parse error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF. The file may be corrupted or unsupported.' }, { status: 500 });
  }
}
