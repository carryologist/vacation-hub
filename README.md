# Vacation Hub

A clone-and-customize group vacation planning site. Deploy your own instance, run through the setup wizard, and share the URL + password with your travel group.

Built with Next.js 15, Tailwind CSS v4, and Vercel Postgres + Blob.

## Quick Start

1. **Clone the repo**

   ```bash
   git clone <your-fork-url>
   cd vacation-hub
   ```

2. **Deploy to Vercel**

   Connect the repo to a Vercel project and add the **Postgres** and **Blob** storage integrations. This auto-sets `POSTGRES_URL` and `BLOB_READ_WRITE_TOKEN`.

3. **Set the secret**

   Add one environment variable in your Vercel project settings:

   ```
   VACATION_HUB_SECRET=<value>
   ```

   Generate it with:

   ```bash
   openssl rand -hex 32
   ```

4. **Visit your site** — the setup wizard walks you through configuring the trip.

5. **Share the URL + password** with your group.

## Setup Wizard

On first visit the wizard guides you through 6 steps:

| Step | What you configure |
|---|---|
| Basics | Trip name, destination, dates |
| Branding | Brand color, hero image URL |
| Lodging | Property names, addresses, details (supports multiple) |
| Password | Site-wide password (bcrypt hashed) |
| AI Generation | AI-powered activity suggestions — supports OpenAI, Anthropic, or Google Gemini |
| Review | Confirm everything and launch |

## Features

- **Itinerary calendar** — week grid on desktop, day list on mobile
- **Travel notes** — shared notes board for the group
- **Things to Do** — AI-generated activity suggestions organized by category
- **Photo gallery** — upload photos via Vercel Blob
- **Lodging info** — details for one or more properties
- **Countdown timer** — days until the trip starts
- **Google Maps embed** — map of the destination
- **Dark mode** — system preference detection
- **Mobile-responsive** — works on all screen sizes
- **Settings page** — view current config, "Start Over" to full-reset the site

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | Vercel Postgres (`@vercel/postgres`) |
| File storage | Vercel Blob |
| Auth | bcryptjs (password hashing), cookie-based sessions |
| Encryption | AES-256-GCM for API keys at rest |

## Environment Variables

| Variable | Source | Description |
|---|---|---|
| `POSTGRES_URL` | Auto-set by Vercel Postgres integration | Database connection string |
| `BLOB_READ_WRITE_TOKEN` | Auto-set by Vercel Blob integration | Token for file uploads |
| `VACATION_HUB_SECRET` | **You must set this** | Used for API key encryption and auth cookie signing. Generate with `openssl rand -hex 32` |

## Local Development

Pull env vars from your Vercel project:

```bash
vercel env pull
```

Or create `.env.local` manually with the three variables above.

Then:

```bash
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:3000` with Turbopack.

## License

MIT
