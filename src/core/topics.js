export const TOPICS = [
  { key: 'quy-dinh', name: 'Khái niệm và quy tắc', from: 1, to: 180, label: 'Khái niệm và quy tắc' },
  { key: 'van-hoa', name: 'Văn hóa và đạo đức người lái xe', from: 181, to: 205, label: 'Văn hóa' },
  { key: 'ky-thuat', name: 'Kỹ thuật lái xe', from: 206, to: 263, label: 'Kỹ thuật' },
  { key: 'cau-tao', name: 'Cấu tạo và sửa chữa', from: 264, to: 300, label: 'Cấu tạo' },
  { key: 'bien-bao', name: 'Biển báo đường bộ', from: 301, to: 485, label: 'Biển báo' },
  { key: 'sa-hinh', name: 'Sa hình', from: 486, to: 600, label: 'Sa hình' },
];

export const TOTAL_QUESTIONS = 600;

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export const CRITICAL_IDS = [
  ...range(19, 28), 30, 32, 34, 35, 47, 48, 52, 53, 55, 58,
  ...range(63, 68), ...range(70, 74), ...range(85, 93),
  97, 98, 102, 107, 117, 163, 165, 197, 198,
  206, 215, 226, 234, 245, 246, ...range(252, 255), 260,
];

export const EXAM_SIZE = 30;
export const EXAM_DURATION_SEC = 1200;
export const PASS_SCORE = 27;

export const EXAM_BLUEPRINT = [
  { pool: 'quy-dinh', count: 8 },
  { pool: 'critical', count: 1 },
  { pool: 'van-hoa', count: 1 },
  { pool: 'ky-thuat', count: 1 },
  { pool: 'cau-tao', count: 1 },
  { pool: 'bien-bao', count: 9 },
  { pool: 'sa-hinh', count: 9 },
];

export function topicOf(id) {
  const t = TOPICS.find((x) => id >= x.from && id <= x.to);
  return t ? t.key : null;
}

export function topicName(key) {
  return TOPICS.find((x) => x.key === key)?.name ?? key;
}
