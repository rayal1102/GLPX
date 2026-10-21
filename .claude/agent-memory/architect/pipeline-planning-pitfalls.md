---
name: pipeline-planning-pitfalls
description: Non-obvious constraints of this repo's agent pipeline that a PLAN.md must account for (who can write what, who installs test framework, fixtures location, WebFetch limits)
metadata:
  type: project
---

Constraints to design around when writing PLAN.md in this repo:

- Builder's hook denies any path matching TEST_RE (`tests/`, `test/`, `__tests__/`, `*.test.*`...). Sample/fixture data the builder produces (e.g. raw HTML for parser tests) must live OUTSIDE those dirs (e.g. `scripts/samples/`), or be left to the tester.
- Tester must NOT install a test framework (it ends with NEEDS_INPUT). The plan must list the test runner in "Thư viện mới" and have builder install it + create the `npm test` script.
- Builder CAN edit root `CLAUDE.md`, `.gitignore`, `README.md` (only `.claude/(agents|skills|hooks|settings)`, tests and `.env` are blocked). Assign the CLAUDE.md command-table update to builder explicitly.
- WebFetch returns markdown summaries only: no raw HTML, class names or script tags. When a plan depends on HTML selectors, add an early builder step to `curl` sample pages and choose selectors, with a BLOCKED exit if blocked (e.g. Cloudflare).

**Why:** discovered while planning the first feature (2026-10-21); each one would otherwise cause a BLOCKED/NEEDS_INPUT round-trip.
**How to apply:** check every plan against these four points before marking STATUS: READY.

Related: [[gplx-data-sources]]
