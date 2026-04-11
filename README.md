# Prep Tracker Workspace

This repo contains a local-first interview prep tracker focused on:

- Uber-targeted LeetCode practice
- frontend interview question bank study
- system design notes
- spaced repetition, goals, and daily planning

The main app lives in `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker`.

## Quick start

From `/Users/rishabhbansal/Desktop/source/journey/uber-ai`:

```bash
source ~/.nvm/nvm.sh
nvm use 20.20.0
npm install
npm run tracker:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Core commands

From `/Users/rishabhbansal/Desktop/source/journey/uber-ai`:

```bash
npm run tracker:dev
npm run tracker:build
npm run tracker:lint
npm run tracker:reset
```

## Repo structure

- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker` — Next.js app
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/frontend-bank` — curated frontend bank manifest
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/imports` — ranked LeetCode import inputs
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/prep/content/system-design` — system design markdown library
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/prep/references` — research notes and source material

## Local data policy

This branch is meant to be safe to publish:

- runtime SQLite files are local-only
- personal progress is not committed
- the app reseeds itself from the checked-in bank manifests and markdown sources

Local runtime files are ignored under:

- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/prep.db`
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/prep.db-shm`
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/prep.db-wal`
- `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/data/recovery-backups`

## More docs

- App quickstart and usage: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/apps/prep-tracker/README.md:1`
- Agent instructions: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/AGENTS.md:1`
- Architectural context: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/CONTEXT.md:1`
- Chrome AI product-review prompt: `/Users/rishabhbansal/Desktop/source/journey/uber-ai/prep/prompts/chrome-ai-product-lead-review.md:1`
