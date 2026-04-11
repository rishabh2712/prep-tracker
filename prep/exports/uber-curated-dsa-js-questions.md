# Uber Curated DSA + JavaScript Question Export

Prepared from the local Uber prep workspace on `2026-04-05`.

This export combines:

- the curated Uber JavaScript questions we modeled for BPS / frontend screens
- the 26-question Uber-weighted DSA pool used in mock interview mode
- the additional async JavaScript practice prompts collected from `/Users/rishabhbansal/Desktop/source/journey/uber-ai/async-react-practice/questions/async-js`

---

# Part 1 — Curated JavaScript Questions

## 1. Stale-Result Protection for Overlapping Requests (`P-11`)

**Problem Statement**
Build a mechanism that prevents older async requests from overwriting newer UI state.

**Function Signature**

```javascript
function createLatestOnlyRequester(requestFn)
```

**Inputs**

- `requestFn: (...args) => Promise<T>`

**Output**

- Returns a function that only allows the latest in-flight request to commit its result

**Requirements**

- two or more requests may overlap in time
- if an earlier request resolves after a later request, the earlier result must be ignored
- you may use version tokens, request ids, or `AbortController`
- define whether stale requests are silently ignored or explicitly cancelled

**Example**

```javascript
const search = createLatestOnlyRequester(fetchSearchResults);
search('react'); // slow
search('hooks'); // fast
```

**Expected Output Behavior**

- only the latest request result updates state
- slower, outdated responses do not overwrite newer results

---

## 2. Async Memoization and Request Deduplication (`P-12`)

**Problem Statement**
Create an async memoization utility that caches results and deduplicates concurrent calls with the same arguments.

**Function Signature**

```javascript
class AsyncMemoizer {
  constructor(asyncFn, options?) {}
  call(...args) {}
  clear() {}
  clearByKey(key) {}
  getStats() {}
}
```

**Inputs**

- `asyncFn: (...args) => Promise<T>`
- `options?: { ttl?: number, resolver?: (...args) => string, maxSize?: number }`

**Output**

- Returns cached results when valid
- Returns the same in-flight promise for duplicate concurrent calls

**Requirements**

- do not cache rejected promises permanently
- support TTL-based expiration
- support custom cache-key generation
- optionally support LRU eviction when `maxSize` is exceeded

**Example**

```javascript
const memoizedFetch = new AsyncMemoizer(fetchUser, { ttl: 5000 });
const p1 = memoizedFetch.call(123);
const p2 = memoizedFetch.call(123);
console.log(p1 === p2); // true
```

**Expected Output Behavior**

- identical concurrent calls share work
- repeated calls after success hit cache
- failures do not poison the cache forever

---

## 3. Fetch / Network Basics: Timeouts, Status Handling, Idempotent Retries (`P-15`)

**Problem Statement**
Design a robust network wrapper for frontend applications that handles timeouts, HTTP status checks, and safe retries.

**Function Signature**

```javascript
async function request(url, options?)
```

**Inputs**

- `url: string`
- `options?: { timeoutMs?: number, method?: string, retry?: number, headers?: Record<string,string> }`

**Output**

- Resolves with parsed response data on success
- Rejects with an error that preserves status and timeout context on failure

**Requirements**

- time out hung requests
- distinguish network failures from HTTP failures
- reject on 4xx/5xx according to your contract
- retry only idempotent requests unless explicitly allowed
- surface status, message, and retryability clearly

**Example**

```javascript
await request('/api/profile', { timeoutMs: 3000, retry: 2, method: 'GET' });
```

**Expected Output Behavior**

- safe retries for idempotent operations
- clean timeout failure when the request hangs
- explicit error handling for status failures

---

## 4. `mapLimit` with Callback Completion (`J-01`)

**Problem Statement**
Implement `mapLimit(items, limit, iteratorFn, done)` that processes items with bounded concurrency and calls a final callback when all work is complete.

**Function Signature**

```javascript
function mapLimit(items, limit, iteratorFn, done)
```

**Inputs**

- `items: T[]`
- `limit: number`
- `iteratorFn: (item: T, callback: (err, result) => void) => void`
- `done: (err, results?) => void`

**Output**

- Invokes `done(error)` on first failure if using fail-fast semantics
- Otherwise invokes `done(null, results)` with results in input order

**Requirements**

- never run more than `limit` jobs at once
- preserve input ordering in final results
- call `done` exactly once
- define fail-fast vs all-settled behavior explicitly

**Example**

```javascript
mapLimit([1, 2, 3, 4], 2, asyncWorker, (err, results) => {
  console.log(results);
});
```

**Expected Output Behavior**

- only 2 async workers are active at any time
- final callback fires exactly once
- results are ordered like the input

---

## 5. Memoize a Callback-Based Async Function (`J-03`)

**Problem Statement**
Create a memoization utility for callback-style asynchronous functions. Duplicate in-flight calls with the same arguments must share the same underlying work.

**Function Signature**

```javascript
function memoizeAsync(asyncFn)
```

**Inputs**

- `asyncFn: (...args, callback) => void`

**Output**

- Returns a wrapped callback-style function with caching and in-flight deduplication

**Requirements**

- cache successful results by argument list
- if an identical request is already in flight, queue callbacks instead of starting new work
- after success, future identical calls should read from cache
- define what happens to errors: cache or do not cache

**Example**

```javascript
const memoizedFetch = memoizeAsync(fetchUserData);
memoizedFetch(1, { timeout: 3000 }, callback);
memoizedFetch(1, { timeout: 3000 }, callback);
```

**Expected Output Behavior**

- only one real async call is made for duplicate in-flight arguments
- both callbacks receive the same eventual result

---

## 6. Microtask-Batched Scheduler with Same-Tick Coalescing (`J-08`)

**Problem Statement**
Create a scheduler that batches all submissions made during the same tick into one microtask flush, then starts work in deterministic order with optional dedupe by key.

**Function Signature**

```javascript
class MicrotaskScheduler {
  schedule(key, task) {}
}
```

**Inputs**

- `key?: string`
- `task: () => void | Promise<void>`

**Output**

- Work scheduled in the same tick is flushed together on the next microtask turn

**Requirements**

- coalesce same-tick submissions
- ensure one flush per tick
- preserve deterministic enqueue order
- if keyed dedupe is supported, define whether the first or last task wins
- explain microtask semantics precisely

**Example**

```javascript
scheduler.schedule('user:1', taskA);
scheduler.schedule('user:1', taskB);
scheduler.schedule('user:2', taskC);
```

**Expected Output Behavior**

- all three schedules land in the same microtask flush
- execution order follows your dedupe contract and enqueue rules

---

## 7. Asynchronous Task Scheduler (Uber SDE-3)

**Problem Statement**
Design a smart ride-scheduling system by implementing an `UberDriver` class. The class must allow users to chain a series of actions but execute them automatically and asynchronously in a specific order.

**Requirements**

1. All methods must be chainable.
2. Methods should not execute instantly; each action finishes before the next begins.
3. `.coffeeBreak()` is a priority task and must execute before normal tasks, even if added later in the chain.
4. Execution should auto-start on the next event loop tick after the chain is constructed.
5. Implement `.status()` to log completed action history so far.

**Expected Interface**

```javascript
new UberDriver()
  .pick('Alice', 1)
  .drive(5)
  .coffeeBreak(3)
  .pick('Bob', 2)
  .status()
  .drop()
  .rest(2);
```

**Follow-up Challenge**

- If multiple `.coffeeBreak()` calls are chained, they must all run before standard tasks while preserving the exact order in which they were called.

---

## 8. Event Loop, Microtasks, Macrotasks, and Output Ordering (`P-04`)

**Context**
This question tests whether you can reason precisely about the JavaScript runtime instead of guessing from intuition.

**Problem Statement**
You are given a JavaScript snippet containing synchronous logs, `setTimeout`, `Promise.then`, and `queueMicrotask`. Predict the exact output order and explain which queue each callback enters before it runs.

**Primary Prompt**

```javascript
console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);

Promise.resolve()
  .then(() => {
    console.log('promise1');
    return Promise.resolve();
  })
  .then(() => console.log('promise2'));

queueMicrotask(() => console.log('microtask'));

console.log('script end');
```

**Follow-up Implementation**
Implement an `AsyncScheduler` that takes an array of asynchronous tasks and a concurrency limit. It must pause execution when the limit is reached and resume as tasks drain.

**Function Signature**

```javascript
function explainExecutionOrder(): string[]
class AsyncScheduler {
  constructor(limit) {}
  enqueue(task) {}
}
```

**Inputs**

- For the tracing part: the provided code snippet
- For the scheduler part:
  - `limit: number`
  - `task: () => Promise<T>`

**Expected Outputs**

- Tracing part: the exact log order
- Scheduler part: results should resolve in completion order or specified contract order, depending on your API definition

**Expected Trace Output**

```text
script start
script end
promise1
microtask
promise2
setTimeout
```

**What a strong answer includes**

- synchronous work runs first
- `Promise.then` and `queueMicrotask` both queue microtasks
- microtasks flush before timers after the current stack empties
- returning `Promise.resolve()` inside the first `.then` delays the next `.then`

---

## 9. Build `debounce` (`P-08`)

**Problem Statement**
Implement a `debounce` utility that delays function execution until a specified interval has passed without another invocation.

**Function Signature**

```javascript
function debounce(fn, wait, options?)
```

**Inputs**

- `fn: (...args) => any`
- `wait: number`
- `options?: { leading?: boolean, trailing?: boolean }`

**Output**

- Returns a wrapped function that only invokes `fn` after the debounce rules are satisfied

**Requirements**

- clear the old timer on every call
- support trailing invocation first
- if you support `leading`, define whether both `leading` and `trailing` can be true
- preserve `this` and arguments
- expose optional `.cancel()` / `.flush()` if you want to show seniority

**Example**

```javascript
const debouncedSearch = debounce(search, 300);
debouncedSearch('r');
debouncedSearch('re');
debouncedSearch('rea');
debouncedSearch('react');
// Only the final call should run after 300ms of silence.
```

**Expected Output Behavior**

- `search('react')` runs once
- earlier queued calls do not run

---

## 10. Build `throttle` (`P-09`)

**Problem Statement**
Implement a `throttle` utility that ensures a function runs at most once within a fixed time window.

**Function Signature**

```javascript
function throttle(fn, wait, options?)
```

**Inputs**

- `fn: (...args) => any`
- `wait: number`
- `options?: { leading?: boolean, trailing?: boolean }`

**Output**

- Returns a wrapped function that respects throttling semantics

**Requirements**

- enforce one execution per throttle window
- define leading and trailing behavior clearly
- preserve the last trailing arguments if trailing is enabled
- handle repeated calls inside the same window deterministically

**Example**

```javascript
const throttled = throttle(logScroll, 200);
window.addEventListener('scroll', throttled);
```

**Expected Output Behavior**

- the function does not run on every scroll event
- it runs at most once every `200ms`
- if trailing is enabled, the last call in the window is delivered later

---

## 11. Retry with Exponential Backoff and Jitter (`P-10`)

**Problem Statement**
Write a retry wrapper for an async operation. Retry only on retryable failures, use exponential backoff, and add jitter to avoid synchronized retries.

**Function Signature**

```javascript
async function fetchWithRetry(url, options, maxRetries)
```

**Inputs**

- `url: string`
- `options?: { baseDelay?: number }`
- `maxRetries: number`

**Output**

- Resolves with the successful response payload
- Rejects with the final error if retries are exhausted or the error is non-retryable

**Requirements**

- retry on network failures and 5xx responses
- do not retry 4xx client errors
- backoff should grow as `baseDelay * 2^attempt`
- add random jitter, e.g. `0..500ms`
- stop after `maxRetries`

**Example**

```javascript
const data = await fetchWithRetry('/api/rides', { baseDelay: 1000 }, 3);
```

**Expected Output Behavior**

- successful result if a retry eventually succeeds
- immediate rejection for non-retryable client errors
- bounded retries for retryable failures

---

# Part 2 — Curated DSA Question Pool (Full Specs)

## 1. Bus Routes

**Function Signature**

```javascript
function numBusesToDestination(routes, source, target)
```

**Input**

- `routes: number[][]`
- `source: number`
- `target: number`

**Output**

- `number`: minimum buses required, or `-1` if unreachable

**Problem Description**
You are given repeating bus routes. Each route is a list of stops visited by that bus forever. Return the minimum number of buses needed to travel from `source` to `target`.

**Example**

```text
Input:
routes = [[1,2,7],[3,6,7]], source = 1, target = 6

Output:
2
```

## 2. Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit

**Function Signature**

```javascript
function longestSubarray(nums, limit)
```

**Input**

- `nums: number[]`
- `limit: number`

**Output**

- `number`: longest valid subarray length

**Problem Description**
Return the length of the longest non-empty subarray where the difference between the maximum and minimum value is at most `limit`.

**Example**

```text
Input:
nums = [8,2,4,7], limit = 4

Output:
2
```

## 3. Alien Dictionary

**Function Signature**

```javascript
function alienOrder(words)
```

**Input**

- `words: string[]`

**Output**

- `string`: one valid character order, or `""` if invalid

**Problem Description**
Given a list of words sorted in an unknown alphabet, derive one valid character ordering. If the ordering is inconsistent, return an empty string.

**Example**

```text
Input:
words = ["wrt","wrf","er","ett","rftt"]

Output:
"wertf"
```

## 4. Number of Islands

**Function Signature**

```javascript
function numIslands(grid)
```

**Input**

- `grid: string[][]`

**Output**

- `number`: count of islands

**Problem Description**
Given a 2D grid of `'1'` and `'0'`, count the number of connected land components using horizontal/vertical adjacency.

**Example**

```text
Input:
[
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]

Output:
3
```

## 5. Dynamic Grid Connectivity (Islands II)

**Function Signature**

```javascript
function numIslands2(m, n, positions)
```

**Input**

- `m: number`
- `n: number`
- `positions: number[][]`

**Output**

- `number[]`: island count after each addition

**Problem Description**
Start with an empty `m x n` grid. Each query adds one land cell. Return the number of islands after every addition.

**Example**

```text
Input:
m = 3, n = 3
positions = [[0,0],[0,1],[1,2],[2,1],[1,1]]

Output:
[1,1,2,3,1]
```

## 6. LRU Cache

**Function Signature**

```javascript
class LRUCache {
  constructor(capacity) {}
  get(key) {}
  put(key, value) {}
}
```

**Input**

- sequence of `get` / `put` operations

**Output**

- values from `get`

**Problem Description**
Design a cache with O(1) average `get` and `put`, evicting the least recently used key when capacity is exceeded.

**Example**

```text
Input:
LRUCache(2)
put(1,1)
put(2,2)
get(1)
put(3,3)
get(2)

Output:
1
-1
```

## 7. Course Schedule II

**Function Signature**

```javascript
function findOrder(numCourses, prerequisites)
```

**Input**

- `numCourses: number`
- `prerequisites: number[][]`

**Output**

- `number[]`: one valid course order, or `[]`

**Problem Description**
Return one valid topological ordering of courses given prerequisite pairs. If the graph has a cycle, return an empty array.

**Example**

```text
Input:
numCourses = 4
prerequisites = [[1,0],[2,0],[3,1],[3,2]]

Output:
[0,1,2,3]
```

## 8. Course Schedule

**Function Signature**

```javascript
function canFinish(numCourses, prerequisites)
```

**Input**

- `numCourses: number`
- `prerequisites: number[][]`

**Output**

- `boolean`

**Problem Description**
Return whether all courses can be completed without violating prerequisite dependencies.

**Example**

```text
Input:
numCourses = 2
prerequisites = [[1,0],[0,1]]

Output:
false
```

## 9. Network Delay Time

**Function Signature**

```javascript
function networkDelayTime(times, n, k)
```

**Input**

- `times: number[][]`
- `n: number`
- `k: number`

**Output**

- `number`: total time for all nodes to receive signal, or `-1`

**Problem Description**
In a directed weighted graph, return how long it takes for all nodes to receive a signal sent from node `k`.

**Example**

```text
Input:
times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2

Output:
2
```

## 10. Cheapest Flights Within K Stops

**Function Signature**

```javascript
function findCheapestPrice(n, flights, src, dst, k)
```

**Input**

- `n: number`
- `flights: number[][]`
- `src: number`
- `dst: number`
- `k: number`

**Output**

- `number`: cheapest valid price or `-1`

**Problem Description**
Return the cheapest price from `src` to `dst` using at most `k` stops.

**Example**

```text
Input:
n = 4
flights = [[0,1,100],[1,2,100],[2,3,100],[0,3,500]]
src = 0, dst = 3, k = 1

Output:
500
```

## 11. Sliding Window Maximum

**Function Signature**

```javascript
function maxSlidingWindow(nums, k)
```

**Input**

- `nums: number[]`
- `k: number`

**Output**

- `number[]`

**Problem Description**
Return the maximum element in every sliding window of size `k`.

**Example**

```text
Input:
nums = [1,3,-1,-3,5,3,6,7], k = 3

Output:
[3,3,5,5,6,7]
```

## 12. Longest Consecutive Sequence

**Function Signature**

```javascript
function longestConsecutive(nums)
```

**Input**

- `nums: number[]`

**Output**

- `number`

**Problem Description**
Return the length of the longest consecutive-value sequence in an unsorted array.

**Example**

```text
Input:
nums = [100,4,200,1,3,2]

Output:
4
```

## 13. Merge Intervals

**Function Signature**

```javascript
function merge(intervals)
```

**Input**

- `intervals: number[][]`

**Output**

- `number[][]`

**Problem Description**
Merge all overlapping intervals and return the resulting interval list.

**Example**

```text
Input:
intervals = [[1,3],[2,6],[8,10],[15,18]]

Output:
[[1,6],[8,10],[15,18]]
```

## 14. Kth Largest Element in an Array

**Function Signature**

```javascript
function findKthLargest(nums, k)
```

**Input**

- `nums: number[]`
- `k: number`

**Output**

- `number`

**Problem Description**
Return the kth largest element in the array.

**Example**

```text
Input:
nums = [3,2,1,5,6,4], k = 2

Output:
5
```

## 15. Lowest Common Ancestor of a Binary Tree

**Function Signature**

```javascript
function lowestCommonAncestor(root, p, q)
```

**Input**

- `root: TreeNode`
- `p: TreeNode`
- `q: TreeNode`

**Output**

- `TreeNode`

**Problem Description**
Return the lowest common ancestor of nodes `p` and `q` in a general binary tree.

**Example**

```text
Input:
root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1

Output:
3
```

## 16. Word Search

**Function Signature**

```javascript
function exist(board, word)
```

**Input**

- `board: string[][]`
- `word: string`

**Output**

- `boolean`

**Problem Description**
Return whether the target word can be formed by sequentially adjacent cells in the grid without reusing a cell.

**Example**

```text
Input:
board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]
word = "ABCCED"

Output:
true
```

## 17. Word Search II

**Function Signature**

```javascript
function findWords(board, words)
```

**Input**

- `board: string[][]`
- `words: string[]`

**Output**

- `string[]`

**Problem Description**
Return all words from the list that can be formed on the board.

**Example**

```text
Input:
board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]
words = ["oath","pea","eat","rain"]

Output:
["oath","eat"]
```

## 18. Meeting Rooms II

**Function Signature**

```javascript
function minMeetingRooms(intervals)
```

**Input**

- `intervals: number[][]`

**Output**

- `number`

**Problem Description**
Return the minimum number of conference rooms required to host all meetings.

**Example**

```text
Input:
intervals = [[0,30],[5,10],[15,20]]

Output:
2
```

## 19. Count Subarrays With Fixed Bounds

**Function Signature**

```javascript
function countSubarrays(nums, minK, maxK)
```

**Input**

- `nums: number[]`
- `minK: number`
- `maxK: number`

**Output**

- `number`

**Problem Description**
Return how many subarrays have minimum value exactly `minK` and maximum value exactly `maxK`.

**Example**

```text
Input:
nums = [1,3,5,2,7,5], minK = 1, maxK = 5

Output:
2
```

## 20. Evaluate Division

**Function Signature**

```javascript
function calcEquation(equations, values, queries)
```

**Input**

- `equations: string[][]`
- `values: number[]`
- `queries: string[][]`

**Output**

- `number[]`

**Problem Description**
Given equations like `a / b = 2.0`, answer ratio queries or return `-1.0` if the ratio cannot be determined.

**Example**

```text
Input:
equations = [["a","b"],["b","c"]]
values = [2.0,3.0]
queries = [["a","c"],["b","a"],["a","e"]]

Output:
[6.0,0.5,-1.0]
```

## 21. Grid Traversal with Directional Arrows

**Function Signature**

```javascript
function minCost(grid)
```

**Input**

- `grid: number[][]`

**Output**

- `number`

**Problem Description**
Each cell contains an arrow direction: right, left, down, or up. Moving in the indicated direction costs `0`; changing direction costs `1`. Return the minimum total cost from the top-left cell to the bottom-right cell.

**Example**

```text
Input:
grid = [[1,1,3],[3,2,2],[1,1,4]]

Output:
0
```

## 22. Next Greater Palindrome

**Function Signature**

```javascript
function nextGreaterPalindrome(num)
```

**Input**

- `num: string`

**Output**

- `string`

**Problem Description**
Given a non-negative integer represented as a string, return the smallest palindrome strictly greater than the input.

**Example**

```text
Input:
num = "12321"

Output:
"12421"
```

**Edge Case**

```text
Input:
num = "999"

Output:
"1001"
```

## 23. Furthest Building You Can Reach

**Function Signature**

```javascript
function furthestBuilding(heights, bricks, ladders)
```

**Input**

- `heights: number[]`
- `bricks: number`
- `ladders: number`

**Output**

- `number`

**Problem Description**
Return the furthest building index you can reach when moving left-to-right with limited bricks and ladders.

**Example**

```text
Input:
heights = [4,2,7,6,9,14,12], bricks = 5, ladders = 1

Output:
4
```

## 24. Maximum Points You Can Obtain from Cards

**Function Signature**

```javascript
function maxScore(cardPoints, k)
```

**Input**

- `cardPoints: number[]`
- `k: number`

**Output**

- `number`

**Problem Description**
Take exactly `k` cards from the front or back of the array to maximize total score.

**Example**

```text
Input:
cardPoints = [1,2,3,4,5,6,1], k = 3

Output:
12
```

## 25. Kth Smallest Element in a BST

**Function Signature**

```javascript
function kthSmallest(root, k)
```

**Input**

- `root: TreeNode`
- `k: number`

**Output**

- `number`

**Problem Description**
Return the kth smallest value in a binary search tree.

**Example**

```text
Input:
root = [3,1,4,null,2], k = 1

Output:
1
```

## 26. Design Hit Counter

**Function Signature**

```javascript
class HitCounter {
  hit(timestamp) {}
  getHits(timestamp) {}
}
```

**Input**

- sequence of `hit(timestamp)` and `getHits(timestamp)` operations

**Output**

- `getHits(timestamp)` returns number of hits in trailing 300-second window

**Problem Description**
Design a hit counter that records hits at integer timestamps and returns how many hits occurred in the last 5 minutes.

**Example**

```text
Input:
hit(1)
hit(2)
hit(3)
getHits(4)
hit(300)
getHits(300)
getHits(301)

Output:
3
4
3
```

---

# Part 3 — Additional Async JavaScript Practice Prompts Collected from `async-react-practice/questions/async-js`

## A. Promise Order and Event Loop

**Source:** `questions.ts`

**Prompt**
Predict the exact console order. Explain why microtasks flush before timers after the current call stack completes.

**Key Concepts**

- synchronous call stack
- microtask queue
- timer queue
- chained `Promise.then`

## B. Sequential vs Parallel Fetching

**Source:** `questions.ts`

**Prompt**
Predict the total runtime for serial `await`s and then for `Promise.all`. Explain when you would intentionally keep work sequential.

**Key Concepts**

- serial dependency vs independent parallel work
- throughput vs ordering guarantees
- resource gating and API rate limits

## C. Ignoring Stale Async Work

**Source:** `questions.ts`

**Prompt**
Two requests are in flight. The earlier one is slower. Explain how request ids or abort signals prevent stale data from winning.

**Key Concepts**

- request versioning
- latest-only semantics
- abort vs ignore strategy

## D. Async Scheduler with Concurrency, Timeout, and Cancellation

**Source:** `asyncScheduler.ts`

**Prompt**
Implement an `AsyncScheduler` class with a concurrency limit and `enqueue(task, timeoutMs?)`. Add support for timeout, cancellation, ordered parallel results, retries, and dependency execution as follow-ups.

**Function Signature**

```javascript
class AsyncScheduler {
  constructor(limit) {}
  enqueue(task, timeoutMs?) {}
  enqueueParallel(tasks, timeoutMs?) {}
  cancel() {}
}
```

## E. Data Batcher with Retry

**Source:** `batcher.ts`

**Prompt**
Implement a `DataBatcher` that flushes by batch size or timeout. Extend it with manual flush and retry with exponential backoff.

**Function Signature**

```javascript
class DataBatcher {
  constructor(callback, batchSize, timeout, retryCount?) {}
  add(data) {}
  manualFlush() {}
}
```

## F. UberDriver / Coffee Break Scheduler

**Source:** `coffee.ts`

**Prompt**
Implement an `UberDriver` chainable scheduler where `.coffeeBreak()` always runs before regular queued tasks, while preserving order among coffee breaks.

**Function Signature**

```javascript
class UberDriver {
  pick(name, id) {}
  drive(distance) {}
  coffeeBreak(duration) {}
  status() {}
  drop() {}
  rest(minutes) {}
}
```

## G. Fetch With Retry

**Source:** `fetchWithRetry.ts`

**Prompt**
Wrap `fetch` with retry-on-network-error or 5xx logic, plus exponential backoff and jitter.

**Function Signature**

```javascript
async function fetchWithRetry(url, options?, maxRetries?)
```

## H. `mapLimit`

**Source:** `mapLimit.ts`

**Prompt**
Implement an `asyncLimit` / `mapLimit` helper that runs at most `limit` tasks concurrently while preserving result order.

**Function Signature**

```javascript
function asyncLimit(tasks, limit)
```

## I. Memoize Callback-Based Async Function

**Source:** `memoise-async.ts`

**Prompt**
Implement `memoizeAsync(asyncFn)` so duplicate in-flight calls share the same underlying async work and later calls hit cache.

**Function Signature**

```javascript
function memoizeAsync(asyncFn)
```

## J. Async Memoizer Utility

**Source:** `memoization.ts`

**Prompt**
Implement an `AsyncMemoizer` utility with TTL, custom key resolution, cache clearing, stats, request deduplication, and optional LRU behavior.

**Function Signature**

```javascript
class AsyncMemoizer {
  constructor({ fn, ttl, resolver? }) {}
  call(...args) {}
  clear() {}
  clearByKey(key) {}
  getStats() {}
}
```

## K. `Promise.all` Polyfill

**Source:** `promiseAll.ts`

**Prompt**
Implement `myPromiseAll(promises)` so it resolves in input order and rejects immediately on the first failure.

**Function Signature**

```javascript
function myPromiseAll(promises)
```

## L. DAG / Dependency Scheduler

**Source:** `Dag.ts`

**Problem Statement**
Implement a scheduler that accepts a list of asynchronous tasks, where each task may depend on the completion of other tasks. The scheduler must detect cycles, compute a valid execution order, and then execute the tasks in dependency-safe order.

**Function Signature**

```javascript
class Scheduler {
  constructor(taskList) {}
  run() {}
}
```

**Inputs**

- `taskList: Array<{ id: string, task: () => Promise<any>, dependencies?: string[] }>`

**Output**

- `run()` returns the task execution results in dependency-safe order, or rejects when a cycle exists

**Requirements**

- build a dependency graph from task definitions
- detect cycles before execution begins
- compute a valid topological ordering when the graph is acyclic
- execute tasks only after all dependencies have completed
- define what happens when one task fails: continue, collect errors, or fail-fast

**Example Input**

```javascript
const tasks = [
  { id: 'fetch-user', task: () => fetchUser() },
  { id: 'fetch-rides', task: () => fetchRides(), dependencies: ['fetch-user'] },
  {
    id: 'compute-summary',
    task: () => summarize(),
    dependencies: ['fetch-rides'],
  },
];
```

**Example Output**

```text
Topological order: ["fetch-user", "fetch-rides", "compute-summary"]
Execution result: all tasks run in dependency-safe order
```

**Follow-ups**

- How would you add bounded concurrency while still respecting dependencies?
- What should the scheduler do if a dependency fails?
- How would you surface partial results for tasks that already completed before a downstream failure?
- How would you validate that referenced dependency ids actually exist?

---

# Suggested Sharing Note

> This document contains the Uber-focused JavaScript and DSA practice set we curated locally for frontend/BPS-style preparation. The JavaScript section covers async/runtime utilities and phone-screen style implementation prompts. The DSA section is the 26-question random mock pool used in the prep tracker. The final section includes additional async JavaScript prompts curated from the local async practice workspace.
