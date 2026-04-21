# Foosball ELO

A small internal web app for logging 2v2 foosball matches and tracking
individual ELO ratings. Next.js 14 + Supabase + Tailwind.

## Setup

```bash
pnpm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY
```

### Apply the database migration

Supabase JS doesn't expose raw SQL, so the schema is applied once by hand:

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
   for your project.
2. Paste the contents of `supabase/migrations/0001_init.sql` and run it.

The migration is idempotent; re-running it is safe.

### Seed the database

```bash
pnpm seed
```

Inserts six players and fifteen matches so the leaderboard isn't empty on
first load. Wipes existing rows first, so don't run this against real data.

### Develop

```bash
pnpm dev      # http://localhost:3000
pnpm test     # vitest
pnpm build    # production build
```

## How it works

- **Rating engine** (`src/lib/elo.ts`) is a pure function. No I/O, no globals.
  It takes the current player states and a match input, returns updated states
  and per-player history rows. Unit-tested in `src/lib/elo.test.ts`.
- **Rebuild** (`src/lib/rebuild.ts`) replays every match from the start. Called
  after back-dated inserts, edits, and deletes so the rating trail is never
  mutated in place.
- **Server Actions** own every write. The service-role client is only used on
  the server; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is used for read-only queries.
- **No auth in v1.** Every write action has a `// TODO: Supabase magic-link
  auth` marker where the session check will eventually live.

## Pages

| Route                | What lives there                                                 |
|----------------------|-------------------------------------------------------------------|
| `/`                  | Leaderboard, ranked by rating. `?inactive=1` shows inactive too. |
| `/matches/new`       | Log a new match. Redirects to `/?match=<id>` with a delta toast. |
| `/players/new`       | Add a player. Name only. Starts at 1200.                         |
| `/players/[id]`      | Profile: rating, rank, record, sparkline, last 20 matches.       |
| `/matches`           | History. Edit + delete actions rebuild downstream ratings.       |
| `/matches/[id]/edit` | Edit form. Save replays every subsequent match.                  |

## Design notes

- Monochrome only. Positive deltas show as `+X.XX`, negatives as `−X.XX`, both
  in the same grey.
- Inter for UI, JetBrains Mono for every number (ratings, scores, deltas, dates).
- Max content width 960px. Desktop-first.

## Rating math

See [`RATING_SYSTEM.md`](./RATING_SYSTEM.md) for the human-readable explanation
of how individual ELO is computed from 2v2 matches.
