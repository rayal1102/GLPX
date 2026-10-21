import { emptyProgress } from './progress.js';

export const STORAGE_KEY = 'gplxb.progress.v1';

function isValid(p) {
  return (
    p !== null &&
    typeof p === 'object' &&
    p.version === 1 &&
    p.questions !== null &&
    typeof p.questions === 'object' &&
    !Array.isArray(p.questions) &&
    Array.isArray(p.exams)
  );
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function validRecord(r) {
  return isObj(r) && isNum(r.attempts) && isNum(r.correct) && typeof r.lastCorrect === 'boolean';
}

function validExam(e) {
  return isObj(e) && isNum(e.at) && isNum(e.score) && isNum(e.total) && typeof e.passed === 'boolean';
}

// Bỏ từng mục hỏng thay vì xóa sạch tiến độ, để UI không crash khi localStorage bị sửa tay.
function sanitize(p) {
  const questions = {};
  for (const [id, rec] of Object.entries(p.questions)) {
    if (/^[1-9]\d*$/.test(id) && validRecord(rec)) questions[id] = rec;
  }
  const exams = p.exams
    .filter(validExam)
    .map((e) => ({
      ...e,
      failedCritical: Boolean(e.failedCritical),
      durationSec: isNum(e.durationSec) ? e.durationSec : 0,
      wrongIds: Array.isArray(e.wrongIds) ? e.wrongIds.filter(isNum) : [],
    }));
  return { ...p, questions, exams };
}

export function loadProgress(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return emptyProgress();
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? sanitize(parsed) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

// Trả về true nếu ghi thành công (localStorage có thể bị chặn hoặc đầy).
export function saveProgress(storage, p) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(storage) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // bỏ qua: không xóa được thì lần tải sau vẫn đọc an toàn
  }
}
