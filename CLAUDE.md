# CLAUDE.md

## Agent Pipeline

Dây chuyền 4 subagent trong `.claude/agents/`, điều phối bởi skill `/pipeline`. Các agent chỉ trao đổi qua file trong `RUN_DIR=.claude/pipeline/runs/<YYYYMMDD-HHMM>-<slug>/`.

- **architect** (opus): phân tích yêu cầu, viết `PLAN.md`; không sửa code.
- **builder** (sonnet): triển khai theo plan, ghi `PROGRESS.md`; không được sửa test, `.claude/` config hay `.env`.
- **tester** (sonnet): viết test theo acceptance criteria, chạy test/build/lint, ghi `TEST_REPORT.md`; chỉ được ghi file test.
- **reviewer** (opus): review `git diff` so với commit gốc, ghi `REVIEW.md` (🔴/🟡/🟢); không sửa code.

Giới hạn ghi file được thực thi bằng hook `.claude/hooks/guard-paths.js` (cần `node` trên PATH).

### Cách dùng
- `/pipeline <yêu cầu>` – chạy đầy đủ, dừng chờ bạn duyệt plan.
- `/pipeline --auto <yêu cầu>` – không chờ duyệt plan.
- `/pipeline --quick <yêu cầu>` – việc nhỏ: bỏ qua architect, phiên chính tự viết plan ngắn.
- Yêu cầu dự án đã dùng git và có ít nhất một commit. Pipeline không bao giờ tự commit/push.

### Lệnh của dự án
Web app offline ôn thi lý thuyết GPLX hạng B (600 câu): Vite + vanilla JS (ESM), build ra một file `dist/index.html` mở trực tiếp bằng double-click; test bằng Vitest; dữ liệu scrape một lần từ hoclaixehcm.vn vào `src/data/questions.json` và `public/images/`. Cần Node >= 18.

| Việc | Lệnh |
|---|---|
| Cài đặt | `npm install` |
| Chạy dev | `npm run dev` |
| Build | `npm run build` (ra `dist/index.html`, mở trực tiếp) |
| Lint | chưa có |
| Typecheck | chưa có |
| Test | `npm test` (`vitest run`) |
| Chạy một file test | `npx vitest run tests/<file>.test.js` |
| Thu thập dữ liệu | `npm run scrape` (tùy chọn `-- --only=1-30` ghi ra `.cache/questions.partial.json`, không đè dữ liệu thật; cache ở `.cache/scrape/`) |
| Kiểm tra dữ liệu | `npm run verify-data` |

### Quy ước file test
Hook dùng regex sau (`TEST_RE`) để nhận diện file test:

```
(^|/)(__tests__|tests?)/|[.](test|spec)[.][^/]+$|(^|/)test_[^/]*[.]py$|_test[.]py$
```

Tức là: mọi file trong thư mục `__tests__/`, `test/`, `tests/`; file `*.test.*`, `*.spec.*`; file Python `test_*.py`, `*_test.py`. Nếu đổi quy ước, sửa regex trong `builder.md` và `tester.md`.
