# AGENTS

This file applies to the full repo rooted at `/Users/rishabhbansal/Desktop/source/journey/uber-ai`.

## Product shape

- The primary product is the local-first prep tracker in `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker`.
- This branch intentionally keeps the app simple:
  - local SQLite only
  - no auth
  - no Supabase
  - no Netlify/deployment wiring

## Working rules

- Do not commit runtime data or personal progress.
- Treat these as local-only artifacts:
  - `apps/prep-tracker/data/prep.db`
  - `apps/prep-tracker/data/prep.db-shm`
  - `apps/prep-tracker/data/prep.db-wal`
  - `apps/prep-tracker/data/recovery-backups`
- Keep changes focused and reversible.
- Prefer improving checked-in manifests and markdown sources over hand-editing generated runtime state.

## Local development

- Use Node `20.20.0`.
- Main commands from repo root:
  - `npm run tracker:dev`
  - `npm run tracker:build`
  - `npm run tracker:lint`
  - `npm run tracker:reset`

## Architecture pointers

- Storage entrypoint: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/src/lib/storage.ts`
- SQLite implementation: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/src/lib/local-storage.ts`
- Frontend bank manifest: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/frontend-bank/uber-frontend-bank.json`
- Ranked import inputs: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/imports/uber-ranked-slugs-2026-03-13.json`
- System design markdown source: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/prep/content/system-design`

## Validation expectations

- Run focused lint/build checks when changing app code.
- If you need a fresh seeded workspace, reset the DB instead of committing a database file.
- If a change affects seeded content, verify by starting the app on a clean SQLite database.
