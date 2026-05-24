import { NextRequest, NextResponse } from "next/server";
import { URL } from "url";

// ---------------------------------------------------------------------------
// URL validation helpers – prevent SSRF
// ---------------------------------------------------------------------------

/** Check whether an IPv4 string falls in a blocked private/internal range. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed → treat as blocked
  }
  const [a, b] = parts;
  return (
    a === 127 || // 127.0.0.0/8  loopback
    a === 10 || // 10.0.0.0/8   private
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local
    a === 0 // 0.0.0.0/8
  );
}

/** Check whether an IPv6 string is private/internal. */
function isPrivateIPv6(raw: string): boolean {
  const ip = raw.toLowerCase();
  if (ip === "::1") return true; // loopback
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7 unique-local
  if (ip.startsWith("fe80")) return true; // fe80::/10 link-local
  if (ip === "::") return true; // unspecified
  // IPv4-mapped IPv6  e.g. ::ffff:127.0.0.1
  const v4Mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

/** Rough check: is the string an IPv4 literal (possibly bracketed)? */
function looksLikeIPv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** Rough check: is the string an IPv6 literal (possibly bracketed)? */
function looksLikeIPv6(host: string): boolean {
  // Hostnames from URL parsing may be wrapped in brackets
  const stripped = host.replace(/^\[|\]$/g, "");
  return stripped.includes(":");
}

/**
 * Validate a URL before we fetch it server-side.
 * Returns `true` if the URL is safe, `false` otherwise.
 */
function isSafeUrl(input: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  // 1. Protocol must be http or https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block localhost & common internal hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    return false;
  }

  // 3. If hostname is an IP literal, check private ranges
  if (looksLikeIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) return false;
  } else if (looksLikeIPv6(hostname)) {
    const stripped = hostname.replace(/^\[|\]$/g, "");
    if (isPrivateIPv6(stripped)) return false;
  } else {
    // 4. Hostname must look like a real public domain (at least one dot)
    if (!hostname.includes(".")) {
      return false;
    }
  }

  // 5. Block credentials in URL (user:pass@host)
  if (parsed.username || parsed.password) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// OG image extraction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fetch with SSRF guard
// ---------------------------------------------------------------------------

async function fetchImageFromUrl(url: string): Promise<string | null> {
  if (!isSafeUrl(url)) {
    return null;
  }

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

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const query = searchParams.get("query");

  let imageUrl: string | null = null;

  // 1. Try scraping the provided URL for an OG image
  if (url) {
    imageUrl = await fetchImageFromUrl(url);
  }

  // 2. Fall back to a curated category image based on the query
  if (!imageUrl && query) {
    const q = query.toLowerCase();
    const categoryImages: Record<string, string> = {
      // Food & Drink
      "food": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
      "dining": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
      "eat": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
      "chicken": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&h=400&fit=crop",
      "bbq": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&h=400&fit=crop",
      "barbecue": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&h=400&fit=crop",
      "pizza": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
      "sushi": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&h=400&fit=crop",
      "taco": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop",
      "burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop",
      "brunch": "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&h=400&fit=crop",
      "breakfast": "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&h=400&fit=crop",
      "drink": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop",
      "cocktail": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop",
      "brewery": "https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&h=400&fit=crop",
      "coffee": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop",
      "cafe": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop",
      "restaurant": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
      "bar": "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&h=400&fit=crop",
      // Music & Entertainment
      "music": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop",
      "concert": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
      "live": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop",
      "honky tonk": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop",
      "entertainment": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
      "nightlife": "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&h=400&fit=crop",
      // Activities & Outdoors
      "attraction": "https://images.unsplash.com/photo-1559587336-47d9b00d03f0?w=600&h=400&fit=crop",
      "shopping": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop",
      "day trip": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
      "family": "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop",
      "outdoor": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
      "museum": "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=400&fit=crop",
      "park": "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&h=400&fit=crop",
      "tour": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop",
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

    // Default fallback: generic destination/travel image (NOT beach)
    if (!imageUrl) {
      imageUrl = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop";
    }
  }

  // 3. Return result (imageUrl may still be null)
  return NextResponse.json({ imageUrl });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
