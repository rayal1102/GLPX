---
name: project-test-setup
description: How to run tests in this repo (vitest) and quirks of the tooling environment
metadata:
  type: project
---

- `npm test` = `vitest run`, tests in `tests/*.test.js`; single file: `npx vitest run tests/<f>.test.js`. `npm run build` -> `dist/index.html`; `npm run verify-data` validates dataset.
- Large multi-file heredocs in the Bash tool failed with "unexpected EOF"; use the Write tool for test files.
- Parse fixtures live in `scripts/samples/*.html`; critical-question list must come from `CRITICAL_IDS` in `src/core/topics.js` (not from PLAN, which had 2 wrong ids).
- Do not rerun `npm run scrape` (network); UI (`src/ui`) has no automated tests, E2E is manual.
