# Uber L5A Frontend Recovery Ladder

This ladder is session-based rather than day-based, so missed sessions do not break the plan.

Each session assumes roughly `2.5-4 hours` of focused work.

## Usage Rules

- Use `TypeScript` for all coding and utility implementation.
- Do prerequisite drills before the matching interview-level prompt.
- For coding prompts, stop at the time box, write a short mistake log, then move on.
- Revisit only the questions where you were blocked, slow, or vague in explanation.

## First 10 Sessions

### Session 1: JS runtime reset

- `P-01` Closures and scope chain
- `P-04` Event loop, microtasks, macrotasks
- `P-06` `async/await` error handling
- `D-01` `49 Group Anagrams`

Exit criteria:

- you can explain event loop ordering out loud without guessing
- you can write simple JS utilities without reaching for framework habits

### Session 2: Async primitives

- `P-05` Promise combinators
- `P-07` Cancellation with `AbortController`
- `P-08` Build debounce
- `P-13` Event propagation and delegation

Exit criteria:

- you can explain cancellation and choose the correct promise combinator quickly

### Session 3: Async control patterns

- `P-09` Build throttle
- `P-10` Retry with exponential backoff and jitter
- `P-11` Stale-result protection

Exit criteria:

- you can distinguish throttle, debounce, retry, and stale-result protection cleanly

### Session 4: React correctness I

- `R-01` State updates and stale closure traps
- `R-02` Controlled inputs
- `R-04` `useEffect` dependencies and cleanup
- `R-05` `useRef`

Exit criteria:

- you stop making state/effect bugs that come from rusty React muscle memory

### Session 5: React correctness II

- `R-03` Lifted state vs derived state
- `R-06` `useReducer`
- `R-08` Keys and reconciliation
- `R-09` Memoization tradeoffs

Exit criteria:

- you can model UI state explicitly instead of improvising with ad hoc hooks

### Session 6: UI build warmup

- `S-04` Voting poll UI
- `R-12` Accessibility basics

Exit criteria:

- you can build a small React UI quickly while still discussing accessibility and state shape

### Session 7: UI build state machine

- `S-05` Modal manager with priority
- `R-10` Custom async data-loading hook

Exit criteria:

- you can design reusable UI state and explain the public API cleanly

### Session 8: Utility specialization round

- `S-01` Promise concurrency limiter / task queue
- `S-02` Throttler

Exit criteria:

- you can solve one async utility problem in TypeScript without freezing on implementation details

### Session 9: DSA support block

- `D-02` `56 Merge Intervals`
- `D-03` `215 Kth Largest Element in an Array`
- `D-06` `207 Course Schedule`
- `D-07` `210 Course Schedule II`

Exit criteria:

- you can still perform in a standard DSA round while carrying frontend prep load

### Session 10: Frontend design reset

- `A-01` Design Google Calendar
- `A-03` Shared transport layer
- `B-01` Frontend outage story

Exit criteria:

- you can structure a frontend architecture interview and answer one L5A ownership question sharply

## Mock Sets

### Mock A: HackerRank / screen

Time box: `70-75m`

- `P-04` Event loop reasoning
- `P-08` Debounce or `P-09` Throttle
- `P-13` Event propagation or a small DOM-handling add-on

Passing signal:

- correct runtime explanation
- no major syntax struggle
- clean TypeScript and reasonable edge cases

### Mock B: Coding 1 (DSA)

Time box: `60m`

- `D-03` `215 Kth Largest Element in an Array`
- `D-06` `207 Course Schedule`

Passing signal:

- picks correct DS/algorithm quickly
- communicates complexity and alternative approaches

### Mock C: Coding 2 (specialization utility)

Time box: `60m`

- `S-01` Promise concurrency limiter

Passing signal:

- working implementation
- clear async/state reasoning
- handles queue progression and completion correctly

### Mock D: Coding 2 (UI build)

Time box: `60m`

- `S-05` Modal manager with priority

Passing signal:

- coherent component model
- sane state ownership
- basic accessibility and edge-case discussion

### Mock E: Design / architecture

Time box: `45-60m`

- `A-01` Design Google Calendar

Passing signal:

- clarifies requirements
- drives component/data-flow discussion
- covers performance, resilience, accessibility, and observability

### Mock F: Leadership / collaboration

Time box: `45m`

- `B-01` Outage ownership
- `B-02` Cross-team influence
- `B-05` Technical disagreement
- `B-06` Prioritization under ambiguity

Passing signal:

- answers are concrete, scoped, and outcome-oriented
- stories sound like `L5A` ownership, not only individual contributor execution

## Revisit Policy

Mark for revisit if any of these happen:

- you could not complete the problem in the time box
- you relied on hints for the core insight
- your implementation was correct but explanation was weak
- you finished but could not defend edge cases or tradeoffs

Do not revisit everything. Revisit only:

- all blocked items
- all async JS misses
- the last `2` UI builds
- the last `2` design prompts

## Compressed 3-Week Order

If the interview is close, run this order:

1. `P-01`, `P-04`, `P-05`, `P-08`, `P-09`, `P-10`, `P-11`, `P-12`
2. `R-01`, `R-02`, `R-04`, `R-05`, `R-09`, `R-10`, `R-11`
3. `S-01`, `S-02`, `S-04`, `S-05`, `S-08`
4. `D-01`, `D-02`, `D-03`, `D-06`, `D-07`, `D-08`, `D-09`
5. `A-01`, `A-03`, `A-05`, `A-06`
6. `B-01`, `B-02`, `B-03`, `B-05`

That set is the shortest path that still covers:

- vanilla JS
- async JS
- React
- UI coding
- DSA support
- frontend/system design
- leadership
