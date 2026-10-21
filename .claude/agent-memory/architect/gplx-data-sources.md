---
name: gplx-data-sources
description: Where the GPLX hạng B 600-question data comes from and which source is scrapable (hoclaixehcm.vn SSR vs taplaixe.vn JS-loaded)
metadata:
  type: reference
---

- hoclaixehcm.vn: server-rendered. Detail pages are at `/cau-hoi/b/{n}/` (the slug is optional). Each one has the options, a "Đáp án chính xác" marker, an "Điểm liệt" label and the image `/images/{n}.jpg?v=...`. List pages are at `/tra-cuu-cau-hoi/b/?page=1..25` (24 per page, answer text only, no images). The site sits behind Cloudflare.
- taplaixe.vn `/bo-600-cau-hoi-ly-thuyet-thi-gplx`: questions are loaded by JS, so it cannot be scraped with plain fetch. Its visible chapter ranges and 60-câu-điểm-liệt list are only good as cross-check data.
- Chapter ranges agreed by both sites (survey of 2026-10-21): 1–180, 181–205, 206–263, 264–300, 301–485, 486–600.

**How to apply:** if data needs re-scraping or a new license class (A1/C) is requested, start from hoclaixehcm's URL scheme (`/a1/`, `/a2/`, `/c/`). Re-verify, since sites change.

Related: [[pipeline-planning-pitfalls]]
