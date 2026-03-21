# Design URL Shortener

## Interview framing
- Concept group: Foundations
- Expected depth: EASY
- Focus: clean end-to-end design, then 2 high-value deep dives.

## Requirements
### Functional
- Create short URL from long URL.
- Redirect short URL to original URL.
- Optional custom alias.
- Optional expiration timestamp.

### Non-functional
- Low redirect latency.
- High availability for read path.
- Unique short-code mapping.
- Scale to large read-heavy traffic.

## Core Entities
- `ShortUrl(code, originalUrl, createdAt, expiresAt, isActive, ownerUserId?)`
- `User` (optional for MVP)

## API
- `POST /urls`
  - Input: `originalUrl`, optional `customAlias`, optional `expiresAt`
  - Output: `shortUrl`, `code`, `expiresAt`
- `GET /{code}`
  - Output: `302` redirect on success
  - Errors: `404` not found, `410` expired

## High-level design
```text
Create flow:
Client -> API Service -> Code Generation/Alias Check -> DB (unique code) -> short URL

Redirect flow:
Browser -> Redirect Service -> Cache -> DB on miss -> 302 Location: original URL
```

## Deep dive options
### Code generation and collisions
- Random base62 codes with DB unique check and retry.
- Deterministic ID-to-base62 option at higher scale.
- Alias collisions handled with uniqueness constraint.

### Redirect latency
- Primary index on `code`.
- Read-through cache for hot keys.
- Cache TTL bounded by remaining expiration lifetime.

### CAP-style tradeoff
- Assume partition tolerance.
- Read path favors availability and latency.
- Write path enforces uniqueness consistency.
- Eventual consistency acceptable for very fresh links if brief delay is tolerable.

## Reliability and operations
- Cache failure fallback to DB.
- DB overload protection: autoscaling + caching + read shedding.
- Hot key handling and optional CDN edge assistance.
- Metrics: redirect p95/p99, cache hit rate, error rate, create success rate.

## Practical interview checklist
- Limit scope to top requirements.
- Define API and entities before detailed scaling logic.
- Build one working architecture first.
- Select deep dives based on declared NFRs.
