import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import Countdown from "../components/countdown";
import GoogleMapsWidget from "../components/GoogleMapsWidget";
import { getConfig } from "@/lib/config";

export default async function Home() {
  const config = await getConfig();

  if (!config) {
    redirect("/setup");
  }

  const {
    tripName,
    tagline,
    destination,
    startDate,
    endDate,
    heroImageUrl,
    lodgings,
  } = config;

  const firstAddress = lodgings?.[0]?.address ?? null;

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] md:min-h-[85vh] w-full overflow-hidden image-hero animate-fade-in">
        {heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt={`${tripName} — ${destination}`}
            fill
            priority
            className="object-cover object-center"
          />
        )}
        <div className="absolute inset-0 hero-overlay"></div>
        <div className="absolute inset-0 flex items-center justify-center hero-content py-8">
          <div className="text-center text-white px-6 max-w-4xl animate-slide-up">
            <div style={{ marginBottom: "3rem", marginTop: "2rem" }}>
              <div
                className="badge badge-white text-shadow font-display"
                style={{ letterSpacing: "0.05em" }}
              >
                {startDate} – {endDate} · {destination.toUpperCase()}
              </div>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4 text-shadow">
              {tripName}
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl opacity-95 mb-8 text-shadow max-w-3xl mx-auto">
              {tagline}
            </p>
            {/* Countdown */}
            <div className="mb-8">
              <Countdown targetDate={startDate} endDate={endDate} tripName={tripName} />
            </div>

            {/* Primary & Secondary CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/travel-notes" className="primary-cta-button">
                Share Your Travel Plan
              </Link>
              <Link href="/stay" className="secondary-cta-button">
                View Stay Info
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Planning Cards */}
      <section className="container animate-fade-in">
        <div className="text-center mb-12">
          <h2
            className="text-4xl font-bold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Plan Our Perfect{" "}
            <span className="text-gradient">Trip</span>
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Everything you need to make the most of your {destination} adventure
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Stay Info Tile */}
          <div
            className="feature-tile"
            style={{ borderTopColor: "var(--brand)" }}
          >
            <div
              className="w-3 h-3 rounded-full mb-6"
              style={{ backgroundColor: "var(--brand)" }}
            ></div>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Stay Info
            </h3>
            <p
              className="leading-relaxed mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Check out where we&apos;re staying, property details, photos, and
              location info.
            </p>
            <Link href="/stay" className="primary-cta-button-small">
              View Details
            </Link>
          </div>

          {/* Things to Do Tile */}
          <div
            className="feature-tile"
            style={{ borderTopColor: "#10b981" }}
          >
            <div
              className="w-3 h-3 rounded-full mb-6"
              style={{ backgroundColor: "#10b981" }}
            ></div>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Things to Do
            </h3>
            <p
              className="leading-relaxed mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Discover attractions, restaurants, and activities in {destination}.
            </p>
            <Link href="/things-to-do" className="primary-cta-button-small">
              Explore
            </Link>
          </div>

          {/* Photos Tile */}
          <div
            className="feature-tile"
            style={{ borderTopColor: "#8b5cf6" }}
          >
            <div
              className="w-3 h-3 rounded-full mb-6"
              style={{ backgroundColor: "#8b5cf6" }}
            ></div>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Photos
            </h3>
            <p
              className="leading-relaxed mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Share and browse photos from the trip. Upload from any device.
            </p>
            <Link href="/photos" className="primary-cta-button-small">
              View Gallery
            </Link>
          </div>

          {/* Schedule Tile */}
          <div
            className="feature-tile"
            style={{ borderTopColor: "#0ea5e9" }}
          >
            <div
              className="w-3 h-3 rounded-full mb-6"
              style={{ backgroundColor: "#0ea5e9" }}
            ></div>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Schedule
            </h3>
            <p
              className="leading-relaxed mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Plan the trip day by day with our interactive schedule builder.
            </p>
            <Link href="/itinerary" className="primary-cta-button-small">
              Build Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* Location Map Section */}
      {firstAddress && (
        <div className="container text-center mb-16">
          <h3
            className="font-display text-3xl font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Our <span className="text-gradient">Location</span>
          </h3>
          <p
            className="text-lg max-w-2xl mx-auto mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            Check out where we&apos;re staying in {destination}.
          </p>

          <GoogleMapsWidget address={firstAddress} height="300px" />
        </div>
      )}
    </div>
  );
}
