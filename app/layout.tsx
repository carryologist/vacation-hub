import type { Metadata } from "next";
import { Inter, Chakra_Petch } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import MobileNavigation from "../components/MobileNavigation";
import { getConfig } from "@/lib/config";

const DEFAULT_BRAND_COLOR = "#f97316";

function sanitizeCssColor(color: string): string {
  if (typeof color !== "string" || color.length === 0) {
    return DEFAULT_BRAND_COLOR;
  }

  // Reject any string containing dangerous characters
  if (/[<>{};\/\\()"']/.test(color)) {
    return DEFAULT_BRAND_COLOR;
  }

  // Allow hex colors: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    return color;
  }

  // Allow simple CSS named colors (lowercase alpha only)
  const namedColors = new Set([
    "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure",
    "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood",
    "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan",
    "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
    "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon",
    "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet",
    "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue",
    "firebrick", "floralwhite", "forestgreen", "fuchsia",
    "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey",
    "honeydew", "hotpink",
    "indianred", "indigo", "ivory",
    "khaki",
    "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
    "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink",
    "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey",
    "lightsteelblue", "lightyellow", "lime", "limegreen", "linen",
    "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
    "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred",
    "midnightblue", "mintcream", "mistyrose", "moccasin",
    "navajowhite", "navy",
    "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid",
    "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
    "peru", "pink", "plum", "powderblue", "purple",
    "rebeccapurple", "red", "rosybrown", "royalblue",
    "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver",
    "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue",
    "tan", "teal", "thistle", "tomato", "turquoise",
    "violet",
    "wheat", "white", "whitesmoke",
    "yellow", "yellowgreen",
  ]);

  if (namedColors.has(color.toLowerCase())) {
    return color.toLowerCase();
  }

  return DEFAULT_BRAND_COLOR;
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();

  const title = config
    ? `${config.tripName} — ${config.startDate} – ${config.endDate}`
    : "Vacation Hub";
  const description = config
    ? `Group trip to ${config.destination}. ${config.startDate} – ${config.endDate}.`
    : "Group Vacation Planning Hub";
  const ogImage = config?.heroImageUrl;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "any" }],
      shortcut: "/favicon.ico",
    },
    openGraph: {
      title: config?.tripName ?? "Vacation Hub",
      description,
      type: "website",
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                width: 1200,
                height: 630,
                alt: config?.tripName ?? "Vacation Hub",
              },
            ],
          }
        : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getConfig();

  // If setup isn't done, render children in a minimal wrapper (middleware redirects to /setup)
  if (!config) {
    return (
      <html lang="en" className={`${inter.variable} ${chakraPetch.variable}`}>
        <body className="antialiased bg-primary text-primary">
          {children}
        </body>
      </html>
    );
  }

  const tripName = config.tripName || "Vacation Hub";
  const dateRange = `${config.startDate} – ${config.endDate}`;

  return (
    <html lang="en" className={`${inter.variable} ${chakraPetch.variable}`}>
      <head>
        <style>{`:root { --brand: ${sanitizeCssColor(config.brandColor)}; --brand-light: ${sanitizeCssColor(config.brandColor)}15; --brand-glow: ${sanitizeCssColor(config.brandColor)}40; }`}</style>
      </head>
      <body className="antialiased bg-primary text-primary">
        {/* Navigation */}
        <header
          className="sticky top-0 z-50 backdrop-blur-md"
          style={{
            background:
              "color-mix(in srgb, var(--bg-primary) 85%, transparent)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <nav className="container flex items-center justify-between py-4">
            <Link
              href="/"
              className="flex items-center gap-3 font-display text-xl font-semibold text-gradient hover:scale-105 transition-transform"
            >
              {tripName}
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <ThemeToggle />
              <Link href="/" className="nav-link">
                Home
              </Link>
              <Link href="/stay" className="nav-link">
                Stay
              </Link>
              <Link href="/things-to-do" className="nav-link">
                Things to Do
              </Link>
              <Link href="/photos" className="nav-link">
                Photos
              </Link>
              <Link href="/itinerary" className="nav-link">
                Schedule
              </Link>
              <Link href="/travel-notes" className="nav-link">
                Travel
              </Link>
              <Link
                href="/settings"
                className="nav-link"
                title="Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
            </div>
            <MobileNavigation />
          </nav>
        </header>

        {/* Main Content */}
        <main className="min-h-screen bg-primary">
          <div className="py-8">{children}</div>
        </main>

        {/* Footer */}
        <footer style={{ background: "var(--bg-card)" }}>
          <div
            className="h-1"
            style={{
              background: `linear-gradient(90deg, var(--brand), color-mix(in srgb, var(--brand) 60%, #ffa033))`,
            }}
          />

          <div className="container py-8">
            {/* Main footer row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Logo + name */}
              <Link
                href="/"
                className="flex items-center gap-2 font-display text-lg font-semibold text-gradient"
              >
                {tripName}
              </Link>

              {/* Nav links */}
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
                <Link href="/stay" className="nav-link text-sm">
                  Stay
                </Link>
                <Link href="/things-to-do" className="nav-link text-sm">
                  Things to Do
                </Link>
                <Link href="/photos" className="nav-link text-sm">
                  Photos
                </Link>
                <Link href="/itinerary" className="nav-link text-sm">
                  Schedule
                </Link>
                <Link href="/travel-notes" className="nav-link text-sm">
                  Travel
                </Link>
                <Link href="/settings" className="nav-link text-sm">
                  Settings
                </Link>
              </div>

              {/* Date badge */}
              <div className="badge badge-primary">{dateRange}</div>
            </div>

            {/* Bottom credit line */}
            <div
              className="mt-6 pt-6 text-center"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <p className="text-sm text-muted">
                {tripName} · {dateRange}
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
