import { NextRequest, NextResponse } from "next/server";

function resolveUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function extractOgImage(html: string): string | null {
  // Try og:image meta tag
  const ogMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i
  ) ?? html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*\/?>/i
  );
  if (ogMatch?.[1]) return ogMatch[1];

  // Try twitter:image meta tag
  const twitterMatch = html.match(
    /<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i
  ) ?? html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["'][^>]*\/?>/i
  );
  if (twitterMatch?.[1]) return twitterMatch[1];

  // Last resort: first <img> with a src that looks like a real image
  const imgMatch = html.match(
    /<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["'][^>]*\/?>/i
  );
  if (imgMatch?.[1]) return imgMatch[1];

  return null;
}

async function fetchImageFromUrl(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OGImageBot/1.0; +https://example.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) return null;

    const html = await response.text();
    const rawSrc = extractOgImage(html);

    if (!rawSrc) return null;

    return resolveUrl(rawSrc, url);
  } catch {
    // Fetch failed or timed out — fall through
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const query = searchParams.get("query");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let imageUrl: string | null = null;

  // 1. Try scraping the provided URL for an OG image
  if (url) {
    imageUrl = await fetchImageFromUrl(url);
  }

  // 2. Fall back to a curated category image based on the query
  if (!imageUrl && query) {
    const q = query.toLowerCase();
    const categoryImages: Record<string, string> = {
      "food": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
      "drink": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
      "restaurant": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
      "attraction": "https://images.unsplash.com/photo-1559587336-47d9b00d03f0?w=600&h=400&fit=crop",
      "entertainment": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
      "shopping": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop",
      "day trip": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
      "family": "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop",
      "outdoor": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
      "bar": "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&h=400&fit=crop",
      "cafe": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop",
      "museum": "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=400&fit=crop",
      "park": "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&h=400&fit=crop",
      "nightlife": "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&h=400&fit=crop",
      "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
      "hiking": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
      "sports": "https://images.unsplash.com/photo-1461896836934-ber96d6e534a?w=600&h=400&fit=crop",
    };

    // Match on the first keyword found in the query
    for (const [keyword, url] of Object.entries(categoryImages)) {
      if (q.includes(keyword)) {
        imageUrl = url;
        break;
      }
    }

    // Default fallback: generic travel/vacation image
    if (!imageUrl) {
      imageUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop";
    }
  }

  // 3. Return result (imageUrl may still be null)
  return NextResponse.json({ imageUrl }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
