#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const manifestPath = path.join(process.cwd(), "data/frontend-bank/uber-frontend-bank.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const SOURCE_DEFS = {
  "react-19": {
    label: "React v19",
    url: "https://react.dev/blog/2024/12/05/react-19",
  },
  "react-19-2": {
    label: "React 19.2",
    url: "https://react.dev/blog/2025/10/01/react-19-2",
  },
  "react-use": {
    label: "React Docs: use",
    url: "https://react.dev/reference/react/use",
  },
  "react-render-to-pipeable-stream": {
    label: "React Docs: renderToPipeableStream",
    url: "https://react.dev/reference/react-dom/server/renderToPipeableStream",
  },
  "react-render-to-readable-stream": {
    label: "React Docs: renderToReadableStream",
    url: "https://react.dev/reference/react-dom/server/renderToReadableStream",
  },
  "react-resume-and-prerender": {
    label: "React Docs: resumeAndPrerender",
    url: "https://react.dev/reference/react-dom/static/resumeAndPrerender",
  },
  "react-cache-signal": {
    label: "React Docs: cacheSignal",
    url: "https://react.dev/reference/react/cacheSignal",
  },
  "react-use-effect-event": {
    label: "React Docs: useEffectEvent",
    url: "https://react.dev/reference/react/useEffectEvent",
  },
  "uber-discuss-sde2-alien-2025": {
    label: "LeetCode Discuss: Uber SDE 2 Interview Experience (Alien Dictionary)",
    url: "https://leetcode.com/discuss/post/7327020/uber-sde-2-interview-experience/",
  },
  "uber-discuss-fullstack-2026": {
    label: "LeetCode Discuss: Uber SDE 2 Fullstack Interview Experience",
    url: "https://leetcode.com/discuss/post/7506720/uber-sde-2-fullstack-interview-experienc-o7ff/",
  },
  "uber-discuss-task-scheduler-2022": {
    label: "LeetCode Discuss: Uber Experience L4 SDE-2 (Task Scheduler)",
    url: "https://leetcode.com/discuss/interview-experience/2031408/uber-experience-l4-sde-2",
  },
  "uber-discuss-sde2-bangalore-2025": {
    label: "LeetCode Discuss: Uber SDE-2 Interview Experience Bangalore",
    url: "https://leetcode.com/discuss/interview-experience/7182332/",
  },
};

const ENTRY_OVERRIDES = {
  "J-05": {
    goal: [
      "Build a reusable task runner that accepts jobs over time, respects a max-concurrency cap, and allows urgent jobs to jump the queue without corrupting in-flight accounting.",
      "Keep the public API small: enqueue, pause, resume, onIdle, and optional per-task priority metadata.",
    ],
    focus: [
      "Whether you can separate queue order from execution order while still giving deterministic guarantees.",
      "Whether state transitions stay sound under re-entrant submissions and pause/resume churn.",
      "Whether you talk through fairness, starvation control, and how you would prove the scheduler eventually drains.",
    ],
    edgeCases: [
      "A task synchronously throws before returning a Promise.",
      "A paused queue receives new high-priority work while existing tasks are still finishing.",
      "Idle/drain hooks firing more than once because multiple completions race the empty-queue check.",
    ],
    followUps: [
      "Add starvation prevention so low-priority jobs eventually run.",
      "Expose queue metrics without leaking references to settled tasks.",
      "Add `AbortSignal` support for queued-but-not-started jobs.",
    ],
  },
  "J-06": {
    goal: [
      "Design a keyed scheduler where jobs for the same key must execute serially, but different keys may run in parallel up to a global limit.",
      "Preserve submission order within each key while still achieving good overall throughput.",
    ],
    focus: [
      "Whether you can model per-key queues and a global ready set without creating hidden deadlocks.",
      "Whether you recognize the difference between fairness across keys and fairness within a key.",
      "Whether you can explain why a naive `Map<key, Promise>` chain breaks once you add concurrency caps and backpressure.",
    ],
    edgeCases: [
      "One hot key floods the scheduler and starves colder keys.",
      "A task for key A enqueues another task for key A while it is still running.",
      "Key-specific failure handling accidentally unblocks the next job too early or never unblocks it at all.",
    ],
    followUps: [
      "Add per-key cancellation and bulk flush APIs.",
      "Support weighted keys or reserved slots for latency-sensitive streams.",
      "Persist scheduler state for crash recovery or tab reloads.",
    ],
  },
  "J-07": {
    goal: [
      "Implement a task runner that composes retries, timeout enforcement, and cancellation without duplicating bookkeeping logic.",
      "Define what happens on timeout, retryable failure, non-retryable failure, and explicit cancellation before you code.",
    ],
    focus: [
      "Whether you can unify timeout and abort semantics around a single cancellation story.",
      "Whether retries are bounded, jittered, and observable instead of bolted on at the end.",
      "Whether the final result contract is explicit when some tasks fail permanently and others succeed.",
    ],
    edgeCases: [
      "A task resolves after timing out unless you guard against stale completions.",
      "Retry budget is exhausted while newer tasks are still queued behind the failed one.",
      "Aborting the overall runner must not leave dangling timers or listeners behind.",
    ],
    followUps: [
      "Add circuit-breaker behavior for repeated systemic failures.",
      "Emit structured lifecycle events for monitoring and debugging.",
      "Support per-task retry policies instead of a single global policy.",
    ],
  },
  "J-08": {
    goal: [
      "Create a scheduler that batches same-tick submissions into one microtask flush, then starts work in a deterministic order.",
      "Use the problem to explain how microtasks, macrotasks, and synchronous re-entrancy interact in the JavaScript runtime.",
    ],
    focus: [
      "Whether you know exactly when microtasks flush relative to promise resolution and event callbacks.",
      "Whether batching logic stays correct when the flush itself schedules more work.",
      "Whether you can distinguish 'queued this tick' guarantees from actual completion order guarantees.",
    ],
    edgeCases: [
      "Nested enqueue calls during the flush create accidental infinite loops.",
      "Using `setTimeout` instead of a microtask subtly changes batching semantics.",
      "The same job is enqueued multiple times before the flush and must be coalesced by key.",
    ],
    followUps: [
      "Switch from microtask batching to animation-frame batching and explain the UX tradeoffs.",
      "Add deduplication by task key or payload hash.",
      "Expose a flush-now hook for tests.",
    ],
  },
  "J-09": {
    goal: [
      "Implement a small in-memory scheduler that supports one-off delayed tasks and recurring interval tasks with explicit lifecycle control.",
      "Treat time as a first-class input: define how you store deadlines, trigger work, and cancel recurring jobs cleanly.",
    ],
    focus: [
      "Whether you can reason about timer drift, cancellation, and rescheduling without hand-waving.",
      "Whether you can separate scheduling from execution so the API stays extensible.",
      "Whether you can talk through how the design changes in multi-threaded or distributed environments.",
    ],
    edgeCases: [
      "A recurring task takes longer to run than its interval.",
      "Cancelling a job right as its timer fires should not execute it twice.",
      "A flood of near-future jobs makes a naive one-timer-per-task implementation expensive.",
    ],
    followUps: [
      "Replace multiple timers with a min-heap and a single active timer.",
      "Add persistence, retries, and dead-letter handling.",
      "Explain how you would make the API thread-safe or multi-process safe.",
    ],
  },
  "R-14": {
    goal: [
      "Explain Suspense as a contract for reveal order and fallback placement, not just a loading spinner API.",
      "Choose boundary placement that keeps navigation responsive while avoiding giant blank shells.",
    ],
    focus: [
      "Whether you understand that Suspense coordinates asynchronous rendering and reveal timing.",
      "Whether you know what should sit inside versus outside a boundary for layout stability.",
      "Whether you can explain nested boundaries and progressive reveal without hiding bugs behind fallbacks.",
    ],
    edgeCases: [
      "Putting one top-level boundary around the entire route causes every small fetch to blank the page.",
      "Fallbacks that shift layout or destroy user context during refreshes.",
      "Suspending from an uncached promise in a Client Component.",
    ],
    followUps: [
      "Compare Suspense boundaries with route-level loading states in your framework.",
      "Explain when to pair Suspense with transitions.",
      "Discuss how you would test reveal order and UX regressions.",
    ],
  },
  "R-15": {
    goal: [
      "Be able to sketch a streaming SSR pipeline using `renderToPipeableStream` or `renderToReadableStream` and explain when each environment uses which API.",
      "Connect the server response lifecycle to Suspense boundaries and client hydration behavior.",
    ],
    focus: [
      "Whether you understand how HTML can stream before all data resolves.",
      "Whether you can explain shell readiness, abort paths, and late-discovered assets.",
      "Whether you can reason about the production tradeoff between faster first bytes and more complex debugging.",
    ],
    edgeCases: [
      "The shell is ready but a critical boundary never resolves.",
      "A late stylesheet or async script must land before a boundary reveals.",
      "The stream is aborted mid-flight and the client must recover gracefully.",
    ],
    followUps: [
      "Compare streaming SSR with fully static prerendering.",
      "Explain how CDN caching changes once payloads stream in chunks.",
      "Describe what observability you need for shell time, first reveal, and abort rate.",
    ],
  },
  "R-16": {
    goal: [
      "Use `use` correctly with streamed Promises and know why React warns about promises created directly in Client Component render.",
      "Explain how `use` interacts with Suspense boundaries and cached server-created resources.",
    ],
    focus: [
      "Whether you understand the difference between reading a cached promise versus creating one during render.",
      "Whether you can use `use` for conditional context reads without breaking the rules-of-hooks mental model.",
      "Whether you can articulate when `use` makes code clearer versus more magical.",
    ],
    edgeCases: [
      "Passing a fresh promise each render causes uncached suspension loops.",
      "A streamed promise resolves after the UI path changed and the value is no longer relevant.",
      "Using `use(context)` in a branch that should really be explicit prop flow.",
    ],
    followUps: [
      "Show how a Server Component can hand a Promise to a Client Component.",
      "Talk through cache invalidation and stale resource reuse.",
      "Compare `use` with framework data hooks you already use.",
    ],
  },
  "R-17": {
    goal: [
      "Diagnose hydration mismatches systematically and explain which pieces of logic must stay server-safe versus client-only.",
      "Use this topic to show real production debugging maturity, not just theory.",
    ],
    focus: [
      "Whether you can name common mismatch sources: time, randomness, locale, invalid HTML, browser-only branches, third-party mutation.",
      "Whether you understand that selective hydration lets parts of the tree become interactive independently.",
      "Whether you can explain why `'use client'` defines a boundary, not a blanket fix.",
    ],
    edgeCases: [
      "A date or random ID diverges between server and client.",
      "A browser extension or third-party script mutates the DOM before hydration completes.",
      "A Client Component relies on layout or window APIs during SSR.",
    ],
    followUps: [
      "Add a debugging checklist for hydration incidents.",
      "Explain when to isolate a subtree behind a client-only boundary.",
      "Talk through snapshotting external data used by SSR.",
    ],
  },
  "R-18": {
    goal: [
      "Explain the split between Server Components, Client Components, and Server Actions without mixing the roles of `'use client'` and `'use server'`.",
      "Show how Actions simplify mutations, forms, and optimistic UI while keeping the current UI responsive.",
    ],
    focus: [
      "Whether you know Server Components run ahead of bundling in a separate environment and reduce client JS.",
      "Whether you can explain where Actions live, how forms call them, and where optimistic state belongs.",
      "Whether you can speak to boundary placement: what absolutely must stay client-side, and what should move server-side.",
    ],
    edgeCases: [
      "Passing non-serializable values across the server/client boundary.",
      "Optimistic UI must roll back correctly when the Action fails.",
      "A form mutation depends on client-only state that was never captured in the request.",
    ],
    followUps: [
      "Compare framework ergonomics for Actions and RSC boundaries.",
      "Discuss how you would audit bundle-size wins from moving logic server-side.",
      "Talk through error boundaries for Action failures versus render crashes.",
    ],
  },
  "R-19": {
    goal: [
      "Understand the React 19 delivery primitives that matter in streaming apps: document metadata, colocated stylesheets, async scripts, and resource preloading.",
      "Be able to explain why these features reduce head-management and asset-order bugs in concurrent and streaming rendering.",
    ],
    focus: [
      "Whether you know metadata tags can be rendered in components and hoisted safely.",
      "Whether you can explain stylesheet `precedence`, reveal ordering, and deduplication.",
      "Whether you can connect async scripts and preload APIs to practical page-performance wins.",
    ],
    edgeCases: [
      "Late-discovered styles should not reveal content before they load.",
      "The same script or stylesheet is rendered by multiple components and must dedupe cleanly.",
      "Preloading the wrong thing too aggressively can hurt instead of help.",
    ],
    followUps: [
      "Compare React-native primitives with framework metadata abstractions.",
      "Discuss how you would measure whether preconnect/preload choices actually help.",
      "Explain how component-colocated assets change ownership boundaries in a large codebase.",
    ],
  },
  "R-20": {
    goal: [
      "Cover the newer React 19.2 delivery/runtime concepts: partial pre-rendering, `resumeAndPrerender`, `<Activity />`, `cacheSignal`, and `useEffectEvent`.",
      "Frame them as tools for better scheduling and state retention, not features to cargo-cult into every component.",
    ],
    focus: [
      "Whether you know partial pre-rendering precomputes static work and resumes dynamic work later.",
      "Whether you understand `<Activity />` preserves state for hidden UI instead of unmounting it.",
      "Whether you can explain where `cacheSignal` and `useEffectEvent` reduce wasted work or over-reactive Effects.",
    ],
    edgeCases: [
      "Hidden Activity trees keep state alive, which can be either a feature or a memory footgun.",
      "Aborting cached server work too late wastes backend resources.",
      "Using `useEffectEvent` to hide real dependencies creates subtle bugs.",
    ],
    followUps: [
      "Contrast partial pre-rendering with classic streaming SSR and static generation.",
      "Explain what metrics would justify adopting Activity boundaries.",
      "Show a real effect where `useEffectEvent` keeps latest values without reconnecting everything.",
    ],
  },
  "S-10": {
    goal: [
      "Build a polished Connect Four surface in React with gravity, alternating turns, win detection, draw handling, and restart flow.",
      "Use it as a state-modeling problem first and a UI-polish problem second.",
    ],
    focus: [
      "Whether board state, active player, and derived winner status stay cleanly separated.",
      "Whether you can keep the render simple while still checking rows, columns, and diagonals efficiently enough.",
      "Whether you narrate incremental delivery: basic board first, then win detection, then polish and accessibility.",
    ],
    edgeCases: [
      "Dropping into a full column should be ignored cleanly.",
      "The game reaches a draw without a winner.",
      "Restart logic must fully reset derived status and turn ownership.",
    ],
    followUps: [
      "Add keyboard interaction and screen-reader announcements.",
      "Animate piece drops without tangling core game logic.",
      "Persist recent games or move history.",
    ],
  },
  "D-12": {
    goal: [
      "Solve `Alien Dictionary` by turning ordering clues into a graph problem, then producing a valid topological order or detecting impossibility.",
      "Optimize for clarity: graph construction mistakes usually cost more than the topo sort itself.",
    ],
    focus: [
      "Whether you derive edges from the first differing character only.",
      "Whether you catch invalid prefix cases early.",
      "Whether you can justify complexity and choose between Kahn's algorithm and DFS cycle detection.",
    ],
    edgeCases: [
      "One word is a strict prefix of a previous longer word.",
      "Characters appear in the input but never in any edge.",
      "Multiple valid orders exist and the interviewer only needs one valid answer.",
    ],
    followUps: [
      "Return lexicographically smallest valid order if asked.",
      "Detect cycles explicitly and explain the failure mode.",
      "Discuss how you'd test graph construction independently from ordering.",
    ],
  },
  "D-13": {
    goal: [
      "Use a sliding window with monotonic deques to maintain the current min and max while expanding and shrinking the window.",
      "Keep the invariant verbalized at every step so the interviewer can follow your reasoning.",
    ],
    focus: [
      "Whether you know why two deques give amortized O(n) instead of re-scanning the window.",
      "Whether you can explain window shrink logic without off-by-one confusion.",
      "Whether you can connect the driver-cab framing back to a standard sliding-window pattern quickly.",
    ],
    edgeCases: [
      "Many repeated values should not break deque maintenance.",
      "The violation happens immediately after a large spike and requires repeated left moves.",
      "Single-element windows are always valid and should anchor the invariant.",
    ],
    followUps: [
      "Return the window itself, not just the length.",
      "Adapt the pattern to a fixed-size window variant.",
      "Compare the deque approach with heap-based alternatives and why they are worse here.",
    ],
  },
};

const TAB_DEFAULTS = {
  "js-async": {
    focus: [
      "Model the lifecycle of work explicitly: queued, running, fulfilled, rejected, and drained.",
      "Explain ordering, backpressure, and cancellation rules instead of leaving them implicit.",
      "Use the event loop deliberately so sync throws, promise rejections, and callbacks all land in the right place.",
    ],
    edgeCases: [
      "Synchronous exceptions versus asynchronous failures.",
      "Re-entrant submissions while other work is already in flight.",
      "Final completion hooks firing exactly once.",
    ],
    followUps: [
      "Add cancellation and timeout support.",
      "Expose instrumentation without leaking settled tasks.",
      "Discuss fairness, rate limiting, or retries.",
    ],
  },
  "react-browser": {
    focus: [
      "Keep render logic pure and push imperative work to the right boundary.",
      "Explain how data, loading, and error states flow through the component tree.",
      "Show production judgment about hydration, profiling, and state ownership rather than React trivia.",
    ],
    edgeCases: [
      "Loading, error, and unmount races.",
      "Server/client divergence from time, randomness, locale, or browser-only APIs.",
      "Over-memoization or refs hiding real state transitions.",
    ],
    followUps: [
      "What belongs on the server versus the client?",
      "How would you profile or test this behavior?",
      "How does the design change under streaming or partial hydration?",
    ],
  },
  "frontend-coding": {
    focus: [
      "Define the state model before writing components.",
      "Keep interactions predictable under rapid input, retries, and empty states.",
      "Narrate tradeoffs around accessibility, composability, and testability.",
    ],
    edgeCases: [
      "Partially completed interactions or mid-flow resets.",
      "Keyboard, focus, and announcement behavior.",
      "Derived state going stale after multiple rapid updates.",
    ],
    followUps: [
      "Extract reusable hooks or component APIs.",
      "Persist or sync state with an API.",
      "Add optimistic updates, undo, or collaboration support.",
    ],
  },
  dsa: {
    focus: [
      "Identify the core invariant and say it out loud before coding.",
      "Choose the right data structure and justify the time and space tradeoff.",
      "Use small examples to validate corner cases before finishing the implementation.",
    ],
    edgeCases: [
      "Empty inputs, singleton inputs, or duplicated values.",
      "Invalid states that should short-circuit early.",
      "Complexity traps from re-scanning or rebuilding work you could maintain incrementally.",
    ],
    followUps: [
      "What changes if you need the actual path or reconstruction, not just the answer?",
      "Can you lower memory, or is the current tradeoff already optimal?",
      "How would you unit-test the invariant directly?",
    ],
  },
  "design-behavior": {
    focus: [
      "Anchor the answer in ownership, tradeoffs, and crisp communication.",
      "Make the decision process explicit, not just the final outcome.",
      "Show how you measured impact or knew the approach worked.",
    ],
    edgeCases: [
      "Conflicting stakeholders or incomplete requirements.",
      "Time pressure forcing a smaller but safer scope.",
      "Long-term maintainability versus short-term delivery pressure.",
    ],
    followUps: [
      "How would you de-risk this incrementally?",
      "What would you monitor after launch?",
      "What did you learn or change the next time?",
    ],
  },
};

const CLUSTER_DEFAULTS = {
  "JavaScript Semantics": {
    focus: [
      "Whether you can explain the mental model before writing code.",
      "Whether you distinguish language semantics from framework behavior.",
      "Whether you can repair buggy examples without introducing new hidden state.",
    ],
    edgeCases: [
      "Mutating shared references by accident.",
      "Confusing invocation-time values with definition-time bindings.",
      "Explaining the rule correctly but applying it inconsistently in code.",
    ],
    followUps: [
      "Translate the concept into a small utility or bug fix.",
      "Connect the concept to a real interview prompt where it usually fails.",
      "Call out a common misconception and how to avoid it.",
    ],
  },
  "Reported JavaScript Prompts": {
    focus: [
      "Whether you can move from a fuzzy prompt to a crisp API contract quickly.",
      "Whether you define ordering, error, and completion guarantees explicitly.",
      "Whether your implementation remains readable under pressure.",
    ],
    edgeCases: [
      "Ambiguous callback or Promise error behavior.",
      "Finalization logic firing too early or too late.",
      "New work arriving while old work is still settling.",
    ],
    followUps: [
      "Add cancellation, retries, or metrics.",
      "Convert the API from callbacks to Promises and explain tradeoffs.",
      "Show how you would test the tricky state transitions.",
    ],
  },
  "React State & Effects": {
    focus: [
      "Whether state ownership is obvious and derived state stays derived.",
      "Whether Effects are minimal, correctly scoped, and cleaned up safely.",
      "Whether you can spot stale closures and reconciliation bugs before they ship.",
    ],
    edgeCases: [
      "Effects re-running because dependencies are unstable.",
      "State duplicated across components and drifting out of sync.",
      "Refs used as an escape hatch for state that should stay declarative.",
    ],
    followUps: [
      "Refactor into a reducer or custom hook if the flow grows.",
      "Explain the render timeline after multiple rapid state updates.",
      "Show how you would debug the same issue in production.",
    ],
  },
  "React Architecture & Performance": {
    focus: [
      "Whether you optimize based on render triggers and bottlenecks rather than superstition.",
      "Whether context, memoization, and composition choices stay maintainable.",
      "Whether you can balance performance wins against readability and API clarity.",
    ],
    edgeCases: [
      "Memoization masking a state-model bug instead of fixing it.",
      "Context updates causing accidental wide re-renders.",
      "Performance work that helps benchmarks but not user-facing latency.",
    ],
    followUps: [
      "Profile before and after the change.",
      "Split context or lift state boundaries more intentionally.",
      "Explain what you would measure in production.",
    ],
  },
  "Async Data & Resilience": {
    focus: [
      "Whether loading, success, empty, and error states are modeled deliberately.",
      "Whether cancellation and stale-result protection are part of the first design, not a patch.",
      "Whether async failures are surfaced in the right layer.",
    ],
    edgeCases: [
      "A slower earlier request overwrites a newer result.",
      "A component unmounts while async work is still pending.",
      "Render crashes and request errors get mixed together.",
    ],
    followUps: [
      "Add retries, offline handling, or optimistic refresh.",
      "Separate transport concerns from component concerns.",
      "Discuss monitoring for latency and failure rate.",
    ],
  },
  Accessibility: {
    focus: [
      "Whether the interaction is operable without a mouse.",
      "Whether semantics, focus, and announcements are baked into the design early.",
      "Whether you understand accessibility as correctness, not polish.",
    ],
    edgeCases: [
      "Focus disappearing after modal close or dynamic updates.",
      "Screen-reader users missing state changes.",
      "Keyboard traps or incorrect roles on custom controls.",
    ],
    followUps: [
      "Add ARIA only where native semantics are insufficient.",
      "Describe manual and automated accessibility checks.",
      "Explain how accessibility choices affect component APIs.",
    ],
  },
  "Task Runner Systems": {
    focus: [
      "Treat scheduling as a state machine, not just a loop around Promises.",
      "Be explicit about queue order, start order, and completion order.",
      "Define fairness and cleanup behavior before coding the happy path.",
    ],
    edgeCases: [
      "Queued work arriving while the runner is mid-drain.",
      "Per-task failures causing global runner corruption.",
      "Timer and listener leaks after cancellation or completion.",
    ],
    followUps: [
      "Add pause/resume, metrics, or persistence.",
      "Support priority, keyed fairness, or backpressure.",
      "Discuss how the same API changes in Node versus the browser.",
    ],
  },
  "Async Utilities": {
    focus: [
      "Whether you define the API contract before coding helper internals.",
      "Whether timing and concurrency semantics stay precise under real pressure.",
      "Whether the utility would still be usable by another engineer a month later.",
    ],
    edgeCases: [
      "Duplicate calls, late completions, or throttled trailing invocations.",
      "Memory leaks from retained timers or cached promises.",
      "API behavior changing subtly once errors are introduced.",
    ],
    followUps: [
      "Add tests that lock down timing semantics.",
      "Generalize the helper without bloating the API.",
      "Expose hooks for instrumentation or cancellation.",
    ],
  },
  "Interactive UI Builds": {
    focus: [
      "Whether the UI can be built incrementally with a clean state model.",
      "Whether derived display values stay derived instead of duplicated.",
      "Whether you narrate accessibility and UX decisions while coding.",
    ],
    edgeCases: [
      "Rapid repeated clicks causing inconsistent state.",
      "Resetting the UI after completion or error.",
      "Visual polish getting prioritized before correctness.",
    ],
    followUps: [
      "Extract reusable child components or hooks.",
      "Persist data or sync with an API.",
      "Add keyboard support and announcements.",
    ],
  },
  "Complex Product Surfaces": {
    focus: [
      "Whether you decompose the surface into state, layout, and interaction layers.",
      "Whether the domain model is stable enough to extend later.",
      "Whether you can narrate deliberate scope cuts under time pressure.",
    ],
    edgeCases: [
      "Reordering or layout collisions corrupt derived state.",
      "Performance falls off once the surface scales up.",
      "One feature path blocks delivery of the rest of the experience.",
    ],
    followUps: [
      "Add persistence, optimistic updates, or collaboration.",
      "Discuss virtualization or memoization only where it matters.",
      "Show how you would split the code for a larger team.",
    ],
  },
  "Config-Driven UI": {
    focus: [
      "Whether schema validation and renderer boundaries are explicit.",
      "Whether unknown configs fail safely instead of crashing the whole page.",
      "Whether the abstraction stays debuggable.",
    ],
    edgeCases: [
      "Invalid config shape from the backend.",
      "Partially supported widget types in older clients.",
      "Recursive or deeply nested config trees.",
    ],
    followUps: [
      "Version the schema.",
      "Add analytics and failure isolation per widget.",
      "Discuss ownership between platform and feature teams.",
    ],
  },
  "React Streaming & Server UI": {
    focus: [
      "Explain reveal order, server/client boundaries, and caching semantics clearly.",
      "Show how streaming changes what 'loading' means in a real app.",
      "Tie framework ergonomics back to the underlying React primitives.",
    ],
    edgeCases: [
      "Late data or assets arriving after the shell already streamed.",
      "Hydration mismatches from client-only branches or unstable values.",
      "Moving too much logic client-side and losing the bundle-size win.",
    ],
    followUps: [
      "Compare SSR, streaming SSR, and partial pre-rendering.",
      "Add observability for shell, reveal, and hydration timing.",
      "Discuss bundle boundaries and ownership in a large app.",
    ],
  },
  "Graph Support & Topology": {
    focus: [
      "Whether you model nodes, edges, and indegrees cleanly before coding.",
      "Whether you catch invalid graph states early instead of after the traversal fails.",
      "Whether you can choose between BFS/Kahn and DFS intentionally.",
    ],
    edgeCases: [
      "Disconnected components that still belong in the output.",
      "Cycles or invalid prefix/order rules.",
      "Nodes that never appear on the left side of any edge.",
    ],
    followUps: [
      "Return reconstruction details, not just yes/no.",
      "Add deterministic ordering if multiple valid answers exist.",
      "Test graph construction separately from traversal.",
    ],
  },
  "Sliding Window": {
    focus: [
      "Whether the window invariant is precise and easy to explain.",
      "Whether you update helper structures before and after shrink operations in the right order.",
      "Whether you can reason about amortized O(n) instead of re-scanning the window.",
    ],
    edgeCases: [
      "Repeated values and boundary equality checks.",
      "The left pointer needing to move multiple times for one right-step.",
      "Auxiliary data structures keeping stale indexes around too long.",
    ],
    followUps: [
      "Return the window itself or the indices.",
      "Adapt the same invariant to a fixed-size variant.",
      "Compare deque, heap, and tree-based tradeoffs.",
    ],
  },
  "React 19 Delivery & Platform": {
    focus: [
      "Understand how React now manages head tags and critical assets during concurrent and streaming rendering.",
      "Explain the practical problem each new primitive removes from app code or framework glue.",
      "Connect runtime APIs back to UX: faster reveal, fewer hydration bugs, clearer ownership.",
    ],
    edgeCases: [
      "Asset discovery order changing reveal behavior.",
      "Duplicate scripts or styles rendered from multiple branches.",
      "New APIs making performance worse if used without measurement.",
    ],
    followUps: [
      "Measure the real impact in field data before broad rollout.",
      "Compare colocated assets with centralized route manifests.",
      "Discuss framework abstractions built on top of these primitives.",
    ],
  },
};

const UPSERT_ENTRIES = [
  {
    bankId: "J-05",
    title: "Priority task runner with pause/resume and starvation control",
    type: "CS_FUNDAMENTALS",
    frontendTab: "js-async",
    entryKind: "recovery-drill",
    conceptCluster: "Task Runner Systems",
    roundTag: "Coding 2 (frontend specialization)",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "50m",
    whyItMatters: "hardcore async scheduler design is a strong proxy for Uber's JavaScript systems bar",
    expectedShape: "priority-aware queueing, bounded parallelism, pause/resume control, starvation mitigation, and single-fire drain hooks",
    sourceRefs: ["uber-frontend-guide", "uber-discuss-sr-fe-phone", "uber-discuss-sde3-fe"],
    practicePrompt:
      "Implement a task runner that accepts jobs at runtime, enforces max concurrency, supports priority, pause/resume, and guarantees low-priority work is not starved forever.",
  },
  {
    bankId: "J-06",
    title: "Keyed scheduler with serial-per-key ordering",
    type: "CS_FUNDAMENTALS",
    frontendTab: "js-async",
    entryKind: "recovery-drill",
    conceptCluster: "Task Runner Systems",
    roundTag: "Coding 2 (frontend specialization)",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "50m",
    whyItMatters: "tests whether you can combine queueing, fairness, and runtime invariants without losing correctness",
    expectedShape: "serial execution per key, bounded global concurrency, stable per-key ordering, and fair scheduling across keys",
    sourceRefs: ["uber-frontend-guide", "uber-discuss-sr-fe-phone"],
    practicePrompt:
      "Build a scheduler where jobs with the same key run in submission order, jobs with different keys may run concurrently, and the runner still respects a global concurrency cap.",
  },
  {
    bankId: "J-07",
    title: "Retrying task runner with timeout, abort, and drain semantics",
    type: "CS_FUNDAMENTALS",
    frontendTab: "js-async",
    entryKind: "recovery-drill",
    conceptCluster: "Task Runner Systems",
    roundTag: "Coding 2 (frontend specialization)",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "55m",
    whyItMatters: "pushes beyond basic promise queues into cancellation, retries, and stale-completion correctness",
    expectedShape: "retry budgets, timeout enforcement, AbortSignal support, and clean completion contracts under partial failure",
    sourceRefs: ["uber-frontend-guide", "uber-discuss-sr-fe-phone", "uber-discuss-fe2"],
    practicePrompt:
      "Implement a task runner that can retry retryable failures with backoff, time out long-running jobs, cancel stale work, and expose a reliable idle/drain signal.",
  },
  {
    bankId: "J-08",
    title: "Microtask-batched scheduler with same-tick coalescing",
    type: "CS_FUNDAMENTALS",
    frontendTab: "js-async",
    entryKind: "recovery-drill",
    conceptCluster: "Task Runner Systems",
    roundTag: "HackerRank / screen",
    priority: "stretch",
    difficulty: "Medium",
    level: "Interview-level",
    timebox: "40m",
    whyItMatters: "forces a precise mental model of the JavaScript runtime instead of cargo-cult Promise usage",
    expectedShape: "one-flush-per-tick batching, deterministic enqueue ordering, and clear microtask versus macrotask semantics",
    sourceRefs: ["uber-frontend-guide", "uber-discuss-sde3-fe"],
    practicePrompt:
      "Create a scheduler that coalesces all submissions made in the same tick into one microtask flush, then executes them in deterministic order with optional dedupe by key.",
  },
  {
    bankId: "J-09",
    title: "In-memory task scheduler with delayed and recurring jobs",
    type: "CS_FUNDAMENTALS",
    frontendTab: "js-async",
    entryKind: "reported-question",
    conceptCluster: "Task Runner Systems",
    roundTag: "Coding 2 (frontend specialization)",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "50m",
    whyItMatters: "direct Uber machine-coding signal for runtime modeling, timers, and extensible scheduler design",
    expectedShape: "schedule-at-time, schedule-at-interval, cancellation, drift awareness, and clean internal timer bookkeeping",
    sourceRefs: ["uber-discuss-task-scheduler-2022"],
    reportedContext: "May 12, 2022 · Uber L4 SDE-2 · domain specialization / machine coding",
    reportedPrompt:
      "Implement an in-memory task scheduler library with `schedule(task, time)` and `scheduleAtFixedInterval(task, interval)`.",
    practicePrompt:
      "Build a small scheduler that can run delayed and recurring jobs, cancel them, and evolve toward a heap-backed design without changing the public API.",
  },
  {
    bankId: "R-14",
    title: "Suspense boundaries as loading and streaming contracts",
    type: "CS_FUNDAMENTALS",
    frontendTab: "react-browser",
    entryKind: "concept",
    conceptCluster: "React Streaming & Server UI",
    roundTag: "Business / technical phone screen",
    priority: "mvp",
    difficulty: "Medium",
    level: "Interview-level",
    timebox: "25m",
    whyItMatters: "modern React interview prep now needs a real Suspense mental model, not just lazy-loading trivia",
    expectedShape: "explain fallback placement, nested boundaries, reveal order, and where Suspense helps versus hurts UX",
    sourceRefs: ["react-19", "react-use", "react-render-to-pipeable-stream"],
    practicePrompt:
      "Explain how Suspense controls loading and reveal order in modern React, and redesign a page with poor boundary placement into a progressive, stable experience.",
  },
  {
    bankId: "R-15",
    title: "Streaming SSR with `renderToPipeableStream` / `renderToReadableStream`",
    type: "CS_FUNDAMENTALS",
    frontendTab: "react-browser",
    entryKind: "concept",
    conceptCluster: "React Streaming & Server UI",
    roundTag: "Design / architecture",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "35m",
    whyItMatters: "streaming server rendering is now part of modern React architecture discussions, especially in framework-heavy web teams",
    expectedShape: "sketch shell-first rendering, explain stream lifecycle hooks, and connect Suspense boundaries to streamed HTML and hydration",
    sourceRefs: ["react-render-to-pipeable-stream", "react-render-to-readable-stream", "react-19"],
    practicePrompt:
      "Walk through how you would stream a React route from the server, define shell and reveal boundaries, and reason about aborts, late assets, and hydration.",
  },
  {
    bankId: "R-16",
    title: "`use` with streamed Promises and conditional context reads",
    type: "CS_FUNDAMENTALS",
    frontendTab: "react-browser",
    entryKind: "concept",
    conceptCluster: "React Streaming & Server UI",
    roundTag: "Coding 2 (frontend specialization)",
    priority: "core",
    difficulty: "Medium",
    level: "Interview-level",
    timebox: "30m",
    whyItMatters: "the `use` API is one of the most important recent React additions for streamed data and Suspense-based flows",
    expectedShape: "read cached Promises safely, explain why uncached Promises in Client Components are a trap, and use `use(context)` correctly",
    sourceRefs: ["react-use", "react-19"],
    practicePrompt:
      "Show how a Server Component can hand a Promise to a Client Component, then use `use` to read it behind Suspense without creating uncached render-time Promises.",
  },
  {
    bankId: "R-17",
    title: "Hydration mismatches, selective hydration, and client boundaries",
    type: "CS_FUNDAMENTALS",
    frontendTab: "react-browser",
    entryKind: "concept",
    conceptCluster: "React Streaming & Server UI",
    roundTag: "Design / architecture",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "35m",
    whyItMatters: "frontend candidates now need to debug server/client divergence, not just state bugs inside single-page apps",
    expectedShape: "identify mismatch sources, explain selective hydration, and place `'use client'` boundaries intentionally",
    sourceRefs: ["react-19", "react-render-to-pipeable-stream"],
    practicePrompt:
      "Debug a hydration mismatch caused by mixed server/client logic, then explain how selective hydration and client boundaries change the debugging playbook.",
  },
  {
    bankId: "R-18",
    title: "Server Components, Server Actions, and optimistic mutations",
    type: "CS_FUNDAMENTALS",
    frontendTab: "react-browser",
    entryKind: "concept",
    conceptCluster: "React Streaming & Server UI",
    roundTag: "Coding 2 (frontend specialization)",
    priority: "mvp",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "35m",
    whyItMatters: "React 19 made Server Components and Actions mainstream enough that senior frontend interviews increasingly expect working fluency",
    expectedShape: "separate server versus client responsibilities, explain `use server` semantics, and model optimistic form mutations cleanly",
    sourceRefs: ["react-19", "react-use"],
    practicePrompt:
      "Explain what should be a Server Component, what should stay client-side, and how Actions plus optimistic updates change mutation flows in React 19.",
  },
  {
    bankId: "R-19",
    title: "Metadata, stylesheets, async scripts, and preloading in React 19",
    type: "CS_FUNDAMENTALS",
    frontendTab: "react-browser",
    entryKind: "concept",
    conceptCluster: "React 19 Delivery & Platform",
    roundTag: "Design / architecture",
    priority: "core",
    difficulty: "Medium",
    level: "Interview-level",
    timebox: "30m",
    whyItMatters: "React 19 added platform features that directly affect head management, asset ordering, and streaming reveal behavior",
    expectedShape: "explain metadata hoisting, stylesheet precedence, script deduplication, and when preload primitives improve real UX",
    sourceRefs: ["react-19"],
    practicePrompt:
      "Describe how React 19 now handles document metadata, colocated styles, async scripts, and resource preloading in concurrent and streaming rendering.",
  },
  {
    bankId: "R-20",
    title: "Partial pre-rendering, `<Activity />`, `cacheSignal`, and `useEffectEvent`",
    type: "CS_FUNDAMENTALS",
    frontendTab: "react-browser",
    entryKind: "concept",
    conceptCluster: "React 19 Delivery & Platform",
    roundTag: "Business / technical phone screen",
    priority: "stretch",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "35m",
    whyItMatters: "React 19.2 pushed newer delivery and scheduling primitives that strong frontend candidates should at least recognize and reason about",
    expectedShape: "explain partial pre-rendering and state preservation, describe where `cacheSignal` cancels wasted server work, and use `useEffectEvent` without hiding real dependencies",
    sourceRefs: ["react-19-2", "react-resume-and-prerender", "react-cache-signal", "react-use-effect-event"],
    practicePrompt:
      "Walk through what partial pre-rendering, Activity boundaries, cache-aware abort signals, and effect events solve, and where they are easy to misuse.",
  },
  {
    bankId: "S-10",
    title: "Connect Four board with winner detection",
    type: "LLD",
    frontendTab: "frontend-coding",
    entryKind: "reported-question",
    conceptCluster: "Interactive UI Builds",
    roundTag: "Coding 2 (frontend specialization)",
    priority: "core",
    difficulty: "Medium",
    level: "Interview-level",
    timebox: "50m",
    whyItMatters: "recent Jan 19, 2026 public Uber full-stack/frontend-adjacent signal for state modeling, interaction correctness, and clean incremental delivery",
    expectedShape: "gravity-based move handling, alternating turns, win/draw detection, restart flow, and crisp component/state boundaries",
    sourceRefs: ["uber-discuss-fullstack-2026"],
    reportedContext: "Jan 19, 2026 · Uber SDE 2 Fullstack · LLD round",
    reportedPrompt: "Build the Connect Four game.",
    practicePrompt:
      "Implement Connect Four in React with column drops, winner detection, draw handling, restart, and small but clean UI polish.",
    systemTopic: "Connect Four board with winner detection",
  },
  {
    bankId: "D-12",
    title: "269 Alien Dictionary",
    type: "LEETCODE",
    frontendTab: "dsa",
    entryKind: "reported-question",
    conceptCluster: "Graph Support & Topology",
    roundTag: "Coding 1 (DSA)",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "35m",
    whyItMatters: "recent Nov 4, 2025 Uber SDE 2 coding signal and a very clean topo-sort interview filter",
    expectedShape: "graph construction from ordering clues, invalid-prefix detection, cycle handling, and one valid topological order",
    sourceRefs: ["uber-discuss-sde2-alien-2025"],
    reportedContext: "Nov 4, 2025 · Uber SDE 2 · Coding round",
    reportedPrompt: "The first coding round problem was exactly Alien Dictionary.",
    practicePrompt:
      "Solve Alien Dictionary with correct edge construction, prefix validation, and either Kahn's algorithm or DFS cycle detection.",
    platform: "LeetCode",
    problemSlug: "alien-dictionary",
    problemLink: "https://leetcode.com/problems/alien-dictionary/",
    pattern: "Topological Sort",
    leetcodeOutcome: "TODO",
  },
  {
    bankId: "D-13",
    title: "1438 Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit",
    type: "LEETCODE",
    frontendTab: "dsa",
    entryKind: "reported-question",
    conceptCluster: "Sliding Window",
    roundTag: "HackerRank / screen",
    priority: "core",
    difficulty: "Hard",
    level: "Interview-level",
    timebox: "35m",
    whyItMatters: "recent Sep 12, 2025 Uber elimination-round signal that rewards clear window invariants over brute force",
    expectedShape: "two monotonic deques, stable window shrink logic, and amortized O(n) reasoning",
    sourceRefs: ["uber-discuss-sde2-bangalore-2025"],
    reportedContext: "Sep 12, 2025 · Uber SDE-2 Bangalore · Elimination coding round",
    reportedPrompt:
      "Given an array of integers and a limit, return the longest non-empty subarray where the absolute difference between any two elements is at most the limit.",
    practicePrompt:
      "Solve LeetCode 1438 with monotonic deques and explain the invariant that keeps the window valid.",
    platform: "LeetCode",
    problemSlug: "longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit",
    problemLink:
      "https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/",
    pattern: "Sliding Window",
    leetcodeOutcome: "TODO",
  },
];

const EXISTING_ENTRY_PATCHES = {
  "D-06": {
    sourceRefs: ["leetcodewizard-uber", "uber-discuss-sde3-fe"],
  },
  "D-07": {
    sourceRefs: ["leetcodewizard-uber", "uber-discuss-fullstack-2026"],
    whyItMatters: "recent Jan 19, 2026 Uber full-stack report hit a Course Schedule II variation, so this remains a high-value topo-order support problem",
  },
};

function toTagValue(value) {
  return value
    .toLowerCase()
    .replace(/[`']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tagsFor(entry) {
  return [
    "company:uber",
    "surface:uber-frontend",
    `frontend-tab:${entry.frontendTab}`,
    `entry-kind:${entry.entryKind}`,
    `priority:${entry.priority}`,
    `round:${toTagValue(entry.roundTag)}`,
    `cluster:${toTagValue(entry.conceptCluster)}`,
  ];
}

function linksFor(entry) {
  return entry.sourceRefs
    .map((id) => manifest.sources[id])
    .filter(Boolean)
    .map((source) => ({ label: source.label, url: source.url }));
}

function dedupe(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function defaultsFor(entry) {
  const tabDefaults = TAB_DEFAULTS[entry.frontendTab] ?? { focus: [], edgeCases: [], followUps: [] };
  const clusterDefaults = CLUSTER_DEFAULTS[entry.conceptCluster] ?? { focus: [], edgeCases: [], followUps: [] };
  return {
    focus: dedupe([...clusterDefaults.focus, ...tabDefaults.focus]),
    edgeCases: dedupe([...clusterDefaults.edgeCases, ...tabDefaults.edgeCases]),
    followUps: dedupe([...clusterDefaults.followUps, ...tabDefaults.followUps]),
  };
}

function detailSections(entry) {
  const override = ENTRY_OVERRIDES[entry.bankId] ?? {};
  const defaults = defaultsFor(entry);
  return {
    goal:
      override.goal ?? [
        entry.practicePrompt ?? entry.reportedPrompt ?? entry.title,
        `Make the deliverable interview-ready within roughly ${entry.timebox}.`,
      ],
    focus: override.focus ?? defaults.focus,
    edgeCases: override.edgeCases ?? defaults.edgeCases,
    followUps: override.followUps ?? defaults.followUps,
  };
}

function buildGuide(entry) {
  const sections = detailSections(entry);
  const sources = entry.sourceRefs
    .map((id) => manifest.sources[id])
    .filter(Boolean)
    .map((source) => `- [${source.label}](${source.url})`);

  const lines = [
    "## Practice Brief",
    `- Bank ID: ${entry.bankId}`,
    `- Tab: ${manifest.tabs[entry.frontendTab].label}`,
    `- Round: ${entry.roundTag}`,
    `- Difficulty: ${entry.difficulty}`,
    `- Level: ${entry.level}`,
    `- Time box: ${entry.timebox}`,
    `- Entry kind: ${entry.entryKind}`,
    "",
    "## What You'll Do",
    ...sections.goal.map((line) => `- ${line}`),
    "",
  ];

  if (entry.reportedContext) {
    lines.push("## Source Context", entry.reportedContext, "");
  }

  if (entry.reportedPrompt) {
    lines.push("## Reported Prompt", entry.reportedPrompt, "");
  }

  if (entry.practicePrompt) {
    lines.push("## Practice Version", entry.practicePrompt, "");
  }

  lines.push(
    "## Why It Matters",
    entry.whyItMatters,
    "",
    "## What The Interviewer Is Probing",
    ...sections.focus.map((line) => `- ${line}`),
    "",
    "## Completion Checklist",
    `- ${entry.expectedShape}`,
    `- Keep the explanation anchored to ${entry.roundTag.toLowerCase()} expectations rather than turning it into a generic tutorial.`,
    `- Leave yourself 3-5 minutes at the end to narrate tradeoffs, edge cases, and follow-ups.`,
    "",
    "## Edge Cases / Failure Modes",
    ...sections.edgeCases.map((line) => `- ${line}`),
    "",
    "## Good Follow-Ups",
    ...sections.followUps.map((line) => `- ${line}`),
    "",
    "## Personal Notes",
    "- ",
    "",
    "## Sources",
    ...sources,
  );

  return `${lines.join("\n")}\n`;
}

function sortEntries(entries) {
  const order = ["P", "J", "R", "S", "D", "A", "B", "PX", "RX", "SX", "DX", "AX", "BX"];
  const parse = (bankId) => {
    const match = /^([A-Z]+)-(\d+)$/.exec(bankId);
    if (!match) return { prefixIndex: order.length, num: Number.MAX_SAFE_INTEGER, raw: bankId };
    const [, prefix, num] = match;
    return {
      prefixIndex: order.indexOf(prefix) >= 0 ? order.indexOf(prefix) : order.length,
      num: Number(num),
      raw: bankId,
    };
  };

  return [...entries].sort((left, right) => {
    const a = parse(left.bankId);
    const b = parse(right.bankId);
    return a.prefixIndex - b.prefixIndex || a.num - b.num || a.raw.localeCompare(b.raw);
  });
}

function mergeStartHereBlocks(existing, additions) {
  const withoutExistingAdditions = existing.filter(
    (block) => !additions.some((addition) => addition.title === block.title)
  );
  return [...withoutExistingAdditions, ...additions];
}

Object.assign(manifest.sources, SOURCE_DEFS);

manifest.tabs["js-async"].description =
  "Runtime semantics, promises, cancellation, browser APIs, and hard task-runner / scheduler prompts that stress how the JavaScript runtime actually behaves.";
manifest.tabs["js-async"].startHere = mergeStartHereBlocks(manifest.tabs["js-async"].startHere, [
  {
    title: "Task runner gauntlet",
    itemIds: ["J-05", "J-06", "J-07", "J-09"],
    exitCriteria: "Design queues, schedulers, and cancellation flows without losing fairness, ordering, or cleanup guarantees.",
  },
]);

manifest.tabs["react-browser"].description =
  "React correctness, rendering behavior, streaming/server UI, hydration, delivery primitives, accessibility, and resilience.";
manifest.tabs["react-browser"].startHere = mergeStartHereBlocks(manifest.tabs["react-browser"].startHere, [
  {
    title: "Streaming & server UI",
    itemIds: ["R-14", "R-15", "R-16", "R-17"],
    exitCriteria: "Explain Suspense, streaming SSR, `use`, and hydration mismatches without hiding behind framework magic.",
  },
  {
    title: "Recent React 19.x",
    itemIds: ["R-18", "R-19", "R-20"],
    exitCriteria: "Cover Server Actions, optimistic mutations, modern delivery primitives, and the newest React 19.2 concepts with real tradeoffs.",
  },
]);

for (const [bankId, patch] of Object.entries(EXISTING_ENTRY_PATCHES)) {
  const entry = manifest.entries.find((candidate) => candidate.bankId === bankId);
  if (!entry) continue;
  Object.assign(entry, patch);
}

for (const upsert of UPSERT_ENTRIES) {
  const fullEntry = {
    seedKey: `uber-frontend:${upsert.bankId}`,
    tags: tagsFor(upsert),
    links: linksFor(upsert),
    notesMarkdown: "",
    ...upsert,
  };

  const index = manifest.entries.findIndex((entry) => entry.bankId === upsert.bankId);
  if (index >= 0) {
    manifest.entries[index] = {
      ...manifest.entries[index],
      ...fullEntry,
      tags: tagsFor(fullEntry),
      links: linksFor(fullEntry),
    };
  } else {
    manifest.entries.push(fullEntry);
  }
}

manifest.entries = sortEntries(
  manifest.entries.map((entry) => {
    const next = {
      ...entry,
      tags: tagsFor(entry),
      links: linksFor(entry),
    };

    const guide = buildGuide(next);
    return {
      ...next,
      studyGuideMarkdown: guide,
      notesMarkdown: guide,
    };
  })
);

manifest.generatedAt = new Date().toISOString();

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated frontend bank manifest at ${manifestPath}`);
