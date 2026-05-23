# F1 Montreal — May 21–25, 2026

A small Next.js site (App Router, TypeScript, Tailwind) for event details, things to do, and a Travel Notes form stored in Vercel Postgres.

## Development

```bash
pnpm install
pnpm dev
```

## Environment

Travel Notes API uses Vercel Postgres. In Vercel, add the Postgres integration and expose the following env vars locally (or use `vercel env pull`):

- POSTGRES_URL
- POSTGRES_PRISMA_URL (optional)
- POSTGRES_URL_NON_POOLING (optional)
- POSTGRES_USER
- POSTGRES_HOST
- POSTGRES_PASSWORD
- POSTGRES_DATABASE

Locally you can create a `.env.local` with at least:

```
POSTGRES_URL=...
```

## Deploy

Push to GitHub and import the repo in Vercel. Set the env var(s), then deploy. The Travel Notes table is created automatically on first submission.