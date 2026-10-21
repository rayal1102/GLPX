import { TOPICS, CRITICAL_IDS, TOTAL_QUESTIONS, topicOf } from '../../src/core/topics.js';

const EXPECTED_BY_TOPIC = Object.fromEntries(TOPICS.map((t) => [t.key, t.to - t.from + 1]));

export function validateDataset(questions, { imageExists = () => true } = {}) {
  const errors = [];
  const warnings = [];
  const counts = Object.fromEntries(TOPICS.map((t) => [t.key, 0]));
  counts.total = questions.length;
  counts.critical = 0;
  counts.withImage = 0;

  if (questions.length !== TOTAL_QUESTIONS) {
    errors.push(`Số câu là ${questions.length}, cần ${TOTAL_QUESTIONS}`);
  }

  const seen = new Set();
  for (const q of questions) {
    if (seen.has(q.id)) errors.push(`Trùng id ${q.id}`);
    seen.add(q.id);
    if (!Number.isInteger(q.id) || q.id < 1 || q.id > TOTAL_QUESTIONS) {
      errors.push(`Id ngoài phạm vi 1..${TOTAL_QUESTIONS}: ${q.id}`);
    }
    if (typeof q.text !== 'string' || q.text.trim() === '') errors.push(`Câu ${q.id}: text rỗng`);
    const nOpt = Array.isArray(q.options) ? q.options.length : 0;
    if (nOpt < 2 || nOpt > 4) errors.push(`Câu ${q.id}: có ${nOpt} phương án (cần 2-4)`);
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= nOpt) {
      errors.push(`Câu ${q.id}: answerIndex ${q.answerIndex} ngoài phạm vi`);
    }
    if (Array.isArray(q.options) && q.options.some((o) => typeof o !== 'string' || o.trim() === '')) {
      errors.push(`Câu ${q.id}: có phương án rỗng`);
    }
    if (q.topic in counts) counts[q.topic]++;
    else errors.push(`Câu ${q.id}: chủ đề không hợp lệ "${q.topic}"`);
    if (q.topic !== topicOf(q.id)) errors.push(`Câu ${q.id}: chủ đề "${q.topic}" không khớp khoảng số câu`);
    if (q.critical) counts.critical++;
    if (q.image) {
      counts.withImage++;
      if (!imageExists(q.image)) errors.push(`Câu ${q.id}: thiếu file ảnh ${q.image}`);
    } else if (q.id >= 301 && q.id <= 600) {
      warnings.push(`Câu ${q.id}: không có ảnh`);
    }
  }

  for (const [key, expected] of Object.entries(EXPECTED_BY_TOPIC)) {
    if (counts[key] !== expected) errors.push(`Chủ đề ${key}: ${counts[key]} câu, cần ${expected}`);
  }

  const criticalSet = new Set(questions.filter((q) => q.critical).map((q) => q.id));
  const expectedCritical = new Set(CRITICAL_IDS);
  const missing = CRITICAL_IDS.filter((id) => !criticalSet.has(id));
  const extra = [...criticalSet].filter((id) => !expectedCritical.has(id));
  if (missing.length || extra.length) {
    errors.push(
      `Tập câu điểm liệt không khớp (thiếu: ${missing.join(',') || '-'}; thừa: ${extra.join(',') || '-'})`,
    );
  }

  return { errors, warnings, counts };
}
