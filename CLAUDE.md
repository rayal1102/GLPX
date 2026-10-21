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
Dự án hiện chưa có code (khảo sát ngày 2026-10-15). Cập nhật bảng này khi đã chọn stack.

| Việc | Lệnh |
|---|---|
| Cài đặt | chưa có |
| Chạy dev | chưa có |
| Build | chưa có |
| Lint | chưa có |
| Typecheck | chưa có |
| Test | chưa có |
| Chạy một file test | chưa có |

### Quy ước file test
Hook dùng regex sau (`TEST_RE`) để nhận diện file test:

```
(^|/)(__tests__|tests?)/|[.](test|spec)[.][^/]+$|(^|/)test_[^/]*[.]py$|_test[.]py$
```

Tức là: mọi file trong thư mục `__tests__/`, `test/`, `tests/`; file `*.test.*`, `*.spec.*`; file Python `test_*.py`, `*_test.py`. Nếu đổi quy ước, sửa regex trong `builder.md` và `tester.md`.
