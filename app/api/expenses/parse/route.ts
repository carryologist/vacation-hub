import { NextRequest, NextResponse } from 'next/server';
import { parseReceipt, getApiKey } from '@/lib/llm';
import { getConfig } from '@/lib/config';
import { extractText } from 'unpdf';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { receiptUrl, mimeType, filename } = body;

    if (!receiptUrl || typeof receiptUrl !== 'string') {
      return NextResponse.json({ error: 'Receipt URL is required' }, { status: 400 });
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

    const provider = config.llmProvider as 'openai' | 'anthropic' | 'gemini';
    const isPdf = mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf');

    let result;
    if (isPdf) {
      // Extract text from PDF, then send text to LLM
      const pdfRes = await fetch(receiptUrl);
      const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer());
      const { text } = await extractText(pdfBuffer, { mergePages: true });
      
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'Could not extract text from PDF receipt.' },
          { status: 400 }
        );
      }

      result = await parseReceipt({
        provider,
        apiKey,
        text: text.substring(0, 5000),
      });
    } else {
      // Send image directly to vision LLM
      result = await parseReceipt({
        provider,
        apiKey,
        imageUrl: receiptUrl,
        mimeType,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Receipt parse error:', message, error);
    return NextResponse.json(
      { error: `Failed to parse receipt: ${message}` },
      { status: 500 }
    );
  }
}
