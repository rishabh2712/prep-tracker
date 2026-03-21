# Uber L5A Frontend Question Bank

This bank is built for `3-5 weeks`, `25+ hrs/week`, and a `balanced full loop` with a strong frontend recovery bias.

Conventions:

- `Round`: `HackerRank / screen`, `Coding 1 (DSA)`, `Coding 2 (frontend specialization)`, `Design / architecture`, `Leadership / collaboration`
- `Level`: `Prerequisite` or `Interview-level`
- `Difficulty`: practical prep difficulty, not company level
- `Expected shape`: the answer or build quality that should count as "done"

## Minimum Viable Pass Set (3-week squeeze)

If time collapses, do these first:

- `P-01`, `P-04`, `P-05`, `P-08`, `P-09`, `P-10`, `P-11`, `P-12`
- `R-01`, `R-02`, `R-04`, `R-05`, `R-09`, `R-10`, `R-11`
- `S-01`, `S-02`, `S-04`, `S-05`, `S-08`
- `D-01`, `D-02`, `D-03`, `D-06`, `D-07`, `D-08`, `D-09`
- `A-01`, `A-03`, `A-05`, `A-06`
- `B-01`, `B-02`, `B-03`, `B-05`

## Core Bank

### Lane 1: Frontend prerequisite drills

- `P-01` Closures and scope chain. Round: `HackerRank / screen`. Difficulty: `Easy`. Level: `Prerequisite`. Why: many vanilla JS prompts hide closure mistakes. Expected shape: explain lexical scope and implement a factory/counter without leaks. Time: `20m`.
- `P-02` `this`, `bind`, `call`, `apply`. Round: `HackerRank / screen`. Difficulty: `Easy`. Level: `Prerequisite`. Why: common source of silent bugs in utilities and callbacks. Expected shape: explain invocation context and repair broken method/callback examples. Time: `20m`.
- `P-03` Prototypes, classes, and inheritance model. Round: `HackerRank / screen`. Difficulty: `Medium`. Level: `Prerequisite`. Why: needed for solid JS mental model, even when writing TS. Expected shape: explain prototype lookup and implement a small inheritance example. Time: `25m`.
- `P-04` Event loop, microtasks, macrotasks, and output ordering. Round: `HackerRank / screen`. Difficulty: `Medium`. Level: `Prerequisite`. Why: Uber reports and JS screens often test async ordering explicitly. Expected shape: predict execution order and justify each line. Time: `25m`.
- `P-05` Promise combinators: `all`, `allSettled`, `race`, `any`. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Prerequisite`. Why: essential for async orchestration questions. Expected shape: explain failure semantics and pick the right combinator for examples. Time: `25m`.
- `P-06` `async/await` error handling and control flow. Round: `Coding 2 (frontend specialization)`. Difficulty: `Easy`. Level: `Prerequisite`. Why: many candidates write linear-looking code with broken failure behavior. Expected shape: structure try/catch/finally correctly and preserve return semantics. Time: `20m`.
- `P-07` Cancellation with `AbortController`. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Prerequisite`. Why: useful for fetch, stale-result protection, and UX correctness. Expected shape: wire cancelable fetch or task flow with cleanup. Time: `25m`.
- `P-08` Build `debounce`. Round: `HackerRank / screen`. Difficulty: `Easy`. Level: `Interview-level`. Why: classic Uber-style frontend utility. Expected shape: trailing invocation first, then leading/trailing options if comfortable. Time: `25m`.
- `P-09` Build `throttle`. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: appears directly in Uber public reports. Expected shape: correct windowing behavior and clean callback handling. Time: `30m`.
- `P-10` Retry with exponential backoff and jitter. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: common async control pattern that also shows architecture judgment. Expected shape: bounded retries, backoff, jitter, and retryable error gating. Time: `35m`.
- `P-11` Stale-result protection for overlapping requests. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: critical for search/typeahead and async UI correctness. Expected shape: ignore outdated responses using token/version/abort strategy. Time: `30m`.
- `P-12` Async memoization and request deduplication. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: repeated signal in frontend/platform interviews. Expected shape: cache inflight promises, handle failure, avoid duplicate calls. Time: `35m`.
- `P-13` DOM event propagation, capture, bubble, delegation. Round: `HackerRank / screen`. Difficulty: `Easy`. Level: `Prerequisite`. Why: useful for interactive UI builds and debugging. Expected shape: explain propagation and implement delegated click handling. Time: `20m`.
- `P-14` Browser storage: cookies vs `localStorage` vs `sessionStorage`. Round: `Business / technical phone screen`. Difficulty: `Easy`. Level: `Prerequisite`. Why: common web fundamentals baseline. Expected shape: pick correct storage by persistence, security, and size tradeoff. Time: `20m`.
- `P-15` Fetch/network basics: timeouts, status handling, idempotent retries. Round: `Business / technical phone screen`. Difficulty: `Easy`. Level: `Prerequisite`. Why: shows practical frontend engineering maturity. Expected shape: robust request wrapper outline with happy/error paths. Time: `25m`.
- `P-16` Array/object transforms and immutable updates. Round: `HackerRank / screen`. Difficulty: `Easy`. Level: `Prerequisite`. Why: speed on small JS transforms matters in timed rounds. Expected shape: solve transform-heavy prompt cleanly without mutation bugs. Time: `20m`.

### Lane 1B: Reported JS prompts and hard task-runner extensions

- `J-01` `mapLimit` with callback completion. Round: `Business / technical phone screen`. Difficulty: `Medium`. Level: `Interview-level`. Why: direct Uber phone-screen signal for async control and callbacks. Expected shape: bounded parallelism, stable result ordering, final callback once, and error handling. Time: `35m`.
- `J-02` `runAsyncGraph` dependency executor. Round: `Business / technical phone screen`. Difficulty: `Hard`. Level: `Interview-level`. Why: tests orchestration, dependency modeling, and async correctness under pressure. Expected shape: topo-like dependency execution, callback coordination, and failure propagation. Time: `45m`.
- `J-03` Memoize a callback-based async function. Round: `Business / technical phone screen`. Difficulty: `Medium`. Level: `Interview-level`. Why: direct L5A signal for async caching and deduplication fluency. Expected shape: cache by args, dedupe inflight work, and handle callback-style async success/failure. Time: `35m`.
- `J-04` Chainable `UberDriver` with `coffeeBreak()` ordering. Round: `HackerRank / screen`. Difficulty: `Medium`. Level: `Interview-level`. Why: good proxy for queueing, chaining, and priority semantics in plain JavaScript. Expected shape: fluent API, ordered task execution, and front-of-queue handling for priority work. Time: `35m`.
- `J-05` Priority task runner with pause/resume and starvation control. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: modern async specialization rounds often reward real scheduler design rather than toy promise chaining. Expected shape: priority-aware queueing, bounded parallelism, pause/resume control, starvation mitigation, and single-fire drain hooks. Time: `50m`.
- `J-06` Keyed scheduler with serial-per-key ordering. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: excellent proxy for production async correctness and fairness. Expected shape: serial execution per key, bounded global concurrency, stable per-key ordering, and fair scheduling across keys. Time: `50m`.
- `J-07` Retrying task runner with timeout, abort, and drain semantics. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: pushes beyond basic queues into cancellation, retries, and stale-completion handling. Expected shape: retry budgets, timeout enforcement, `AbortSignal` support, and clean completion contracts under partial failure. Time: `55m`.
- `J-08` Microtask-batched scheduler with same-tick coalescing. Round: `HackerRank / screen`. Difficulty: `Medium`. Level: `Interview-level`. Why: forces an exact mental model of microtasks, macrotasks, and re-entrant enqueue behavior. Expected shape: one-flush-per-tick batching, deterministic enqueue ordering, and clear microtask versus macrotask semantics. Time: `40m`.
- `J-09` In-memory task scheduler with delayed and recurring jobs. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: direct Uber machine-coding signal for timer-driven runtime design. Expected shape: delayed jobs, recurring jobs, cancellation, drift awareness, and extensible scheduler internals. Time: `50m`.

### Lane 2: React recovery

- `R-01` State updates, batching, and stale closure traps. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Prerequisite`. Why: core React recovery blocker. Expected shape: explain functional updates and fix stale state bugs. Time: `25m`.
- `R-02` Controlled inputs and form state. Round: `Coding 2 (frontend specialization)`. Difficulty: `Easy`. Level: `Prerequisite`. Why: almost every UI build touches this. Expected shape: build predictable form state with validation hooks kept simple. Time: `25m`.
- `R-03` Lifting state and avoiding duplicated derived state. Round: `Coding 2 (frontend specialization)`. Difficulty: `Easy`. Level: `Prerequisite`. Why: helps keep interview UIs coherent. Expected shape: identify source of truth and remove redundant state. Time: `25m`.
- `R-04` `useEffect` dependencies and cleanup. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Prerequisite`. Why: this is the most likely React correctness failure mode after a long gap. Expected shape: write safe effect setup/cleanup and explain dependency choices. Time: `30m`.
- `R-05` `useRef` and imperative escape hatches. Round: `Coding 2 (frontend specialization)`. Difficulty: `Easy`. Level: `Prerequisite`. Why: useful in cursor tracking, timers, focus, and non-render state. Expected shape: use refs correctly without turning state into hidden mutable soup. Time: `25m`.
- `R-06` `useReducer` for state machines and complex transitions. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Prerequisite`. Why: useful for modal managers, task state, and async flows. Expected shape: model a small reducer with explicit transitions. Time: `30m`.
- `R-07` Context vs prop drilling. Round: `Business / technical phone screen`. Difficulty: `Easy`. Level: `Prerequisite`. Why: common architectural judgment question. Expected shape: explain when context helps and when it becomes hidden global state. Time: `20m`.
- `R-08` List rendering, keys, and reconciliation mistakes. Round: `Coding 2 (frontend specialization)`. Difficulty: `Easy`. Level: `Prerequisite`. Why: easy to get wrong in drag/drop and reorder UIs. Expected shape: explain stable keys and fix buggy list behavior. Time: `20m`.
- `R-09` Memoization tradeoffs: `React.memo`, `useMemo`, `useCallback`. Round: `Business / technical phone screen`. Difficulty: `Medium`. Level: `Interview-level`. Why: Uber frontend/system design often values maintainable performance choices. Expected shape: explain when memoization helps and when it is noise. Time: `30m`.
- `R-10` Build a custom async data-loading hook. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: bridges React and async fundamentals cleanly. Expected shape: idle/loading/success/error states with cancellation or stale-result protection. Time: `35m`.
- `R-11` Re-render debugging and profiling mindset. Round: `Business / technical phone screen`. Difficulty: `Medium`. Level: `Interview-level`. Why: practical FE seniority signal. Expected shape: identify render triggers and propose targeted fixes. Time: `30m`.
- `R-12` Accessibility basics for interactive components. Round: `Design / architecture`. Difficulty: `Easy`. Level: `Interview-level`. Why: accessibility is a strong web specialization signal. Expected shape: keyboard flow, focus management, semantic roles, announcements. Time: `25m`.
- `R-13` Error boundaries and async error presentation. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: shows resilience thinking beyond happy path. Expected shape: separate render crash handling from async request errors cleanly. Time: `25m`.
- `R-14` Suspense boundaries as loading and streaming contracts. Round: `Business / technical phone screen`. Difficulty: `Medium`. Level: `Interview-level`. Why: modern React fluency now needs a real Suspense mental model. Expected shape: explain fallback placement, nested boundaries, and reveal order without cargo-culting framework defaults. Time: `25m`.
- `R-15` Streaming SSR with `renderToPipeableStream` / `renderToReadableStream`. Round: `Design / architecture`. Difficulty: `Hard`. Level: `Interview-level`. Why: current React architecture conversations increasingly include shell-first rendering and streaming tradeoffs. Expected shape: sketch stream lifecycle, shell boundaries, abort paths, and hydration implications. Time: `35m`.
- `R-16` `use` with streamed Promises and conditional context reads. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: one of the most important recent React additions for streamed data flows. Expected shape: read cached Promises safely, explain why uncached Promises in Client Components are a trap, and use `use(context)` correctly. Time: `30m`.
- `R-17` Hydration mismatches, selective hydration, and client boundaries. Round: `Design / architecture`. Difficulty: `Hard`. Level: `Interview-level`. Why: frontend candidates now need to debug server/client divergence, not just SPA state bugs. Expected shape: identify mismatch sources, explain selective hydration, and place `'use client'` boundaries intentionally. Time: `35m`.
- `R-18` Server Components, Server Actions, and optimistic mutations. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: React `19` made these concepts mainstream enough that senior web interviews increasingly expect working fluency. Expected shape: separate server/client responsibilities, explain `use server`, and model optimistic form mutations cleanly. Time: `35m`.
- `R-19` Metadata, stylesheets, async scripts, and preloading in React `19`. Round: `Design / architecture`. Difficulty: `Medium`. Level: `Interview-level`. Why: these primitives directly affect head management, asset ordering, and streaming reveal behavior. Expected shape: explain metadata hoisting, stylesheet precedence, script dedupe, and when preload primitives improve UX. Time: `30m`.
- `R-20` Partial pre-rendering, `<Activity />`, `cacheSignal`, and `useEffectEvent`. Round: `Business / technical phone screen`. Difficulty: `Hard`. Level: `Interview-level`. Why: React `19.2` added delivery/runtime concepts worth recognizing and reasoning about. Expected shape: explain partial pre-rendering, state preservation, cancellation-aware caching, and effect-event tradeoffs. Time: `35m`.

### Lane 3: Uber-style frontend specialization

- `S-01` Build a promise concurrency limiter / task queue. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: repeated Uber public signal. Expected shape: enforce max parallelism, queue overflow safely, and preserve completion callbacks. Time: `45m`.
- `S-02` Design and implement a `throttler`. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: direct Uber signal. Expected shape: correct timing semantics and clear tests/examples. Time: `35m`.
- `S-03` Async memoization utility for deduped requests. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: tests JS systems thinking. Expected shape: cache inflight work, clean up failures, keep API small. Time: `40m`.
- `S-04` Voting poll UI with percentages and progress bars. Round: `Coding 2 (frontend specialization)`. Difficulty: `Easy`. Level: `Interview-level`. Why: direct Uber FE report. Expected shape: clean component split, dynamic percentages, smooth updates, simple styling. Time: `45m`.
- `S-05` Modal manager with priority and close-others behavior. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: direct Uber FE report and good state-model test. Expected shape: stack/priority model, close actions, reusable modal API. Time: `50m`.
- `S-06` C-shape squares with click order unwind. Round: `Coding 2 (frontend specialization)`. Difficulty: `Easy`. Level: `Interview-level`. Why: tests event handling, state order, and timed unwind logic. Expected shape: correct click tracking and reverse decolor with delays. Time: `35m`.
- `S-07` Jira-style drag-and-drop board. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: common FE specialization benchmark. Expected shape: reorder cards, maintain stable state, handle keyboard strategy if time permits. Time: `60m`.
- `S-08` Calendar shell in React. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: maps directly to Uber frontend and design signals. Expected shape: day/week or month grid, event rendering, component model, clear tradeoffs. Time: `60m`.
- `S-09` Config-driven widget renderer. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Interview-level`. Why: good proxy for reusable internal tooling/frontend platform work. Expected shape: schema-to-component mapping, validation boundary, fallback behavior. Time: `60m`.
- `S-10` Connect Four board with winner detection. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Interview-level`. Why: recent Jan `19`, `2026` public Uber full-stack/frontend-adjacent signal for state modeling and interaction correctness. Expected shape: gravity-based moves, winner/draw handling, restart flow, and crisp component/state boundaries. Time: `50m`.

### Lane 4: DSA for frontend candidates

- `D-01` `49 Group Anagrams`. Round: `Coding 1 (DSA)`. Difficulty: `Easy`. Level: `Interview-level`. Why: hashmap warmup and transformation speed. Expected shape: clean keying strategy and complexity explanation. Time: `20m`.
- `D-02` `56 Merge Intervals`. Round: `Coding 1 (DSA)`. Difficulty: `Easy`. Level: `Interview-level`. Why: interval baseline and common sorting pattern. Expected shape: sorted merge with edge-case handling. Time: `20m`.
- `D-03` `215 Kth Largest Element in an Array`. Round: `Coding 1 (DSA)`. Difficulty: `Easy`. Level: `Interview-level`. Why: heap fluency without deep math. Expected shape: min-heap of size `k` or quickselect explanation. Time: `25m`.
- `D-04` `239 Sliding Window Maximum`. Round: `Coding 1 (DSA)`. Difficulty: `Medium`. Level: `Interview-level`. Why: queue/deque reasoning and classic interview signal. Expected shape: monotonic deque solution with invariants. Time: `30m`.
- `D-05` `128 Longest Consecutive Sequence`. Round: `Coding 1 (DSA)`. Difficulty: `Easy`. Level: `Interview-level`. Why: hash-set fluency and clean invariants. Expected shape: linear set-based solution. Time: `20m`.
- `D-06` `207 Course Schedule`. Round: `Coding 1 (DSA)`. Difficulty: `Medium`. Level: `Interview-level`. Why: topo-sort baseline and graph readiness. Expected shape: DFS cycle detect or Kahn's algorithm. Time: `30m`.
- `D-07` `210 Course Schedule II`. Round: `Coding 1 (DSA)`. Difficulty: `Medium`. Level: `Interview-level`. Why: extends topo understanding into output construction. Expected shape: valid ordering or empty result. Time: `30m`.
- `D-08` `743 Network Delay Time`. Round: `Coding 1 (DSA)`. Difficulty: `Medium`. Level: `Interview-level`. Why: shortest-path pattern that can surface in FE loops too. Expected shape: Dijkstra with adjacency list and heap. Time: `35m`.
- `D-09` `305 Number of Islands II`. Round: `Coding 1 (DSA)`. Difficulty: `Hard`. Level: `Interview-level`. Why: public Uber report specifically mentioned Islands II / union-find. Expected shape: dynamic union-find with count tracking. Time: `40m`.
- `D-10` `236 Lowest Common Ancestor of a Binary Tree`. Round: `Coding 1 (DSA)`. Difficulty: `Medium`. Level: `Interview-level`. Why: tree recursion baseline. Expected shape: recursive post-order with clear base cases. Time: `25m`.
- `D-11` `146 LRU Cache`. Round: `Coding 1 (DSA)`. Difficulty: `Medium`. Level: `Interview-level`. Why: data-structure design and API/state reasoning. Expected shape: hash map + doubly linked list explanation or implementation. Time: `40m`.
- `D-12` `269 Alien Dictionary`. Round: `Coding 1 (DSA)`. Difficulty: `Hard`. Level: `Interview-level`. Why: recent Nov `4`, `2025` Uber SDE-2 coding signal and a clean topo-sort filter. Expected shape: graph construction from ordering clues, invalid-prefix detection, cycle handling, and one valid topological order. Time: `35m`.
- `D-13` `1438 Longest Continuous Subarray With Absolute Diff ≤ Limit`. Round: `HackerRank / screen`. Difficulty: `Hard`. Level: `Interview-level`. Why: recent Sep `12`, `2025` Uber elimination-round signal framed in a cab/driver domain context. Expected shape: two monotonic deques, stable window shrink logic, and amortized `O(n)` reasoning. Time: `35m`.

### Lane 5: Frontend / system design

- `A-01` Design Google Calendar from a frontend architecture angle. Round: `Design / architecture`. Difficulty: `Hard`. Level: `Interview-level`. Why: strong Uber public signal. Expected shape: requirements, component model, event layout strategy, API/data flow, perf and edge cases. Time: `45m`.
- `A-02` Design a reusable modal/overlay platform. Round: `Design / architecture`. Difficulty: `Medium`. Level: `Interview-level`. Why: turns a UI coding prompt into a platform conversation. Expected shape: layering, priority, accessibility, escape hatches, ownership boundaries. Time: `35m`.
- `A-03` Design a shared transport layer for retries, cancellation, auth, and typed errors. Round: `Design / architecture`. Difficulty: `Medium`. Level: `Interview-level`. Why: maps directly to frontend platform maturity. Expected shape: request wrapper boundaries, error taxonomy, observability, and rollout strategy. Time: `40m`.
- `A-04` Design a drag-and-drop board frontend architecture. Round: `Design / architecture`. Difficulty: `Medium`. Level: `Interview-level`. Why: tests state model, optimistic updates, and rendering strategy. Expected shape: board/card model, reorder events, persistence, conflict handling. Time: `35m`.
- `A-05` Design a schema-driven widget renderer. Round: `Design / architecture`. Difficulty: `Hard`. Level: `Interview-level`. Why: good proxy for internal platform and configuration-heavy products. Expected shape: schema contracts, rendering registry, validation, failure isolation. Time: `45m`.
- `A-06` Design frontend support for long-running async jobs. Round: `Design / architecture`. Difficulty: `Medium`. Level: `Interview-level`. Why: useful for polling, queued jobs, and progress UIs. Expected shape: job state machine, retries, stale protection, polling vs push, observability. Time: `35m`.
- `A-07` Define frontend standards for performance, accessibility, and monitoring. Round: `Design / architecture`. Difficulty: `Medium`. Level: `Interview-level`. Why: L5A signal for maintainability and cross-team quality. Expected shape: concrete standards, measurement plan, adoption path, and tradeoffs. Time: `30m`.

### Lane 6: Leadership / project narratives

- `B-01` Tell me about a frontend outage you owned. Round: `Leadership / collaboration`. Difficulty: `Medium`. Level: `Interview-level`. Why: practical ownership signal. Expected shape: incident, diagnosis, fix, prevention, and broader learning. Time: `15m`.
- `B-02` Tell me about influencing another team to adopt your technical direction. Round: `Leadership / collaboration`. Difficulty: `Medium`. Level: `Interview-level`. Why: needed for L5A scope. Expected shape: context, disagreement, persuasion strategy, and measurable outcome. Time: `15m`.
- `B-03` Tell me about migrating a legacy frontend safely. Round: `Leadership / collaboration`. Difficulty: `Medium`. Level: `Interview-level`. Why: common senior/staff web story. Expected shape: risk framing, phased rollout, metrics, and tradeoffs. Time: `15m`.
- `B-04` Tell me about raising engineering standards without formal authority. Round: `Leadership / collaboration`. Difficulty: `Medium`. Level: `Interview-level`. Why: maps to frontend platform influence. Expected shape: standards introduced, resistance handled, and adoption evidence. Time: `15m`.
- `B-05` Tell me about a technical disagreement with PM/design/another engineer. Round: `Leadership / collaboration`. Difficulty: `Medium`. Level: `Interview-level`. Why: tests collaboration maturity. Expected shape: crisp conflict, clear decision path, respectful communication, outcome. Time: `15m`.
- `B-06` Tell me about prioritizing under ambiguity and time pressure. Round: `Leadership / collaboration`. Difficulty: `Medium`. Level: `Interview-level`. Why: strong Uber environment fit signal. Expected shape: explicit tradeoffs, decision criteria, and execution results. Time: `15m`.
- `B-07` Tell me about mentoring or unblocking another engineer. Round: `Leadership / collaboration`. Difficulty: `Easy`. Level: `Interview-level`. Why: shows leverage beyond individual output. Expected shape: problem, coaching style, evidence of growth, and your learning. Time: `15m`.

## Stretch Bank

### Stretch prerequisites

- `PX-01` Generators, iterators, and custom iteration protocols. Round: `HackerRank / screen`. Difficulty: `Medium`. Level: `Stretch`. Why: occasional advanced JS prompt. Expected shape: implement simple iterator/generator. Time: `25m`.
- `PX-02` WebSocket vs SSE vs polling tradeoffs. Round: `Design / architecture`. Difficulty: `Easy`. Level: `Stretch`. Why: useful for live dashboards and push updates. Expected shape: choose transport based on delivery and infra constraints. Time: `20m`.
- `PX-03` Module loading, bundling, and lazy-loading basics. Round: `Business / technical phone screen`. Difficulty: `Medium`. Level: `Stretch`. Why: practical frontend performance topic. Expected shape: explain bundle split triggers and monitoring plan. Time: `25m`.

### Stretch React / specialization

- `RX-01` Suspense mental model and where not to use it. Round: `Business / technical phone screen`. Difficulty: `Medium`. Level: `Stretch`. Why: modern React fluency signal. Expected shape: high-level tradeoffs, not framework evangelism. Time: `20m`.
- `RX-02` Server rendering, hydration mismatches, and client boundaries. Round: `Design / architecture`. Difficulty: `Medium`. Level: `Stretch`. Why: useful for web platform roles. Expected shape: explain mismatch causes and mitigation. Time: `25m`.
- `SX-01` Build a typeahead with debouncing, cancellation, and stale-result protection. Round: `Coding 2 (frontend specialization)`. Difficulty: `Medium`. Level: `Stretch`. Why: composes the core async primitives well. Expected shape: responsive UX with no stale overwrite bug. Time: `45m`.
- `SX-02` Build infinite scroll with virtualization awareness. Round: `Coding 2 (frontend specialization)`. Difficulty: `Hard`. Level: `Stretch`. Why: common practical web problem. Expected shape: pagination, loading state, and rendering strategy. Time: `50m`.

### Stretch DSA / design / behavior

- `DX-01` `787 Cheapest Flights Within K Stops`. Round: `Coding 1 (DSA)`. Difficulty: `Hard`. Level: `Stretch`. Why: graph path constraints. Expected shape: bounded shortest-path reasoning. Time: `35m`.
- `DX-02` `815 Bus Routes`. Round: `Coding 1 (DSA)`. Difficulty: `Hard`. Level: `Stretch`. Why: graph modeling practice. Expected shape: route/node modeling without confusion. Time: `40m`.
- `AX-01` Design recurring-event support for calendar UI. Round: `Design / architecture`. Difficulty: `Hard`. Level: `Stretch`. Why: extends the calendar prompt. Expected shape: recurrence model, expansion strategy, edit semantics. Time: `45m`.
- `BX-01` Tell me about a project where your original technical judgment was wrong. Round: `Leadership / collaboration`. Difficulty: `Medium`. Level: `Stretch`. Why: credibility and self-awareness signal. Expected shape: mistake, correction, and learning without defensiveness. Time: `15m`.
