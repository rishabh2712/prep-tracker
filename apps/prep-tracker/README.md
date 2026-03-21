# Prep Tracker (Uber AI Interview Prep)

Multi-user interview prep tracker focused on:
- LeetCode execution and spaced revision
- System design mastery (core + Uber + AI/GenAI)
- Goal-based planning with reusable item banks
- Packet-driven prep support without rigid day lock-in
- Shared canonical bank + personal progress, notes, goals, and sessions

## What This App Solves

You keep one canonical **Master Bank** of questions/topics, then create one or more **Goals** (for example `Uber Prep 45D`) that select items from the bank.

For each goal, you can:
- Track completion progress against numeric targets.
- Configure target mix by pattern/concept/difficulty/company and monitor coverage.
- Run an execution queue for LeetCode and System Design.
- Use SM-2 style review actions (`AGAIN`, `HARD`, `GOOD`, `EASY`).
- Log execution sessions (solved/read/practice/review) without day-locking.
- Log notes and keep markdown docs for system design topics.

## Current Product Model

### 1) Master Bank
- `LeetCode Bank`
  - Company provenance pills and filters.
  - NeetCode-style grouping by pattern/category.
  - Canonical uniqueness by URL/slug/title.
- `System Design Bank`
  - Grouped by concept and level.
  - Includes:
    - Uber-focused topics
    - Web-researched interview prompts
    - AI/GenAI/Agent design prompts
    - Tutorial-track items from local `py-tutor` content

### 2) Goals
Each goal has:
- Date range and targets (`leetcodeTarget`, `systemDesignTarget`)
- Selected goal items (LC + SD)
- Progress snapshot (done/remaining/velocity/pace)
- Target-mix rows (`goal_targets`) for quality coverage
- Session logs (`goal_sessions`) to track actual execution time and throughput

### 3) Execution Planner (Goal detail)
No rigid day dependency for execution.
- `LeetCode Planner`
  - Grouped by pattern
  - Status controls: `TODO` / `DONE` / `REVIEW_NEXT`
  - `Reset to TODO`
  - Days since last done + revisit state (`DUE`, `UPCOMING`, `NONE`)
  - Packet auto-mapping references
- `System Design Planner`
  - Grouped/filtered by concept + level
  - Same status and revisit controls
  - `Reset to TODO`
  - Tutorial-only filter
- Session-backed completion actions
  - `Mark Done` creates a session event and updates item status
  - Progress tab shows recent sessions and time analytics

## Data Storage

### Runtime storage

- Auth: **Supabase Auth**
- Database: **Supabase Postgres**
- Hosting target: **Netlify**

The runtime model is:

- `content_items`
  - Shared canonical content from frontend-bank, Uber imports, and curated seeds
  - Private ad hoc items created by an individual user
- `user_item_state`
  - Personal review state, mastery, attempts, progress, and user-specific metadata
- `user_review_logs`
  - Per-user spaced-repetition history
- `user_item_docs`
  - Per-user markdown docs for system design and long-form notes
- `goals`, `goal_items`, `goal_days`, `goal_day_entries`, `goal_targets`, `goal_sessions`
  - Per-user planning and execution data

## Key API Surface

- Bank
  - `GET/POST /api/bank`
- Items
  - `GET/POST /api/items`
  - `GET/PATCH/DELETE /api/items/:id`
  - `POST /api/items/:id/restore`
  - `DELETE /api/items/:id/hard-delete`
  - `POST /api/items/:id/reviews`
- Goals
  - `GET/POST /api/goals`
  - `GET/PATCH /api/goals/:id`
  - `GET/POST/DELETE /api/goals/:id/items`
  - `GET /api/goals/:id/progress`
- Goal days (kept for compatibility / optional logging)
  - `GET /api/goals/:id/days`
  - `PATCH /api/goal-days/:dayId`
  - `POST/DELETE /api/goal-days/:dayId/entries`
- Goal targets
  - `GET/POST/PUT/DELETE /api/goals/:id/targets`
- Goal sessions
  - `GET/POST /api/goals/:id/sessions`
  - `DELETE /api/goals/:id/sessions/:sessionId`
- Packets
  - `GET /api/packets` (reads `prep/packets/day-XX.md`)

## Project Layout

- App code: `apps/prep-tracker/src`
  - Components: `apps/prep-tracker/src/components`
  - API routes: `apps/prep-tracker/src/app/api`
  - Auth helpers: `apps/prep-tracker/src/lib/auth`
  - Postgres repositories + façade: `apps/prep-tracker/src/lib/db` and `apps/prep-tracker/src/lib/storage.ts`
- Taxonomies:
    - `apps/prep-tracker/src/lib/leetcode-patterns.ts`
    - `apps/prep-tracker/src/lib/system-design-taxonomy.ts`
- Seed scripts: `apps/prep-tracker/scripts`
- Prep packets: `prep/packets`

## Start Locally

Recommended local flow for a fresh setup:

### Prerequisites

- Node `20.20.x`
- Docker Desktop running
- `npm install` already run at repo root

### 1) Install dependencies

From repo root:

```bash
cd /Users/rishabhbansal/Desktop/source/journey/uber-ai
source ~/.nvm/nvm.sh
nvm use 20.20.0 >/dev/null
npm install
```

### 2) Create local env

Copy `apps/prep-tracker/.env.example` to `apps/prep-tracker/.env.local`.

For local Supabase development, you can keep the file minimal and set only:

```bash
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
APP_BASE_URL=http://localhost:3000
SUPABASE_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
SEED_USER_EMAIL=you@example.com
SEED_USER_PASSWORD=change-me
SEED_USER_NAME=Prep Tracker Owner
```

The app and local scripts automatically fall back to the default local Supabase URL, anon key, service-role key, and database URL while `NODE_ENV` is not `production`.

### 3) Start local Supabase

From repo root:

```bash
cd /Users/rishabhbansal/Desktop/source/journey/uber-ai
source ~/.nvm/nvm.sh
nvm use 20.20.0 >/dev/null
npx supabase start
npx supabase db reset
```

Useful local URLs:

- App: `http://localhost:3000`
- Supabase Studio: `http://127.0.0.1:54323`
- Mailpit: `http://127.0.0.1:54324`

### 4) Load local data

From `apps/prep-tracker`:

```bash
cd /Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker
npm run seed:frontend:bank
```

This:

- seeds the curated frontend bank so `/frontend` is populated

### 5) Start the app

From repo root:

```bash
cd /Users/rishabhbansal/Desktop/source/journey/uber-ai
source ~/.nvm/nvm.sh
nvm use 20.20.0 >/dev/null
npm run tracker:dev
```

Then open `http://localhost:3000/signup` and create your local account.

If you want goal seed scripts such as `npm run seed:uber:60d` to attach data to that same account, set `SEED_USER_EMAIL` to the same email you sign up with first.

### Quick restart after first setup

Once the database has already been seeded:

```bash
cd /Users/rishabhbansal/Desktop/source/journey/uber-ai
source ~/.nvm/nvm.sh
nvm use 20.20.0 >/dev/null
npx supabase start
npm run tracker:dev
```

## Run Commands

From repo root:

```bash
npm run tracker:dev
npm run tracker:lint
npm run tracker:build
```

Or from app folder:

```bash
cd apps/prep-tracker
npm run dev
npm run lint
npm run build
```

## Environment Setup

Copy `apps/prep-tracker/.env.example` to `.env.local` inside `apps/prep-tracker` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
APP_BASE_URL=http://localhost:3000
SUPABASE_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
SEED_USER_EMAIL=
SEED_USER_PASSWORD=
SEED_USER_NAME=
```

For hosted or remote Supabase environments, fill every variable explicitly.
For local development against `supabase start`, the app can use built-in local fallbacks for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

Recommended project split:

- **Supabase dev project**
  - local development
  - Netlify Deploy Previews
- **Supabase prod project**
  - Netlify production site

## Supabase Setup

From repo root:

```bash
supabase start
supabase db reset
```

Or apply the committed SQL manually from:

- `supabase/migrations/20260321_000001_init_prep_tracker.sql`

The schema includes:

- shared content tables
- per-user progress + docs tables
- Supabase `profiles` sync trigger
- RLS policies for shared read / personal write isolation

## Auth Routes

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`

All app pages and API routes are protected by Supabase SSR session middleware, except auth routes and static assets.

## Netlify Deployment

Committed deployment scaffolding:

- `netlify.toml`
- `.nvmrc`
- `supabase/config.toml`

Netlify settings:

- Base directory: `apps/prep-tracker`
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `20.20.0`

Required Netlify env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `APP_BASE_URL`
- `SUPABASE_AUTH_REDIRECT_URL`

Suggested deployment workflow:

- feature branch → Netlify Deploy Preview → dev Supabase project
- `master` → Netlify production site → prod Supabase project

## Seed / Curation Commands

From `apps/prep-tracker`:

```bash
npm run seed:uber
npm run refine:uber:sd
npm run seed:sd:research
npm run seed:sd:tutorials
npm run seed:uber:60d
```

Scripts that seed shared bank content now talk directly to Supabase/Postgres instead of requiring the local Next.js server:

- `npm run seed:frontend:bank`
- `npm run import:uber:ranked`
- `npm run import:uber:lww`
- `npm run refine:uber:sd`
- `npm run seed:sd:research`
- `npm run seed:sd:tutorials`
- `npm run seed:uber`
- `npm run seed:uber:60d`

Those scripts require `DATABASE_URL`. Scripts that also attach items to goals require:

- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD` (only if the seed user does not exist yet)

What they do:
- `seed:uber`
  - Seeds Uber-centric LeetCode + SD bank and goal links.
- `refine:uber:sd`
  - Reclassifies Uber SD topics into easy/medium + concept metadata.
- `seed:sd:research`
  - Adds web-researched SD prompts (including AI/GenAI/agent topics) and links them to Uber goals.
- `seed:sd:tutorials`
  - Adds tutorial track items from local `py-tutor` docs and links them to Uber goals.
- `seed:uber:60d`
  - Resets existing goals for the configured seed user.
  - Seeds a single goal `Uber Staff 60D - Core+GenAI`.
  - Ensures the goal includes all 4 modules:
    - `LeetCode`
    - `System Design (backend core)`
    - `GenAI backend orchestration (RAG/KB)`
    - `GenAI frontend + LLD`
  - Sets track-aware goal targets with built-in spaced-review defaults.

## `py-tutor` Integration

Default tutorial source root:
- `/Users/rishabhbansal/Desktop/source/journey/py-tutor/system-design`

Override with env var when running tutorial seed:

```bash
PY_TUTOR_SYSTEM_DESIGN_ROOT=/custom/path npm run seed:sd:tutorials
```

## Web Research Provenance

System-design research seeding currently derives prompts from authoritative public references (documented inside the seed script metadata), including:
- `system-design-primer`
- known SD interview repositories
- Uber engineering references (e.g. H3)
- AI/Agent architecture references (OpenAI/Anthropic/LangGraph/cloud architecture docs)

Each seeded item stores source URLs in `metadata.sourceUrls`.

## Notes on Review Logic

- Review buttons log to review history and update next review by deterministic SM-2 logic.
- Session logging is independent of day plans and supports missed-day recovery.
- Planner status is interpreted from item state:
  - LeetCode:
    - `TODO` if not solved
    - `REVIEW_NEXT` if solved and `shouldReviewAgain=true`
    - `DONE` if solved and no review pending
  - System Design:
    - `TODO` if not `DONE`
    - `REVIEW_NEXT` if done and review pending
    - `DONE` otherwise

## Troubleshooting

- If `codex` shell command is missing, use npm scripts directly.
- If auth redirects point to `localhost` in production, verify `APP_BASE_URL` / `SUPABASE_AUTH_REDIRECT_URL` in Netlify.
- If migration cannot create the bootstrap user, verify `SUPABASE_SERVICE_ROLE_KEY` and `MIGRATION_BOOTSTRAP_*`.
- If runtime queries fail on Netlify, verify `DATABASE_URL` points at the correct Supabase project.
- If tutorial files are moved, update `PY_TUTOR_SYSTEM_DESIGN_ROOT` before running tutorial seed.
