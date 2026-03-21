# Design URL Shortener

## Context
- Track: backend-core
- Concept: Foundations
- Level: EASY
- Goal: finish a complete working design first, then deepen with bottlenecks and tradeoffs.

## Requirements
### Functional
- Users can submit a long URL and get a short URL.
- Users can open the short URL and get redirected to the original URL.
- Optional: users can provide a custom alias.
- Optional: users can set an expiration time.

### Non-functional
- Low latency redirects (optimize read path first).
- High availability for redirect traffic.
- Unique short codes with collision safety.
- Scale target reference: up to 100M DAU and 1B total shortened URLs.
- Eventual consistency is acceptable for redirect availability if a brand-new link is briefly unavailable.

## Core Entities
- `ShortUrl`
  - `code` (unique, primary lookup key)
  - `originalUrl`
  - `createdAt`
  - `expiresAt` (nullable)
  - `ownerUserId` (nullable)
  - `isActive`
- `User` (optional for MVP if auth is out of scope)

## API Contract
- `POST /urls`
  - Request body: `originalUrl`, optional `customAlias`, optional `expiresAt`
  - Response: `shortUrl`, `code`, `expiresAt`
  - Errors: alias already taken, invalid URL, invalid expiration
- `GET /{code}`
  - Behavior: lookup `code`, check expiration, respond with redirect
  - Success: `302 Found` + `Location: originalUrl`
  - Error: `404` if missing, `410` if expired

## High-Level Design
```text
Client
  -> URL API Service
     -> Code Generator (or custom alias validation)
     -> URL Database (code -> originalUrl mapping, unique constraint)
  <- shortUrl

Browser
  -> Redirect Service (GET /{code})
     -> Cache (read-through)
        -> URL Database (on miss)
  <- 302 Location: originalUrl
```

## Key Design Decisions
- Use `302` redirect for flexibility:
  - Better when you may need analytics, expiration checks, or behavior changes at request time.
  - `301` is more cache-friendly but reduces server-side control once cached aggressively.
- Keep write and read concerns separate:
  - Write path validates and persists unique mapping.
  - Read path is latency-focused and cache-heavy.

## Deep Dives
### 1) Code generation and collision handling
- Option A: random/base62 code + DB uniqueness check + retry on collision.
- Option B: monotonic ID (counter/snowflake) encoded as base62 for deterministic uniqueness.
- Practical interview-safe answer:
  - Start with random base62 and enforce uniqueness in DB.
  - Mention possible move to deterministic ID generation at larger scale.

### 2) Redirect latency optimization
- Index `code` as primary lookup key.
- Add read-through cache (for hot short URLs).
- Cache miss path: DB lookup, populate cache, return redirect.
- Expiration must still be enforced; avoid stale cache by TTL bounded to link lifetime.

### 3) Consistency vs availability (CAP framing)
- Partition tolerance is assumed in distributed systems.
- For redirect endpoint, prioritize availability and low latency.
- Strong read-after-write is not always mandatory for this product.
- For critical correctness (unique code), enforce consistency at write via unique constraints.

## Failure Modes and Mitigations
- Cache outage: fallback to DB reads, absorb with autoscaling and circuit breakers.
- DB primary pressure: replicas + cache hit rate improvement, protect with read limits.
- Hot key traffic spike: cache, CDN edge redirect optimization, rate limits.
- Alias race: DB unique index on `code` and retries.

## Capacity and Estimation Notes
- Do estimates only when they change design choices.
- Most useful calculations:
  - Read/write ratio and peak redirect QPS.
  - Storage footprint for URL mappings.
  - Cache memory for hot keys.

## Interview Execution Checklist
- Clarify top 2-3 functional requirements and top 2-3 NFRs first.
- Define entities before API and architecture.
- Build simple HLD that works before optimizations.
- Choose 2 deep dives tied directly to NFRs.
- Keep time: avoid over-investing in early math that does not change decisions.
