# Prep Tracker

Local interview prep workspace for:
- Uber-ranked LeetCode practice
- Frontend interview question bank
- System design notes and markdown write-ups
- Goal planning, review logs, and spaced repetition

This branch is intentionally simple:
- local SQLite only
- no auth
- no Supabase / Netlify / deployment setup
- seeded automatically on first run
- safe to publish without personal progress

## Start locally

From the repo root:

```bash
source ~/.nvm/nvm.sh
nvm use 20.20.0
npm install
npm run tracker:dev
```

Open:

- `http://localhost:3000`

## Reset the local database

If you want a fresh seeded workspace:

```bash
npm run tracker:reset
npm run tracker:dev
```

The app will recreate `apps/prep-tracker/data/prep.db` and re-seed it automatically.

## Publish-safe local data

Runtime progress stays local and should not be committed.

Ignored runtime artifacts:

- `apps/prep-tracker/data/prep.db`
- `apps/prep-tracker/data/prep.db-shm`
- `apps/prep-tracker/data/prep.db-wal`
- `apps/prep-tracker/data/recovery-backups`

## What gets seeded automatically

On the first run, the app bootstraps SQLite from:

- `apps/prep-tracker/data/frontend-bank/uber-frontend-bank.json`
- `apps/prep-tracker/data/imports/uber-ranked-slugs-2026-03-13.json`
- `prep/content/system-design/*.md`

It also creates one default local goal:

- `Uber 60 Day Sprint`

## Local storage

Runtime data is stored in:

- `apps/prep-tracker/data/prep.db`

The SQLite layer lives in:

- `apps/prep-tracker/src/lib/local-storage.ts`

`apps/prep-tracker/src/lib/storage.ts` is just a thin re-export to keep the rest of the app unchanged.

## Useful commands

From the repo root:

```bash
npm run tracker:dev
npm run tracker:build
npm run tracker:lint
npm run tracker:reset
```

From `apps/prep-tracker`:

```bash
npm run dev
npm run build
npm run lint
npm run reset:db
```

## Main routes

- `/` — workspace
- `/frontend` — frontend bank
- `/bank` — master bank
- `/goals` — goal list
- `/items/new` — create a new item

## Notes

- There is no login flow on this branch. `/login`, `/signup`, and related auth routes just bounce back to `/`.
- `better-sqlite3` is configured as a server external package in `apps/prep-tracker/next.config.ts`.
- If the bank looks wrong after local edits, reset the DB and restart the app.
- For repo-level docs, see `/Users/rishabhbansal/Desktop/source/journey/uber-ai/README.md:1`, `/Users/rishabhbansal/Desktop/source/journey/uber-ai/AGENTS.md:1`, and `/Users/rishabhbansal/Desktop/source/journey/uber-ai/CONTEXT.md:1`.
