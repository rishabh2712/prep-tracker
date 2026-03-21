# Uber L5A Frontend Round Mapping

## Round Map

| Round | What it is likely testing | Main bank lanes | What "good" looks like |
| --- | --- | --- | --- |
| `HackerRank / screen` | small JS challenge, core runtime understanding, clean implementation under time pressure | `Lane 1`, `Lane 3`, light `Lane 4` | writes correct TypeScript quickly, explains tradeoffs, avoids async/runtime mistakes |
| `Business / technical phone screen` | coding + architecture signal, communication, requirement clarification | `Lane 1`, `Lane 5`, `Lane 6` | thinks aloud, clarifies scope, gives practical architecture rather than vague frameworks |
| `Coding 1 (DSA)` | trimmed but real DSA bar | `Lane 4` | picks the right data structure quickly and communicates iteration |
| `Coding 2 (frontend specialization)` | frontend depth: async JS, browser/runtime, React/UI build, utility design | `Lane 1`, `Lane 2`, `Lane 3` | solves in TypeScript, reasons about state and async behavior, handles edge cases cleanly |
| `Design / architecture` | frontend/system design, maintainability, performance, data flow, resilience | `Lane 5`, support from `Lane 6` | structures the problem, surfaces UX/perf/a11y/observability, drives tradeoffs |
| `Leadership / collaboration` | L5A scope, influence, ambiguity handling, cross-team execution | `Lane 6` | shows ownership, influence, and pragmatic judgment, not just execution detail |

## Question Family Mapping

### `HackerRank / screen`

Most likely question families:

- closure / scope bugs
- event loop output reasoning
- promise utility implementation
- debounce / throttle
- small DOM/event handling prompt

Best-prep bank IDs:

- `P-01`, `P-04`, `P-05`, `P-08`, `P-09`, `P-13`

### `Coding 1 (DSA)`

Most likely question families:

- heap / top-k
- intervals
- graph / topo sort
- union-find
- tree basics

Best-prep bank IDs:

- `D-01` through `D-11`

### `Coding 2 (frontend specialization)`

Most likely question families:

- async orchestration utility
- concurrency-limited queue
- throttler
- React stateful UI
- modal / poll / interactive widget build
- graph/async jobs in JS

Best-prep bank IDs:

- `P-07` through `P-12`
- `R-01` through `R-11`
- `S-01` through `S-09`

### `Design / architecture`

Most likely question families:

- calendar or dashboard shell
- state model + data flow
- API transport layer and typed error handling
- performance and observability
- accessibility and maintainability

Best-prep bank IDs:

- `A-01` through `A-07`

### `Leadership / collaboration`

Most likely question families:

- outage recovery
- platform adoption
- tech disagreement
- migration leadership
- prioritization under ambiguity

Best-prep bank IDs:

- `B-01` through `B-07`

## Minimum Round-Coverage Rule

The bank is only useful if you can do all of the following with reasonable confidence:

- explain `event loop + promises` without bluffing
- build `debounce`, `throttle`, and `promise concurrency limiter`
- complete at least `2 UI builds` from scratch in TypeScript/React
- solve at least `8-10` trimmed DSA questions in your own words
- lead one `calendar-style frontend design` conversation
- answer `6-8` leadership questions with specific examples

## Mock Set Mapping

Use these mock sets from the recovery ladder:

- `Mock A`: screen / vanilla JS
- `Mock B`: coding 1 / DSA
- `Mock C`: coding 2 / async utility
- `Mock D`: coding 2 / UI build
- `Mock E`: design / architecture
- `Mock F`: leadership / collaboration
