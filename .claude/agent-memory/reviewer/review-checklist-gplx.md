---
name: review-checklist-gplx
description: Recurring weak spots to check when reviewing this project (offline GPLX quiz app: Vite single-file build, scrape scripts, localStorage progress)
metadata:
  type: project
---

Recurring weak spots seen in this project's pipeline output; check them first.

- Scrape/CLI scripts: partial-run flags (e.g. `--only=a-b`) tend to overwrite committed data files and skip range validation. Check output path and arg bounds.
- Downloaded binaries: check whether Content-Type / magic bytes are verified. The source site serves PNG under `.jpg` URLs; browsers tolerate it, so treat it as a 🟢 note only.
- Hard-coded "reference" lists that came from an architect's WebFetch summary (e.g. critical-question IDs) can contain transcription errors. When the builder corrects them from multiple agreeing signals on the primary source, that is usually reasonable. Still raise it under "Cần làm rõ" so the user confirms against the official source.
- localStorage loaders: they usually validate only the outer shape, so a malformed entry can crash the stats code. Check per-entry robustness.
- Hash router: `decodeURIComponent` on the hash can throw and leave a blank page.
- localStorage sanitizers: they check record *values* but forget the *keys*. A key like "abc", "01" or an id outside the dataset breaks `Number(key)` lookups and crashes every page. Probe this with a quick `node --input-type=module -e` run against the real modules; it does not write any files.
- CSS: `backdrop-filter`, `filter` or `transform` on a header makes it the containing block for `position: fixed` children. A mobile "bottom nav" placed inside such a header ends up stuck to the header instead of the bottom of the screen. The pipeline usually leaves mobile untested, so check this by reading the CSS.

- Fix rounds: while `src/` is untracked, `git diff BASE` cannot isolate what changed in this round. Compare file mtimes (`ls -l --time-style=full-iso`) against the previous REVIEW file to find edited files. The main session sometimes touches files that PROGRESS does not mention.
- DOM helpers (`el`/`svg` in `src/ui/dom.js`): children have to be flattened deeply. A nested array that slips through gets `String()`-ified and shows up as text. There is no DOM test environment, so check helper changes by reading the code.

**Why:** these issues came up in round 1 of the first full pipeline run (2026-10-21). None were blocking, but they are easy to miss.
**How to apply:** add these to the review pass for any change touching `scripts/`, `src/core/storage.js` or `src/main.js`.
