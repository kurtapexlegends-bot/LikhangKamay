---
name: e2e-browser
description: Run a repeatable, visible, full-production LikhangKamay E2E walkthrough with real browser actions across all personas. Use for capstone regression testing, post-change verification, or a fresh full-system check.
---

# Full production browser E2E

Run against the deployed storefront at https://www.likhangkamay.app. A bare invocation or rerun starts a fresh full sweep. A named phase narrows the run only when requested. Use the [workflow catalog](references/workflows.md) for the 45 journeys and its [production coverage checklist](references/workflows.md#production-coverage-checklist) for additional assertions. Combine duplicate scenarios while retaining distinct assertions. Check the deployed navigation and release changes for new or changed journeys the catalog misses and add them to the run ledger.

## Set up each run

1. Record a run ID, target URL, start time, and the deployment or commit actually serving the target. Record an unknown revision explicitly. Check that production and the selected browser are reachable.
2. Use a visible browser with separate sessions for buyer, artisan, staff, rider, and admin. Include guest checks and the additional roles or peers required by the catalogs. Use actual rendered navigation, buttons, inputs, file pickers, and modals. Batch actions within a known screen and verify [selector hints](references/selectors.md) against the current UI.
3. Load credentials from approved environment or secret-backed configuration. Confirm personas and mutation targets belong to capstone test fixtures. Use test payment and Lalamove Sandbox credentials for external effects. Use synthetic email recipients and uploads. Perform admin mutations on records owned by the test. Exercise global controls only within an isolated test scope and record which assertion is blocked when the deployment cannot isolate the effect.
4. Mark new records with the run ID where the UI permits it. Capture exact IDs and pass them between personas. Snapshot baseline values for shared fixtures before mutation. Confirm state through the deployed app or an authorized production read. Local Artisan commands inspect the configured local environment unless verified otherwise. Persona reseeding is a separate setup action because it can reset shared fixtures.

## Execute and verify

- Use the catalog headings to plan coverage, then read only the current phase and its related assertions. Batch same-screen actions and capture targeted DOM and network evidence. Save screenshots and detailed traces as artifacts, and bring their relevant excerpts into the conversation when diagnosing a result.
- Track every expected scenario with a stable name and a verdict of PASS, FAIL, BLOCKED, or NOT RUN. Continue through independent scenarios after failures. Mark dependent steps blocked with the failed prerequisite. A full-suite pass requires evidence for every required scenario.
- For a mutation, use the normal UI, capture its network response, and verify the changed state via a later read or the receiving persona. HTTP 200 or a toast alone cannot prove persistence. For read-only and negative checks, verify the expected visible state, denial, validation message, or absence of a request as applicable.
- Use network and console inspection, telemetry, and authorized read-only queries to corroborate browser actions. Injected fetch or Axios calls, direct mutation endpoints, and database edits cannot satisfy UI mutation assertions. A forced reload cannot satisfy a real-time assertion. Report provider or API probes separately.
- For time-sensitive checks, wait for the expected state and record elapsed time. Preserve initial and rerun results separately. After an ambiguous mutation response, look up the run marker or exact ID before retrying to avoid duplicate effects.
- Complete cross-persona chains through the final outcome. For Lalamove, book through the storefront, advance that exact test order in the provider's Sandbox UI, match the signed COMPLETED event and its HTTP response, and verify both storefront views reach Delivered. Test in-house delivery as its own journey.
- Capture browser console errors and failed requests. Use the [production diagnostics procedure](../e2e-prod/SKILL.md#diagnose-production-behavior) to investigate likely Vercel, PostgreSQL, Supabase, or provider issues.

## Finish the run

Restore changed fixture settings and close test shifts. Remove only disposable records created for the current run through supported UI actions where the scenario calls for cleanup. Leave retained orders and audit history tagged as test data and list remaining fixtures. Each rerun uses fresh mutation IDs and preserves the previous results for comparison.

Write a per-run artifact and report using the [evidence schema](references/pow_schema.md). Report outcome counts, deployment, confirmed bugs, evidence, and cleanup status. The headed walkthrough can help with individual scenarios. The existing transaction runner has API fallbacks and cannot certify the click-only suite.
