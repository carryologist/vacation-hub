import Link from "next/link";
import PhotoCarousel from "../../components/PhotoCarousel";
import GoogleMapsWidget from "../../components/GoogleMapsWidget";
import { getConfig, Lodging } from "@/lib/config";

export const dynamic = 'force-dynamic';

/* ─── Type-aware configuration ────────────────────────────────────── */

type LodgingType = 'hotel' | 'airbnb' | 'vrbo' | 'house' | 'resort' | 'hostel' | 'other';

const TYPE_EMOJI: Record<LodgingType, string> = {
  hotel: '🏨',
  airbnb: '🏠',
  vrbo: '🏡',
  house: '🏘️',
  resort: '🌴',
  hostel: '🛏️',
  other: '📍',
};

const TYPE_LABEL: Record<LodgingType, string> = {
  hotel: 'Hotel',
  airbnb: 'Airbnb',
  vrbo: 'VRBO',
  house: 'House',
  resort: 'Resort',
  hostel: 'Hostel',
  other: 'Lodging',
};

const TYPE_FALLBACK_IMAGE: Record<string, string> = {
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop',
  airbnb: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop',
  vrbo: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop',
  house: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop',
  resort: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=400&fit=crop',
  hostel: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=400&fit=crop',
  other: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop',
};

/* ─── Helpers ─────────────────────────────────────────────────────── */

function normalizeImageUrls(urls: string[] | string | undefined): string[] {
  if (!urls) return [];
  if (typeof urls === 'string') return urls.split(',').map(u => u.trim()).filter(Boolean);
  return urls;
}

function getLodgingType(lodging: Lodging): LodgingType {
  const t = (lodging as { type?: string }).type;
  if (t && t in TYPE_EMOJI) return t as LodgingType;
  return 'other';
}

function getFallbackImage(type: LodgingType): string {
  return TYPE_FALLBACK_IMAGE[type] ?? TYPE_FALLBACK_IMAGE.other;
}

function buildPhotos(lodging: Lodging, prefix: string) {
  const type = getLodgingType(lodging);
  const urls = normalizeImageUrls(lodging.imageUrls);

  if (urls.length > 0) {
    return urls.map((url, i) => ({
      id: `${prefix}-${i}`,
      url,
      caption: `${lodging.name} — Photo ${i + 1}`,
    }));
  }

  // Fallback: single type-specific image
  return [{
    id: `${prefix}-fallback`,
    url: getFallbackImage(type),
    caption: lodging.name,
  }];
}

function formatDate(raw?: string): string | null {
  if (!raw) return null;
  try {
    const d = new Date(raw + (raw.includes('T') ? '' : 'T12:00:00'));
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return raw;
  }
}

function formatDateWithTime(date?: string, time?: string): string | null {
  const formatted = formatDate(date);
  if (!formatted) return null;
  if (!time) return formatted;
  return `${formatted} at ${time}`;
}

function renderHighlight(h: unknown, i: number) {
  const text = typeof h === 'string'
    ? h
    : (h && typeof h === 'object' && 'key' in h && 'value' in h)
      ? `${(h as { key: string }).key}: ${(h as { value: string }).value}`
      : String(h);

  return (
    <span
      key={i}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
      style={{
        background: 'var(--brand-light)',
        color: 'var(--brand)',
        border: '1px solid color-mix(in srgb, var(--brand) 25%, transparent)',
      }}
    >
      {text}
    </span>
  );
}

function getBookingLabel(lodging: Lodging): string {
  const url = lodging.bookingUrl ?? '';
  if (url.includes('google.com/maps')) return '📍 View on Map';
  const type = getLodgingType(lodging);
  switch (type) {
    case 'airbnb': return '🏠 View on Airbnb';
    case 'vrbo': return '🏡 View on VRBO';
    case 'hotel': return '🏨 View Booking';
    default: return '🔗 View Listing';
  }
}

/* ─── Type Badge ──────────────────────────────────────────────────── */

function TypeBadge({ lodging }: { lodging: Lodging }) {
  const type = getLodgingType(lodging);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{
        background: 'var(--brand-light)',
        color: 'var(--brand)',
        border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
      }}
    >
      {TYPE_EMOJI[type]} {TYPE_LABEL[type]}
    </span>
  );
}

/* ─── Check-in / Check-out Card ───────────────────────────────────── */

function CheckInOutCard({ lodging }: { lodging: Lodging }) {
  const checkInDate = formatDateWithTime(
    lodging.checkIn,
    (lodging as { checkInTime?: string }).checkInTime
  );
  const checkOutDate = formatDateWithTime(
    lodging.checkOut,
    (lodging as { checkOutTime?: string }).checkOutTime
  );

  if (!checkInDate && !checkOutDate) return null;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📅</span>
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Dates
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {checkInDate && (
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: 'var(--brand)' }}
            >
              Check-in
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {checkInDate}
            </div>
          </div>
        )}
        {checkOutDate && (
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: 'var(--brand)' }}
            >
              Check-out
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {checkOutDate}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Booking Button ──────────────────────────────────────────────── */

function BookingButton({ lodging }: { lodging: Lodging }) {
  if (!lodging.bookingUrl) return null;

  return (
    <a
      href={lodging.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary w-full text-center font-semibold"
      style={{ display: 'block' }}
    >
      {getBookingLabel(lodging)}
    </a>
  );
}

/* ─── Lodging Card (multi-lodging mode) ───────────────────────────── */

function LodgingCard({ lodging, index }: { lodging: Lodging; index: number }) {
  const type = getLodgingType(lodging);
  const photos = buildPhotos(lodging, `card-${index}`);

  return (
    <div className="card space-y-6">
      {/* Carousel — always shown */}
      <PhotoCarousel photos={photos} />

      {/* Name + Type Badge */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {TYPE_EMOJI[type]} {lodging.name}
        </h2>
        <TypeBadge lodging={lodging} />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-5">
          {/* Description */}
          {lodging.description && (
            <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">
              {lodging.description}
            </p>
          )}

          {/* Highlights */}
          {lodging.highlights && lodging.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lodging.highlights.map((h, i) => renderHighlight(h, i))}
            </div>
          )}

          {/* Check-in/Check-out */}
          <CheckInOutCard lodging={lodging} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div
            className="rounded-xl p-6"
            style={{
              background: 'var(--brand-light)',
              border: '1px solid color-mix(in srgb, var(--brand) 40%, transparent)',
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'var(--brand)' }}>
              📍 Details
            </h3>
            <div className="space-y-3 text-sm">
              {lodging.address && (
                <div>
                  <div className="font-medium" style={{ color: 'var(--brand)' }}>
                    Address
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {lodging.address}
                  </div>
                </div>
              )}
            </div>

            {lodging.bookingUrl && (
              <div
                className="mt-6 pt-4"
                style={{
                  borderTop: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
                }}
              >
                <BookingButton lodging={lodging} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      {lodging.address && (
        <div>
          <h3 className="font-display text-xl font-semibold mb-4">
            🗺️ Location
          </h3>
          <div className="h-[300px]">
            <GoogleMapsWidget address={lodging.address} height="100%" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */

export default async function StayInfo() {
  const config = await getConfig();
  const tripName = config?.tripName ?? "Our Trip";
  const lodgings = config?.lodgings ?? [];

  // ── 0 lodgings: empty state ──
  if (lodgings.length === 0) {
    return (
      <div className="container space-y-12 animate-fade-in px-4 sm:px-6">
        <div className="text-center">
          <div className="badge badge-primary mb-4">🏨 Stay Info</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Where We&apos;re <span className="text-gradient">Staying</span>
          </h1>
        </div>
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🏠</div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            No lodging added yet
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Add your first property in Settings.
          </p>
          <Link href="/settings" className="primary-cta-button-small">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // ── 1 lodging: full hero layout ──
  if (lodgings.length === 1) {
    const lodging = lodgings[0];
    const type = getLodgingType(lodging);
    const photos = buildPhotos(lodging, 'hero');

    return (
      <div className="container space-y-12 animate-fade-in px-4 sm:px-6">
        {/* Header */}
        <div className="text-center">
          <div className="badge badge-primary mb-4">{TYPE_EMOJI[type]} Stay Info</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Our <span className="text-gradient">Home Base</span>
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Everything you need to know about where we&apos;re staying.
          </p>
        </div>

        {/* Photo Carousel — always shown */}
        <div className="animate-fade-in">
          <PhotoCarousel photos={photos} />
        </div>

        {/* Property Overview */}
        <div className="card">
          {/* Name + Type Badge */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {TYPE_EMOJI[type]} {lodging.name}
            </h2>
            <TypeBadge lodging={lodging} />
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] gap-8">
            <div className="space-y-5">
              {/* Description */}
              {lodging.description && (
                <p
                  style={{ color: 'var(--text-secondary)' }}
                  className="leading-relaxed"
                >
                  {lodging.description}
                </p>
              )}

              {/* Highlights */}
              {lodging.highlights && lodging.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lodging.highlights.map((h, i) => renderHighlight(h, i))}
                </div>
              )}

              {/* Check-in/Check-out */}
              <CheckInOutCard lodging={lodging} />
            </div>

            {/* Quick Info Sidebar */}
            <div
              className="rounded-xl p-6 h-fit"
              style={{
                background: 'var(--brand-light)',
                border: '1px solid color-mix(in srgb, var(--brand) 40%, transparent)',
              }}
            >
              <h3
                className="font-semibold mb-4"
                style={{ color: 'var(--brand)' }}
              >
                📍 Details
              </h3>
              <div className="space-y-3 text-sm">
                {lodging.address && (
                  <div>
                    <div className="font-medium" style={{ color: 'var(--brand)' }}>
                      Address
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {lodging.address}
                    </div>
                  </div>
                )}
              </div>

              {lodging.bookingUrl && (
                <div
                  className="mt-6 pt-4"
                  style={{
                    borderTop: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
                  }}
                >
                  <BookingButton lodging={lodging} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location & Address */}
        {lodging.address && (
          <>
            <div className="card">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-4"
                style={{ background: 'var(--brand-light)' }}
              >
                📍
              </div>
              <h3 className="font-display text-xl font-semibold mb-4">
                Location
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>
                  Address:
                </strong>{" "}
                {lodging.address}
              </p>
            </div>

            {/* Location Map */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-display text-2xl font-semibold mb-4">
                  🗺️ Explore the Location
                </h3>
              </div>
              <div className="h-[300px] md:h-[500px]">
                <GoogleMapsWidget address={lodging.address} height="100%" />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Multiple lodgings: card-per-property ──
  return (
    <div className="container space-y-12 animate-fade-in px-4 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <div className="badge badge-primary mb-4">🏨 Stay Info</div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
          Where We&apos;re <span className="text-gradient">Staying</span>
        </h1>
        <p
          className="text-lg max-w-2xl mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          {lodgings.length} properties for our {tripName} trip.
        </p>
      </div>

      {/* Property Cards */}
      <div className="space-y-12">
        {lodgings.map((lodging, index) => (
          <LodgingCard key={index} lodging={lodging} index={index} />
        ))}
      </div>
    </div>
  );
}
