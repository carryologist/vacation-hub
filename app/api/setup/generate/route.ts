import { NextRequest, NextResponse } from 'next/server';
import { generateActivities, getApiKey } from '@/lib/llm';
import { createActivitySuggestion } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, destination, startDate, endDate } = await request.json();
    
    // Use provided key or fall back to stored/env key
    const resolvedKey = apiKey || await getApiKey(provider);
    if (!resolvedKey) {
      return NextResponse.json({ error: 'No API key available' }, { status: 400 });
    }

    const activities = await generateActivities({
      provider,
      apiKey: resolvedKey,
      destination,
      startDate,
      endDate,
    });

    // Save to database — deduplicate by title (case-insensitive)
    let saved = 0;
    const seenTitles = new Set<string>();
    for (const activity of activities) {
      const normalizedTitle = activity.title.toLowerCase().trim();
      if (seenTitles.has(normalizedTitle)) continue;
      seenTitles.add(normalizedTitle);
      try {
        await createActivitySuggestion({
          title: activity.title,
          description: activity.description,
          category: activity.category,
          location: activity.location || undefined,
          url: activity.website || undefined,
          suggested_by: 'AI',
          image_url: undefined,
        });
        saved++;
      } catch (err) {
        console.error('Failed to save activity:', activity.title, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      generated: activities.length,
      saved 
    });
  } catch (error) {
    console.error('Generation error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
