# Uber Staff/Senior Prep Workspace

This workspace is structured for a 45-day interview sprint with daily packets and a measurable tracker.

Listing:
https://www.uber.com/global/zh-hk/careers/list/153753/

## Structure
- `packets/`: one file per day (`day-01.md` ... `day-45.md`)
- `code/`: interview prep code lanes (TypeScript primary, Go secondary)
- `tracker/`: CSV + markdown dashboard + weekly retro template
- `templates/`: reusable templates for daily packet and mocks
- `references/`: curated question/design bank
- `scripts/`: helper scripts

## Frontend Recovery Pack

For Uber `frontend / web` interview recovery after time away from frontend work, start here:

- `prep/references/uber-l5a-frontend-research-memo.md`
- `prep/references/uber-l5a-frontend-round-mapping.md`
- `prep/references/uber-l5a-frontend-question-bank.md`
- `prep/references/uber-l5a-frontend-recovery-ladder.md`

## Workflow
1. Open today's packet in `packets/`.
2. Initialize today's code workspace: `npm run prep:new-day -- <day-number>`.
3. Solve coding/design/build/leadership tasks.
4. Log responses with the tracker app (auto-syncs `tracker/daily-progress.csv`).
5. Update `tracker/dashboard.md` weekly.

## Code Placement (TypeScript + Go)
- TypeScript DSA: `prep/code/typescript/leetcode/day-XX/`
- TypeScript machine coding: `prep/code/typescript/machine-coding/`
- TypeScript GenAI/frontend notes: `prep/code/typescript/genai-frontend/`
- TypeScript retrieval/distributed notes: `prep/code/typescript/retrieval-systems/`
- Go reinforcement practice: `prep/code/golang/leetcode/day-XX/`
- Go distributed systems practice: `prep/code/golang/distributed-systems/`

Recommended split for your profile:
- TypeScript (intermediate): do all core interview solutions here.
- Go (beginner): re-implement one key idea on selected days, no full duplication.

## Tracker App

The app writes each response to local JSONL and keeps day-level metrics synced in the CSV tracker.

### Commands
- `npm run prep:new-day -- 1`
- `npm run prep:record -- --day 1 --section coding --response "Solved Q1 with hashmap and set" --coding-score 7 --minutes 120 --mistakes "edge-case,off-by-one"`
- `npm run prep:record -- --day 1 --section design --response "RAG latency budgeted per stage" --design-score 6 --notes "Need deeper fallback strategy"`
- `npm run prep:record -- --day 1 --section review --response-file prep/packets/day-01.md --notes "Captured full packet response"`
- `npm run prep:analyze`
- `npm run prep:report -- --out prep/tracker/progression-report.md`
- `npm run prep:codex-run`

### Local Store
- `local-store/responses.jsonl`: append-only log of all responses
- `local-store/daily-metrics.json`: latest metrics snapshot by day
- `tracker/daily-progress.csv`: canonical day-by-day matrix (auto-updated)

### Logging Routine
1. Record one `coding` response after core problems.
2. Record one `design` response after design block.
3. Record one `review` response with mistakes and reattempt dates.
4. Run `npm run prep:analyze` every 2-3 days.
5. Run `npm run prep:report` weekly.

## Codex Run Command

`codex run` is not a CLI subcommand; use `codex exec`.

- One-command wrapper: `npm run prep:codex-run`
- Direct command: `codex exec -C /Users/rishabhbansal/Desktop/source/journey/uber-ai --sandbox workspace-write --skip-git-repo-check "<prompt>"`

Wrapper location:
- `prep/scripts/codex-run.sh` (reads `prep/scripts/codex-run-prompt.md`)

Generated outputs:
- `prep/tracker/progression-report.md`
- `prep/tracker/dashboard.md`
- `prep/tracker/codex-last-message.md`

If `codex: command not found` appears:
- `CODEX_BIN=/absolute/path/to/codex npm run prep:codex-run`
- Or run `codex exec ...` directly from a shell where `which codex` works.

## Uber 60-Day Goal Seed

Reset tracker goals and seed one unified plan:

- `npm run tracker:seed:uber:60d`

This creates `Uber Staff 60D - Core+GenAI` and maps:
- LeetCode
- Backend core system design
- GenAI backend orchestration (RAG/KB)
- GenAI frontend + LLD
