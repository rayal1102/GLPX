import { EXAM_BLUEPRINT, EXAM_DURATION_SEC, EXAM_SIZE, PASS_SCORE } from './topics.js';

// mulberry32: bộ sinh số giả ngẫu nhiên có seed, trả về số trong [0, 1).
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Câu điểm liệt chỉ nằm trong pool "critical", bị loại khỏi pool các chủ đề.
export function buildPools(questions) {
  const pools = { critical: [] };
  for (const q of questions) {
    const key = q.critical ? 'critical' : q.topic;
    (pools[key] ??= []).push(q.id);
  }
  return pools;
}

function sample(arr, count, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function generateExam(questions, rng = Math.random) {
  const pools = buildPools(questions);
  const ids = [];
  for (const { pool, count } of EXAM_BLUEPRINT) {
    const available = pools[pool] ?? [];
    if (available.length < count) {
      throw new Error(`Không đủ câu để tạo đề: nhóm "${pool}" có ${available.length}, cần ${count}`);
    }
    ids.push(...sample(available, count, rng));
  }
  return ids.sort((a, b) => a - b);
}

function lookup(questionsById, id) {
  return questionsById instanceof Map ? questionsById.get(id) : questionsById[id];
}

// answers: map id -> index lựa chọn; thiếu nghĩa là bỏ trống (tính sai).
export function gradeExam(questionsById, examIds, answers) {
  let score = 0;
  let failedCritical = false;
  const wrongIds = [];
  const unansweredIds = [];
  for (const id of examIds) {
    const q = lookup(questionsById, id);
    const chosen = answers[id];
    const answered = chosen !== undefined && chosen !== null;
    if (!answered) unansweredIds.push(id);
    if (answered && q.answerIndex === chosen) {
      score++;
    } else {
      wrongIds.push(id);
      if (q.critical) failedCritical = true;
    }
  }
  return {
    score,
    total: EXAM_SIZE,
    failedCritical,
    passed: score >= PASS_SCORE && !failedCritical,
    wrongIds,
    unansweredIds,
  };
}

export function remainingSeconds(startedAt, now, duration = EXAM_DURATION_SEC) {
  const left = Math.ceil((startedAt + duration * 1000 - now) / 1000);
  return Math.min(duration, Math.max(0, left));
}

export function formatMMSS(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
