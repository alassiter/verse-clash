# Verse Clash

A remote party game: teams sift a shared pile of word tiles onto a team board, magnet-poetry style, then face off head-to-head with the room voting a winner, bracket-style across the whole session.

This is a redesign in progress. [`docs/redesign-concept.md`](docs/redesign-concept.md) has the full design reasoning and open questions; [`PLAN.md`](PLAN.md) tracks what's actually built vs. still to build; [`CONTEXT.md`](CONTEXT.md) has the vocabulary. The word/prompt content pack has been updated for the redesign; the game loop itself still runs the older dealt-5-options/template flow until the rebuild lands.

The live game never calls an LLM (once AI removal from the runtime lands — see `PLAN.md`). You author prompts and word banks under `content/`.

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

## Production

When you are ready to host a real room, run the production wizard. It walks through the Supabase project, Anonymous sign-ins, the schema migration, and a Vercel deploy. Secrets are written to gitignored `.env.local` and to Vercel Environment Variables — never committed.

```bash
./scripts/prepare-production.sh
```

You can stop with Ctrl-C and re-run; it keeps values already in `.env.local`.

## Content packs

See [`content/README.md`](content/README.md). A 2–4 player sample pack ships in `content/*.json`. The word bank and prompt pack are already sized up for the redesign (1,600+ words including connector/filler tiles, 45 prompts); `templates.json`/`slots.json` are on hold pending the board-grammar decision in `docs/redesign-concept.md`. Validate without a room:

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
