import Link from "next/link";
import PhotoCarousel from "../../components/PhotoCarousel";
import GoogleMapsWidget from "../../components/GoogleMapsWidget";
import { getConfig, Lodging } from "@/lib/config";

function normalizeImageUrls(urls: string[] | string | undefined): string[] {
  if (!urls) return [];
  if (typeof urls === 'string') return urls.split(',').map(u => u.trim()).filter(Boolean);
  return urls;
}

function LodgingCard({ lodging, index }: { lodging: Lodging; index: number }) {
  const photos = normalizeImageUrls(lodging.imageUrls).map((url, i) => ({
    id: `${index}-${i}`,
    url,
    caption: `${lodging.name} — Photo ${i + 1}`,
  }));

  return (
    <div className="card space-y-6">
      {/* Photo Carousel or Fallback */}
      {photos.length > 0 ? (
        <PhotoCarousel photos={photos} />
      ) : (
        <div
          className="relative w-full h-48 rounded-xl overflow-hidden flex items-end"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            className="w-full px-4 py-3"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}
          >
            <span className="text-white font-semibold text-lg drop-shadow">{lodging.name}</span>
          </div>
        </div>
      )}

      {/* Property Info */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <h2 className="font-display text-2xl font-semibold mb-4">
            {lodging.name}
          </h2>
          {lodging.description && (
            <p
              style={{ color: "var(--text-secondary)" }}
              className="leading-relaxed mb-4"
            >
              {lodging.description}
            </p>
          )}

          {/* Highlights */}
          {lodging.highlights && lodging.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {lodging.highlights.map((h, i) => (
                <span key={i} className="badge badge-primary text-sm">
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Check-in / Check-out */}
          {(lodging.checkIn || lodging.checkOut) && (
            <div
              className="grid grid-cols-2 gap-4 py-4"
              style={{
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {lodging.checkIn && (
                <div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--brand)" }}
                  >
                    Check-in
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {lodging.checkIn}
                  </div>
                </div>
              )}
              {lodging.checkOut && (
                <div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--brand)" }}
                  >
                    Check-out
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    {lodging.checkOut}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Info Sidebar */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--brand-light)",
            border:
              "1px solid color-mix(in srgb, var(--brand) 40%, transparent)",
          }}
        >
          <h3 className="font-semibold mb-4" style={{ color: "var(--brand)" }}>
            📍 Details
          </h3>
          <div className="space-y-3 text-sm">
            {lodging.address && (
              <div>
                <div className="font-medium" style={{ color: "var(--brand)" }}>
                  Address
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  {lodging.address}
                </div>
              </div>
            )}
          </div>

          {lodging.bookingUrl && (
            <div
              className="mt-6 pt-4"
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--brand) 30%, transparent)",
              }}
            >
              <a
                href={lodging.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full text-sm"
              >
                View Listing
              </a>
            </div>
          )}
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

export default async function StayInfo() {
  const config = await getConfig();
  const tripName = config?.tripName ?? "Our Trip";
  const lodgings = config?.lodgings ?? [];

  // No lodgings configured
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
            style={{ color: "var(--text-primary)" }}
          >
            No lodging added yet
          </h2>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            Add your first property in Settings.
          </p>
          <Link href="/settings" className="primary-cta-button-small">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // Single lodging — full-page layout
  if (lodgings.length === 1) {
    const lodging = lodgings[0];
    const photos = normalizeImageUrls(lodging.imageUrls).map((url, i) => ({
      id: String(i + 1),
      url,
      caption: `${lodging.name} — Photo ${i + 1}`,
    }));

    return (
      <div className="container space-y-12 animate-fade-in px-4 sm:px-6">
        {/* Header */}
        <div className="text-center">
          <div className="badge badge-primary mb-4">🏨 Stay Info</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Our <span className="text-gradient">Home Base</span>
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Everything you need to know about where we&apos;re staying.
          </p>
        </div>

        {/* Photo Carousel or Fallback */}
        {photos.length > 0 ? (
          <div className="animate-fade-in">
            <PhotoCarousel photos={photos} />
          </div>
        ) : (
          <div
            className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden flex items-end animate-fade-in"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="w-full px-6 py-4"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}
            >
              <span className="text-white font-display font-semibold text-2xl drop-shadow">{lodging.name}</span>
            </div>
          </div>
        )}

        {/* Property Overview */}
        <div className="card">
          <div className="grid lg:grid-cols-[1fr_300px] gap-8">
            <div>
              <h2 className="font-display text-2xl font-semibold mb-4">
                {lodging.name}
              </h2>
              <div className="space-y-4">
                {lodging.description && (
                  <p
                    style={{ color: "var(--text-secondary)" }}
                    className="leading-relaxed"
                  >
                    {lodging.description}
                  </p>
                )}

                {/* Highlights */}
                {lodging.highlights && lodging.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {lodging.highlights.map((h, i) => (
                      <span key={i} className="badge badge-primary text-sm">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info Card */}
            <div
              className="rounded-xl p-6"
              style={{
                background: "var(--brand-light)",
                border:
                  "1px solid color-mix(in srgb, var(--brand) 40%, transparent)",
              }}
            >
              <h3
                className="font-semibold mb-4"
                style={{ color: "var(--brand)" }}
              >
                📅 Dates
              </h3>
              <div className="space-y-3 text-sm">
                {lodging.checkIn && (
                  <div>
                    <div
                      className="font-medium"
                      style={{ color: "var(--brand)" }}
                    >
                      Check-in
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {lodging.checkIn}
                    </div>
                  </div>
                )}
                {lodging.checkOut && (
                  <div>
                    <div
                      className="font-medium"
                      style={{ color: "var(--brand)" }}
                    >
                      Check-out
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {lodging.checkOut}
                    </div>
                  </div>
                )}
              </div>

              {lodging.bookingUrl && (
                <div
                  className="mt-6 pt-4"
                  style={{
                    borderTop:
                      "1px solid color-mix(in srgb, var(--brand) 30%, transparent)",
                  }}
                >
                  <a
                    href={lodging.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary w-full text-sm"
                  >
                    View Listing
                  </a>
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
                style={{ background: "var(--brand-light)" }}
              >
                📍
              </div>
              <h3 className="font-display text-xl font-semibold mb-4">
                Location
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>
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

  // Multiple lodgings — card-per-property layout
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
          style={{ color: "var(--text-secondary)" }}
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
