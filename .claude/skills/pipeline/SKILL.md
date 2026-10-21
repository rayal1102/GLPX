---
name: pipeline
description: Chạy dây chuyền architect → builder → tester + reviewer cho một yêu cầu. Cờ --auto bỏ qua bước duyệt plan, --quick bỏ qua architect cho việc nhỏ.
disable-model-invocation: true
---

# /pipeline

Yêu cầu của người dùng: `$ARGUMENTS`

Tách các cờ `--auto` và `--quick` ra khỏi `$ARGUMENTS`; phần còn lại là **yêu cầu**. Nếu yêu cầu rỗng, hỏi người dùng muốn làm gì rồi dừng.

**Quy tắc khi giao việc cho subagent:** subagent KHÔNG nhìn thấy cuộc trò chuyện này. Mỗi lời giao việc phải ghi rõ:
- đường dẫn `RUN_DIR` (tương đối so với gốc dự án),
- tên các file cần đọc trong `RUN_DIR`,
- việc cần làm và file đầu ra.

Phiên chính KHÔNG tự sửa code nguồn trong lúc chạy pipeline (trừ khi viết PLAN.md ở chế độ `--quick`). KHÔNG commit, KHÔNG push.

## 0. Chuẩn bị
1. Chạy `git rev-parse --is-inside-work-tree`. Nếu dự án chưa dùng git: DỪNG và hỏi người dùng có muốn khởi tạo git không (nếu đồng ý: `git init`, rồi cần ít nhất một commit gốc – hỏi người dùng trước khi commit). Không tiếp tục khi chưa có commit gốc.
2. Chạy `git status --porcelain`. Nếu có thay đổi chưa commit: liệt kê cho người dùng và hỏi có tiếp tục không. Chỉ tiếp tục khi người dùng đồng ý.
3. Tạo `RUN_DIR=.claude/pipeline/runs/<YYYYMMDD-HHMM>-<slug>/` (lấy thời gian bằng `date +%Y%m%d-%H%M`; `slug` là 2–5 từ tiếng Anh không dấu, viết thường, nối bằng `-`, tóm tắt yêu cầu).
4. Ghi `git rev-parse HEAD` vào `RUN_DIR/BASE`.
5. Ghi yêu cầu gốc (nguyên văn) và các cờ vào `RUN_DIR/REQUEST.md`.

## 1. Lập kế hoạch
**Nếu có `--quick`:** không gọi architect. Phiên chính tự đọc phần code liên quan rồi viết `RUN_DIR/PLAN.md` ngắn gồm: Mục tiêu, File cần sửa, Acceptance criteria (checklist đo được), Kế hoạch test (1–3 dòng). Dòng cuối `STATUS: READY`. Chuyển sang bước 2 (vẫn tóm tắt cho người dùng trong 3–5 dòng, không chờ duyệt).

**Bình thường:**
1. Gọi subagent `architect`: "RUN_DIR=<...>. Đọc RUN_DIR/REQUEST.md. Yêu cầu: <yêu cầu>. Viết RUN_DIR/PLAN.md theo đúng cấu trúc trong định nghĩa agent."
2. Đọc dòng cuối của PLAN.md.
   - Nếu `STATUS: NEEDS_INPUT`: TỰ hỏi người dùng các câu hỏi mở trong PLAN.md (dùng AskUserQuestion nếu có), ghi câu hỏi và câu trả lời vào mục "Làm rõ" trong REQUEST.md, rồi gọi lại architect. Lặp tối đa 2 lần; sau đó vẫn NEEDS_INPUT thì dừng và báo.
   - Nếu không có dòng STATUS hợp lệ: gọi lại architect một lần, yêu cầu hoàn thiện file.
3. Tóm tắt plan cho người dùng trong tối đa 10 dòng (mục tiêu, phạm vi, file sẽ đổi, kích cỡ, thư viện mới nếu có).
4. Nếu KHÔNG có `--auto`: CHỜ người dùng duyệt. Nếu người dùng yêu cầu sửa plan: ghi góp ý vào REQUEST.md và gọi lại architect.

## 2. Triển khai
Gọi subagent `builder`: "RUN_DIR=<...>. Đọc RUN_DIR/PLAN.md. Triển khai theo plan, cập nhật RUN_DIR/PROGRESS.md."

Đọc dòng cuối PROGRESS.md:
- `STATUS: BLOCKED`: đưa lý do và đề xuất cho người dùng. Nếu lý do là plan sai và người dùng đồng ý, gọi architect sửa PLAN.md (ghi lý do vào REQUEST.md) rồi gọi lại builder. Không tự lách.
- `STATUS: DONE`: sang bước 3.

## 3. Kiểm chứng
Gọi SONG SONG (trong cùng một lượt) hai subagent:
- `tester`: "RUN_DIR=<...>. Đọc RUN_DIR/PLAN.md và RUN_DIR/PROGRESS.md. Viết/cập nhật test theo acceptance criteria, chạy toàn bộ test/build/lint/typecheck, viết RUN_DIR/TEST_REPORT.md."
- `reviewer`: "RUN_DIR=<...>. Đọc RUN_DIR/BASE, RUN_DIR/PLAN.md, RUN_DIR/PROGRESS.md. Review toàn bộ thay đổi so với BASE, viết RUN_DIR/REVIEW.md."

Đọc dòng `VERDICT:` cuối mỗi báo cáo.

## 4. Vòng sửa lỗi
- Nếu có bất kỳ `NEEDS_INPUT` nào: DỪNG, đưa nội dung cần làm rõ cho người dùng.
- Nếu tester `VERDICT: FAIL` hoặc reviewer `VERDICT: CHANGES_REQUESTED`:
  1. Lưu bản sao báo cáo của vòng này: `TEST_REPORT.r<N>.md`, `REVIEW.r<N>.md` trong RUN_DIR (để so sánh giữa các vòng).
  2. So với vòng trước: nếu cùng một lỗi (cùng test fail hoặc cùng mục 🔴 ở cùng chỗ) xuất hiện 2 vòng liên tiếp → DỪNG và báo người dùng.
  3. Gọi `builder`: "RUN_DIR=<...>. Vòng sửa lỗi N. Đọc RUN_DIR/PLAN.md, RUN_DIR/TEST_REPORT.md, RUN_DIR/REVIEW.md. Chỉ sửa các lỗi test fail và mọi mục 🔴; ghi từng mục đã sửa ra sao vào PROGRESS.md."
  4. Chạy lại bước 3.
- Tối đa 3 vòng sửa lỗi. Hết 3 vòng mà chưa đạt: DỪNG và báo người dùng tình trạng hiện tại.
- Khi tester `VERDICT: PASS` và reviewer `VERDICT: APPROVE`: sang bước 5.

## 5. Kết thúc
1. Phiên chính TỰ chạy lại lệnh test và build của dự án (xem CLAUDE.md) một lần để xác nhận. Không chỉ dựa vào báo cáo của agent. Nếu kết quả khác báo cáo, nói rõ cho người dùng.
2. Báo cáo cho người dùng:
   - Danh sách file đã đổi (`git status --porcelain`, bỏ qua `.claude/pipeline/`).
   - Kết quả test và build vừa chạy.
   - Các mục 🟡/🟢 còn lại trong REVIEW.md.
   - Đề xuất commit message theo Conventional Commits (`feat:`, `fix:`, `refactor:`…).
   - Đường dẫn RUN_DIR.
3. KHÔNG tự commit hay push.
