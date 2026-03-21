# Code Workspace Layout

Use TypeScript as primary language and Go as secondary practice.

## Language Split
- TypeScript (primary, ~80%): all interview coding rounds, machine-coding, frontend/LLM integrations.
- Go (secondary, ~20%): fundamentals and distributed-systems implementation practice.

## Folders
- `typescript/leetcode/`: daily DSA solutions for interview rounds.
- `typescript/machine-coding/`: queue/scheduler/cache/async implementation exercises.
- `typescript/genai-frontend/`: chat/prompt/retrieval UI architecture and code snippets.
- `typescript/retrieval-systems/`: retrieval pipeline prototypes, API contracts, reliability helpers.
- `golang/leetcode/`: beginner Go re-implementation of select DSA patterns.
- `golang/distributed-systems/`: worker, queue, retry, idempotency, and simple service exercises.

## Daily Rule
1. Solve both core questions in TypeScript.
2. Re-implement only 1 key idea in Go (not full parity) on selected days.
3. Keep design/build artifacts in TypeScript lanes unless the exercise is explicitly Go-focused.
