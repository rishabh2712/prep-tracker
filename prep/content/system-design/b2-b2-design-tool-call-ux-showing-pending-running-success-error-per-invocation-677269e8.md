# B2 Design tool-call UX showing pending/running/success/error per invocation

## Context
- Track: GenAI Product UX
- Concept: AI Product UX & Trust
- Difficulty: MEDIUM
- Estimated practice time: 90 minutes

## Problem Statement
Design tool-call UX showing pending/running/success/error per invocation. Scope this as if you are defining a reusable architecture pattern that multiple product teams can adopt within 1-2 quarters.

## Interview Expectation
- What interviewer wants to hear:
  - Handle partial state and retry flows cleanly
  - Present trust and provenance to users
  - Design for both expert and non-expert users
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
- Understanding of LLM request/response lifecycle
- Familiarity with streaming UI patterns
- Basic prompt engineering concepts

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
- Design robust prompt and chat workflows
- Model loading and failure UX for inference systems
- Build explainability and confidence patterns

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
- https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
- https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
- https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces
- https://www.uber.com/us/en/ai-solutions/
- https://google-gemini.github.io/gemini-cli/docs/architecture.html

## Personal Notes
