# G4 Create platform KPIs (reuse, incident MTTR, p95 latency, accessibility score)

## Context
- Track: Staff Leadership and Strategy
- Concept: Staff Leadership & Strategy
- Difficulty: HARD
- Estimated practice time: 120 minutes

## Problem Statement
Create platform KPIs (reuse, incident MTTR, p95 latency, accessibility score). Scope this as if you are defining a reusable architecture pattern that multiple product teams can adopt within 1-2 quarters.

## Interview Expectation
- What interviewer wants to hear:
  - Show measurable impact and adoption path
  - Manage tradeoffs transparently
  - Create scalable operating model
- Common pitfalls to avoid:
  - Over-indexing on implementation details before clarifying constraints
  - Missing measurable success metrics (latency, reliability, accessibility, adoption)
  - Ignoring rollout, migration, and team-level operational model

## Why This Improves Your Skills
- Staff-level architecture impact:
  - Trains you to define reusable patterns and standards across teams.
- Frontend depth impact:
  - Forces robust state, rendering, UX error handling, and maintainability tradeoffs.
- AI/product impact:
  - Aligns UI behavior with model/tool/retrieval realities and quality controls.

## Prerequisites
- Experience with multi-team technical initiatives
- Ability to write decision memos/RFCs
- Stakeholder and roadmap management

## Practice Workflow
1. Clarify requirements and non-goals for the target user/persona.
2. Draw architecture layers: UI shell, orchestration/client state, API contracts, observability.
3. Define critical flows, retry/cancel semantics, and latency budgets.
4. Define accessibility/performance standards and instrumentation plan.
5. Propose rollout strategy, migration plan, and risk controls.

## Deliverables
- Architecture diagram (high-level + key interfaces)
- API/event/state contract draft
- Failure mode table with user-visible behavior
- Rollout and migration plan
- KPI dashboard proposal with quality/latency/cost metrics

## Evaluation Rubric (0-4 each)
- Requirement clarity
- Architecture quality
- Tradeoff depth
- Reliability/performance planning
- Accessibility and UX quality
- Operational readiness

## Skill Improvements You Should Observe
- Drive cross-team architecture decisions
- Define governance and adoption plans
- Tie architecture to business outcomes

## What To Expect In Real Interview Debrief
- Follow-up on scale assumptions and anti-fragility
- Questions on instrumentation and incident handling
- Pushback on build-vs-buy and team adoption strategy

## Ready-Check Before Marking Complete
- Can explain this design in under 8 minutes clearly.
- Can defend two rejected alternatives with tradeoffs.
- Can name three failure scenarios and recovery UX.
- Can define objective acceptance metrics.

## Reference Material
- https://www.uber.com/careers/list/153753
- https://jobs.uber.com/en/what-moves-us/how-we-hire/
- https://www.uber.com/us/en/ai-solutions/
- https://github.com/vercel/ai
- https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
- https://google-gemini.github.io/gemini-cli/docs/architecture.html

## Personal Notes
