# 🏖️ Vacation Hub

A clone-and-customize group trip planning site. Fork it, deploy to Vercel, run through the setup wizard, and share the URL + password with your travel group.

No accounts. No subscriptions. One shared password. Your data stays in your own Vercel project.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcarryologist%2Fvacation-hub&env=VACATION_HUB_SECRET&envDescription=Generate%20with%3A%20openssl%20rand%20-hex%2032&project-name=vacation-hub&repository-name=vacation-hub)

## Features

- **Setup wizard** — 6-step guided setup: trip details, branding, lodging, password, AI activity generation, and launch
- **Itinerary calendar** — week grid on desktop, day list on mobile, drag-to-create events
- **PDF itinerary import** — upload a PDF and AI extracts events into the calendar
- **Things to Do** — AI-generated activity suggestions organized by category with OG image scraping
- **Travel notes** — shared board for flight info, arrival times, and logistics
- **Photo gallery** — upload and browse trip photos via Vercel Blob storage
- **Lodging info** — supports multiple properties with type-aware display (Airbnb, hotel, VRBO, etc.)
- **Countdown timer** — live countdown to trip start
- **Google Maps embed** — map of the destination
- **Dark mode** — system preference detection + manual toggle
- **Mobile-responsive** — works on all screen sizes
- **Settings page** — view config, "Start Over" to full-reset

## Quick Start

### 1. Fork & deploy

Click the **Deploy with Vercel** button above, or:

1. **Fork this repo** on GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your fork
3. Add the required environment variable before deploying:

   | Variable | How to generate |
   |---|---|
   | `VACATION_HUB_SECRET` | Run `openssl rand -hex 32` in any terminal |

4. Click **Deploy**

### 2. Add storage

Once deployed, go to your Vercel project dashboard:

1. **Storage** → Add **Postgres** (free tier) — auto-sets `POSTGRES_URL`
2. **Storage** → Add **Blob** (free tier) — auto-sets `BLOB_READ_WRITE_TOKEN`
3. **Deployments** → click **⋯** on the latest → **Redeploy** (picks up the new env vars)

### 3. Run the setup wizard

Visit your deployed URL. The wizard walks you through:

| Step | What you configure |
|---|---|
| **Basics** | Trip name, destination, dates |
| **Branding** | Brand color, hero image URL |
| **Lodging** | Property names, types, addresses, check-in/out details (supports multiple) |
| **Password** | Site-wide password (bcrypt hashed, never stored in plaintext) |
| **AI Generation** | Choose OpenAI, Anthropic, or Google Gemini → paste your API key → generate activity suggestions |
| **Review** | Confirm everything and launch |

### 4. Share

Send your group the URL and the password. That's it.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, TypeScript, Turbopack) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Database | [Vercel Postgres](https://vercel.com/storage/postgres) (`@vercel/postgres`) |
| File storage | [Vercel Blob](https://vercel.com/storage/blob) |
| Auth | bcryptjs (password hashing), HMAC-signed cookies, Edge middleware |
| Encryption | AES-256-GCM for LLM API keys at rest |
| AI | OpenAI (gpt-4o-mini), Anthropic (Claude Sonnet), or Google Gemini (2.0 Flash) |

## Environment Variables

| Variable | Source | Required | Description |
|---|---|---|---|
| `VACATION_HUB_SECRET` | You generate it | **Yes** | Used for auth token signing, cookie signing, and API key encryption. Generate with `openssl rand -hex 32`. |
| `POSTGRES_URL` | Vercel Postgres integration | **Yes** | Database connection string. Auto-set when you add Postgres storage. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob integration | **Yes** | Token for photo uploads. Auto-set when you add Blob storage. |
| `OPENAI_API_KEY` | Optional env var | No | If set, used instead of the wizard-configured key for OpenAI calls. |
| `ANTHROPIC_API_KEY` | Optional env var | No | If set, used instead of the wizard-configured key for Anthropic calls. |
| `GEMINI_API_KEY` | Optional env var | No | If set, used instead of the wizard-configured key for Gemini calls. |

## Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/vacation-hub.git
cd vacation-hub

# Install dependencies
pnpm install

# Pull env vars from your Vercel project (recommended)
vercel env pull

# Or create .env.local manually:
# POSTGRES_URL=<your-postgres-url>
# BLOB_READ_WRITE_TOKEN=<your-blob-token>
# VACATION_HUB_SECRET=<openssl rand -hex 32>

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The setup wizard runs on first visit.

## Project Structure

```
app/                        # Next.js App Router
  api/                      # API routes
    auth/                   #   Password authentication
    activities/             #   Activity CRUD
    itinerary/              #   Calendar events CRUD
      batch/                #   Batch event creation (PDF import)
      parse/                #   PDF → LLM → parsed events
    photos/                 #   Photo metadata CRUD
      upload/               #   Vercel Blob upload handler
    og-image/               #   OG image scraper for activity cards
    setup/                  #   Setup wizard config + AI generation
    travel-notes/           #   Travel notes CRUD
    db/init/                #   Database schema initialization
  setup/                    # Setup wizard page
  password/                 # Password gate page
  stay/                     # Lodging info page
  things-to-do/             # Activity suggestions page
  itinerary/                # Calendar/schedule page
  travel-notes/             # Travel notes page
  photos/                   # Photo gallery page
  settings/                 # Settings + reset page
components/                 # React components
lib/                        # Shared utilities
  auth.ts                   #   Token creation/verification, rate limiting helpers
  config.ts                 #   VacationConfig type, DB read/write
  crypto.ts                 #   AES-256-GCM encryption
  db.ts                     #   Database types and CRUD
  llm.ts                    #   LLM integration (OpenAI, Anthropic, Gemini)
  validate.ts               #   Input validation and sanitization
middleware.ts               # Edge middleware (auth + setup gates)
```

## Security

This project takes security seriously for a shared trip planning site:

- **Password hashing** — bcrypt with cost factor 10
- **Auth tokens** — HMAC-SHA256 signed with random nonce, expiry-checked, timing-safe comparison
- **API key encryption** — AES-256-GCM at rest in the database
- **Middleware auth** — all API routes and pages require authentication (except login and initial setup)
- **Input validation** — all data-mutating routes validate and sanitize input, HTML tags stripped
- **SSRF protection** — OG image scraper blocks private IPs, localhost, and internal hostnames
- **Rate limiting** — password endpoint locks out after 10 failed attempts per IP (15 min)
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Signed cookies** — both auth and setup-done cookies are HMAC-signed to prevent forgery
- **No secrets in client bundles** — password hash and encrypted API key never sent to the browser

## Customization

After forking, you can customize:

- **Branding** — change colors, hero image, trip name via the setup wizard (no code changes needed)
- **Categories** — edit the activity category list in `lib/validate.ts` and `lib/llm.ts`
- **Styling** — modify CSS custom properties in `app/globals.css` or Tailwind config
- **LLM prompts** — adjust activity generation and itinerary parsing prompts in `lib/llm.ts`
- **Pages** — add/remove pages in `app/` and update navigation in `app/layout.tsx`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License

[MIT](LICENSE)
