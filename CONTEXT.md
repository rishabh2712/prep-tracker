# Repo Context

## What this branch is

This branch is a cleaned, local-only version of the prep tracker intended to be easy to share with friends.

Design goals:

- easy local startup
- no login/auth friction
- no hosted service dependency
- curated shared content checked into git
- personal progress stored only in local SQLite

## App architecture

The tracker is a single Next.js app in `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker`.

High-level flow:

1. Next.js route handlers call `/src/lib/storage.ts`
2. `storage.ts` re-exports the local SQLite implementation from `/src/lib/local-storage.ts`
3. On first run, SQLite is created and seeded from checked-in manifests and markdown docs
4. UI reads/writes through the app’s own API routes

## Seed sources

The default local database is created from:

- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/frontend-bank/uber-frontend-bank.json`
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/imports/uber-ranked-slugs-2026-03-13.json`
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/prep/content/system-design/*.md`

## Main user surfaces

- `/` — daily workspace / prep flow
- `/frontend` — curated frontend bank
- `/bank` — canonical problem bank
- `/goals` — goal planning and pacing
- `/items/:id` — item detail, notes, review logging

## Data model summary

SQLite tables cover:

- `items`
- `review_logs`
- `change_logs`
- `item_docs`
- `goals`
- `goal_items`
- `goal_days`
- `goal_day_entries`
- `goal_targets`
- `goal_sessions`

## Important operating assumptions

- The checked-in repo content is the shared curriculum.
- The local SQLite DB is disposable and reconstructable.
- Personal notes, marks, and review history should stay local unless intentionally exported later.
- If the bank ever looks inconsistent, the intended reset path is `npm run tracker:reset` followed by `npm run tracker:dev`.
