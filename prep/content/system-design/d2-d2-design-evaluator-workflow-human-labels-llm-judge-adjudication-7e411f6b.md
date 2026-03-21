# D2 Design evaluator workflow (human labels + LLM judge + adjudication)

## Context
- Track: Experimentation and Evaluation
- Concept: Evaluation, Monitoring & Observability
- Difficulty: MEDIUM
- Estimated practice time: 90 minutes

## Problem Statement
Design evaluator workflow (human labels + LLM judge + adjudication). Scope this as if you are defining a reusable architecture pattern that multiple product teams can adopt within 1-2 quarters.

## Interview Expectation
- What interviewer wants to hear:
  - Define clear success metrics and guardrails
  - Distinguish online vs offline evaluation paths
  - Design incident triage paths
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
- Statistical basics for A/B testing
- Telemetry and event modeling basics
- Understanding of model evaluation signals

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
- Build evaluation workflows for model output quality
- Design experiment dashboards with cost-latency-quality tradeoffs
- Instrument observability for model-backed features

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
- https://ai-sdk.dev/docs/ai-sdk-core/telemetry
- https://opentelemetry.io/docs/
- https://jobs.uber.com/en/uber-interview-guide/ml-ai-engineering-interview-guide/
- https://web.dev/articles/vitals-business-impact
- https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
- https://google-gemini.github.io/gemini-cli/docs/architecture.html

## Personal Notes
