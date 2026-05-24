# Contributing to Vacation Hub

Thanks for your interest in contributing! This project is designed to be forked and customized, but improvements to the core are welcome.

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies: `pnpm install`
3. Pull env vars from Vercel (`vercel env pull`) or create `.env.local`:
   ```
   POSTGRES_URL=<your-postgres-url>
   BLOB_READ_WRITE_TOKEN=<your-blob-token>
   VACATION_HUB_SECRET=<output of openssl rand -hex 32>
   ```
4. Run the dev server: `pnpm dev`
5. Open `http://localhost:3000` — the setup wizard will guide you through initial config

## Development

- **Package manager**: pnpm (do not use npm or yarn)
- **Framework**: Next.js 15 with App Router and TypeScript
- **Styling**: Tailwind CSS v4 with CSS custom properties for theming
- **Database**: Vercel Postgres via `@vercel/postgres` tagged template literals (parameterized queries only — never concatenate SQL strings)

### Project Structure

```
app/                    # Next.js App Router pages and API routes
  api/                  # API endpoints (auth, activities, itinerary, photos, etc.)
  setup/                # Setup wizard
  password/             # Password gate
components/             # React components (client and server)
lib/                    # Shared utilities
  auth.ts               # Auth token creation/verification, rate limiting
  config.ts             # VacationConfig type, getConfig/saveConfig
  crypto.ts             # AES-256-GCM encryption for API keys at rest
  db.ts                 # Database types and CRUD functions
  llm.ts                # LLM integration (OpenAI, Anthropic, Gemini)
  validate.ts           # Input validation and sanitization
middleware.ts           # Edge middleware (auth gates, setup check)
```

### Key Conventions

- All data-mutating API routes validate input via `lib/validate.ts`
- All pages reading config use `export const dynamic = 'force-dynamic'`
- The `vacation_config` table stores a single JSONB row that drives the entire site
- Sensitive fields (password hash, encrypted API key) are never returned to clients
- Auth tokens are HMAC-signed with expiry; setup cookie is also HMAC-signed

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes — keep commits small and focused
3. Run `pnpm build` to verify the build passes
4. Open a PR with a clear description of what changed and why

## Reporting Issues

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/device info if it's a UI issue

## Code of Conduct

Be kind and constructive. This is a side project for helping people plan group trips together.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
