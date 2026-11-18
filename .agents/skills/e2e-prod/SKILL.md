---
name: e2e-prod
description: Run the full click-driven LikhangKamay production regression and diagnose Vercel, Laravel, PostgreSQL, Supabase, provider, and browser failures on the deployed system.
---

# Production E2E and diagnostics

A default invocation or rerun means fresh end-to-end coverage on https://www.likhangkamay.app, including real UI mutations on verified capstone fixtures. Run the complete [browser E2E procedure](../e2e-browser/SKILL.md) and follow the [workflow catalog](../e2e-browser/references/workflows.md), including its [production coverage checklist](../e2e-browser/references/workflows.md#production-coverage-checklist). Narrow the run or change environments only when requested.

When both skills are invoked together, share one run ID, one scenario ledger, and one set of fresh test records. Execute each browser scenario once and attach the production diagnostics to the same result. When invoked alone, this skill still executes the full browser suite.

## Diagnose production behavior

Correlate the deployed revision, run timestamps, route, request ID, and synthetic record ID with available runtime evidence. Check production behavior in successful journeys as well as failed ones.

- **Browser and Inertia** — Capture failed requests, console exceptions, stalled flows, missing props, and stale state across personas. Identify expected validation or authorization responses separately from regressions.
- **Vercel and storage** — Check the deployed configuration and measure requests around slow routes, uploads, and reports. Record cold and warm timing when distinguishable. Test upload guardrails and direct-upload behavior through the real form with approved fixtures. Trace 413s, timeouts, and storage failures to production logs. Label limits as configured or observed.
- **Neon PostgreSQL and Laravel** — Check runtime errors, SQLSTATEs, queries where authorized, scheduler invocations, and queue outcomes. Reconcile the exact test entity for stock, payouts, refunds, and payroll, including test-data isolation. Record whether a scheduler ping was accepted and whether the job completed. Local or SQLite results cannot establish production database parity.
- **Supabase and polling** — Observe a real UI mutation in a second session. Repeat with that browser session's WebSocket blocked where supported. Verify polling converges without a forced reload. Record transport, observed latency, and fallback coverage.
- **PayMongo and Lalamove** — Follow provider Sandbox state through the actual downstream storefront transition. Verify provider acceptance, deployed webhook acknowledgment, and persisted storefront state as independent assertions. Capture event IDs and redacted status evidence. A local simulator, signed fixture, or direct service invocation supplies integration evidence only.

Use production logs, connectors, and authorized read-only verification where available. Remove secrets, auth headers, and personal data from screenshots, logs, and reports. For unavailable diagnostics, record the exact access or tooling blocker and mark the check unverified.

## Report the run

The existing `run_all.mjs` is a partial smoke and diagnostic runner that writes reports to fixed paths. The existing `live_transaction_pipeline.mjs` uses API fallbacks. Use their verified results as supplemental evidence, and execute any scenario without a proven UI mutation through the browser before counting it as UI-verified. A runner exit code cannot substitute for scenario evidence.

Use the [shared evidence schema](../e2e-browser/references/pow_schema.md). Produce a fresh artifact with the deployment, run ID, start and end times, coverage, and blockers. Preserve earlier artifacts for comparison. Report confirmed bugs with severity, persona, expected and actual behavior, browser steps, evidence, and the impacted subsystem. Update tracked audit documentation only when requested.
