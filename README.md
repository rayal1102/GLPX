# Ôn thi lý thuyết GPLX hạng B (600 câu) - offline

Web app tĩnh để ôn 600 câu lý thuyết hạng B theo chủ đề, xem báo cáo tiến độ và thi thử (30 câu, 20 phút, đạt khi đúng từ 27 câu và không sai câu điểm liệt).

## Cách dùng offline

1. Cài Node.js >= 18, chạy `npm install` rồi `npm run build`.
2. Mở `dist/index.html` bằng double-click (Chrome hoặc Edge). Giữ nguyên thư mục `images/` nằm cạnh `index.html`. Không cần mạng hay server.

Tiến độ lưu trong `localStorage` của trình duyệt. Nếu dời thư mục `dist/` (đặc biệt trên Firefox) thì tiến độ có thể không còn. Tải lại trang khi đang thi sẽ làm mất bài thi hiện tại.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build ra `dist/index.html` + `dist/images/` |
| `npm test` | Chạy unit test (Vitest) |
| `npm run scrape` | Thu thập lại dữ liệu (có cache ở `.cache/scrape/`, `-- --only=1-30` để chạy thử, kết quả ghi ra `.cache/questions.partial.json`) |
| `npm run verify-data` | Kiểm tra tính toàn vẹn của `src/data/questions.json` và ảnh |

## Nguồn dữ liệu

Câu hỏi, đáp án và ảnh được thu thập một lần từ https://hoclaixehcm.vn (xem trường `scrapedAt` trong `src/data/questions.json`). Đáp án được đối chiếu chéo giữa trang chi tiết và trang danh sách. Dữ liệu bên thứ ba có thể sai hoặc cũ, hãy đối chiếu với tài liệu chính thức của Cục CSGT khi cần. Ứng dụng chỉ dành cho cá nhân học tập, không triển khai công khai vì ảnh và cách trình bày thuộc trang nguồn.
