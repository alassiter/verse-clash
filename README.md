# Verse Clash

A remote party-game prototype for Round 1: hidden word choices, assembled workplace-safe compositions, a shared reveal, Crowd Favorite, and a light team tally.

The live game never calls an LLM. You author prompts, templates, and word banks under `content/`.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a room, share the 6-character code or `/room/CODE` URL, and play. The host board lives at `/room/CODE/host`.

Identity is a cookie, not an account. Refreshing the page restores the same person in the same room.

This dev loop keeps game state in server memory, which is enough for a local table. It will not survive multiple serverless instances or a process restart.

## Supabase (optional, for a hosted room)

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

In the Supabase project:

1. Enable **Anonymous** sign-ins (Authentication → Providers → Anonymous).
2. Run `supabase/migrations/20260818120000_game_schema.sql`.

Mutations still go through Next.js server actions. The migration defines tables, RLS, and Realtime publication so a later persistence adapter can map the in-memory room aggregate onto Postgres.

## Content packs

See [`content/README.md`](content/README.md). A 2–4 player sample pack ships in `content/*.json`. Grow those files for a 44-player session (11 slots per template, larger word banks). Validate without a room:

```bash
npx vitest run tests/content
```

## Tests

Two seams only, as locked in the spec:

- Content-pack validator (`tests/content`)
- Room command API (`tests/game`) — player/host snapshots, no React or SQL

```bash
npm test
npm run typecheck
```
