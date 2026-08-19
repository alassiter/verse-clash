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

Without a configured Supabase project, room state lives in server memory, which is enough for a local table. It will not survive multiple serverless instances or a process restart — see "Supabase" below for the persistent version this app needs in production.

## Supabase (room persistence, required for a hosted room)

Room state (`lib/game/state.ts`'s `RoomState`) is stored as a single JSONB blob per room in a Supabase Postgres `rooms` table, with an optimistic-concurrency `version` column so concurrent writes from different serverless instances never clobber each other (see `withRoom` in `lib/game/commands.ts`). When Supabase env vars are absent, `lib/game/runtime.ts` falls back to the in-memory store automatically, so local dev works with zero setup.

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

In the Supabase project, run `supabase/migrations/20260818120000_game_schema.sql`. This table is only ever read/written by server actions using the service-role key, never by the browser, so it has no RLS policies — anon/authenticated access is explicitly revoked.

### Room cleanup

`app/api/cron/cleanup-rooms` deletes rooms that haven't been touched in 24 hours, keeping the free-tier database tidy. It's wired up as a daily [Vercel Cron Job](https://vercel.com/docs/cron-jobs) in `vercel.json`, and requires a `CRON_SECRET` env var (see `.env.example`) so only Vercel can trigger it.

## Production

When you are ready to host a real room, run the production wizard. It walks through the Supabase project, the schema migration, and a Vercel deploy. Secrets are written to gitignored `.env.local` and to Vercel Environment Variables — never committed.

```bash
./scripts/prepare-production.sh
```

You can stop with Ctrl-C and re-run; it keeps values already in `.env.local`.

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
