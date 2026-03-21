# Uber L5A Frontend Recovery Memo

## Goal

This memo defines a realistic prep target for an Uber `SSE L5A frontend/web` loop when frontend fundamentals have gone cold for roughly 1-2 years.

The purpose is not to build broad long-term frontend mastery. The purpose is to recover enough `vanilla JS`, `async JS`, `React`, `browser/runtime`, `UI coding`, and `frontend architecture` fluency to pass a frontend-heavy Uber loop soon.

## Source Set

- Uber Frontend Engineering Interview Guide:
  - https://jobs.uber.com/en/uber-interview-guide/frontend-engineering-interview-guide/
- Uber front-end engineer prep story:
  - https://jobs.uber.com/en/people-stories/interview-prep/landing-the-job-at-uber-front-end-engineer/
- Official React sources used for the modern React update:
  - https://react.dev/blog/2024/12/05/react-19
  - https://react.dev/blog/2025/10/01/react-19-2
  - https://react.dev/reference/react/use
  - https://react.dev/reference/react-dom/server/renderToPipeableStream
  - https://react.dev/reference/react-dom/server/renderToReadableStream
  - https://react.dev/reference/react-dom/static/resumeAndPrerender
- Public interview reports used as directional signals:
  - https://leetcode.com/discuss/post/7279221/
  - https://leetcode.com/discuss/post/7322609/
  - https://leetcode.com/discuss/post/6970499/
  - https://leetcode.com/discuss/interview-question/346402/Uber-or-Phone-Screen-or-Design-a-Throttler
  - https://leetcode.com/discuss/post/7327020/uber-sde-2-interview-experience/
  - https://leetcode.com/discuss/post/7506720/uber-sde-2-fullstack-interview-experienc-o7ff/
  - https://leetcode.com/discuss/interview-experience/7182332/
  - https://leetcode.com/discuss/interview-experience/2031408/uber-experience-l4-sde-2

## Likely Loop Shape

Across the official Uber frontend material and recent public reports, the recurring loop shape is:

1. `Recruiter / sourcer`
2. `Coding assessment / screen`
3. `Business or technical phone screen`
4. `Coding 1: DSA`
5. `Coding 2: depth in specialization`
6. `Design / architecture`
7. `Collaboration / leadership`

The official frontend guide explicitly calls out:

- `HackerRank coding assessment`
- `Business phone screen to assess coding + design/architecture`
- `Interview 1: Algorithms & Data Structures`
- `Interview 2: Depth in Specialization`
- `Interview 3: Collaboration & Leadership`

Uber's front-end prep story adds one important detail: the early code assessment can include a `small challenge in vanilla JavaScript`, while later rounds focus on `web specialization` and `system design`.

## What Uber Frontend Seems To Test

### 1. Vanilla JS and async reasoning are live interview topics

This is the biggest risk area for your profile.

Public reports repeatedly mention prompts such as:

- build a `throttler`
- build a `task queue / promise concurrency limiter`
- reason about `promise completion`, `for loops`, and async timing
- solve a `graph + async job` style question in JavaScript
- implement an in-memory `task scheduler` with delayed and recurring jobs

This means frontend candidates are not protected from "algorithmic JavaScript" just because they are interviewing for web.

### 2. UI coding is practical rather than toy React trivia

Recent reports mention:

- `voting poll UI` with dynamic percentages and progress bars
- `modal` with priority and close-other-modals behavior
- `C-shape squares` click/unwind interaction
- `calendar` UI/system-design style prompt
- `Connect Four` as a front-end/LLD style coding surface
- `config-driven widget builder`

This points to an interview bar around:

- clean component decomposition
- correct state modeling
- event handling
- async/control-flow correctness
- reasonable UX and edge-case handling

### 3. Specialization rounds can swing between React/UI and JavaScript systems

The most dangerous round is not necessarily DSA. It is the specialization round because it can be:

- a React/UI build
- a JS utility/system problem
- async orchestration
- a browser/runtime debugging exercise

That makes frontend fundamentals recovery a first-order requirement, not a "nice to have".

### 3.5. Modern React delivery is now part of the recovery plan

As of React `19` on `December 5, 2024` and React `19.2` on `October 1, 2025`, modern React prep has to include more than hooks + memoization. The recovery surface now includes:

- `Suspense` as a streaming/reveal boundary, not just lazy-loading sugar
- server rendering with `renderToPipeableStream` / `renderToReadableStream`
- `use` for streamed Promises and conditional context reads
- `Server Components`, `Server Actions`, and form-based mutations
- hydration mismatch debugging and server/client boundary placement
- newer delivery primitives such as metadata hoisting, stylesheet precedence, async script dedupe, partial pre-rendering, and `Activity`

For a frontend/web loop, these matter less because Uber is guaranteed to ask release-note trivia, and more because they expose whether the candidate understands current rendering models, data flow, and production debugging in a React-heavy stack.

### 4. Design is still expected even for frontend-leaning candidates

The design prompt does not look limited to backend-only system design. Public signals include `Google Calendar` and broader design/architecture discussion. For frontend/web candidates, the likely evaluation areas are:

- state model and data flow
- API/transport contracts
- rendering and update strategy
- performance, caching, and retries
- accessibility
- monitoring/observability
- maintainability across teams

### 5. Leadership still matters at L5A

Uber's official guide and public reports both keep a dedicated collaboration/leadership evaluation. At `L5A`, you should expect questions about:

- technical influence
- driving standards
- migration ownership
- ambiguity handling
- outage recovery
- cross-team execution

## Biggest Risks For This Profile

Ranked from highest to lowest risk:

1. `Async JavaScript rust`
   - event loop, promises, cancellation, ordering, concurrency control, and scheduler/task-runner design
2. `Vanilla JS problem-solving rust`
   - implementing utilities quickly in TypeScript without framework crutches
3. `React state/effects + delivery rust`
   - effect cleanup, refs, state modeling, Suspense/streaming, hydration, and server/client boundaries
4. `Frontend specialization round variance`
   - switching between UI coding and async/JS systems
5. `Frontend design articulation`
   - especially performance, resilience, accessibility, and observability
6. `Leadership stories tuned for frontend/platform scope`

## Prep Implications

### What to over-index on

- `vanilla JS semantics`
- `async control patterns`
- `TypeScript implementation speed`
- `React state/effects/ref patterns`
- `UI machine coding`
- `frontend architecture conversations`

### What not to over-index on

- obscure browser trivia
- advanced CSS polish
- large-volume generic LeetCode not tied to Uber round patterns
- backend/distributed depth that does not support the balanced loop

## Bank Design Rules

The question bank that follows this memo is built with these rules:

- `TypeScript-first`
- `frontend recovery first, DSA second`
- every question must map to either:
  - a likely Uber round, or
  - a clear prerequisite for that round
- early sessions must be startable immediately, without topic selection overhead
- the bank must include a `minimum viable pass set` for a compressed 3-week run

## Practical Conclusion

For this profile, the highest-leverage prep sequence is:

1. recover `vanilla JS + async`
2. recover `React state/effects + UI coding`
3. drill `specialization-style utilities and machine coding`
4. keep a trimmed `DSA support lane`
5. layer in `frontend design` and `leadership`

That is the logic behind the companion docs:

- `uber-l5a-frontend-round-mapping.md`
- `uber-l5a-frontend-question-bank.md`
- `uber-l5a-frontend-recovery-ladder.md`
