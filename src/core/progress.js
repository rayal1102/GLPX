import { TOPICS } from './topics.js';

export const MAX_EXAMS = 50;

export function emptyProgress() {
  return { version: 1, questions: {}, exams: [] };
}

export function recordAnswer(p, id, isCorrect, now = Date.now()) {
  const prev = p.questions[id] ?? { attempts: 0, correct: 0 };
  return {
    ...p,
    questions: {
      ...p.questions,
      [id]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        lastCorrect: Boolean(isCorrect),
        lastAt: now,
      },
    },
  };
}

export function recordExam(p, result, now = Date.now()) {
  const entry = {
    at: now,
    score: result.score,
    total: result.total,
    passed: result.passed,
    failedCritical: result.failedCritical,
    durationSec: result.durationSec ?? 0,
    wrongIds: [...result.wrongIds],
  };
  return { ...p, exams: [...p.exams, entry].slice(-MAX_EXAMS) };
}

export function wrongIds(p, filterIds) {
  const allowed = filterIds ? new Set(filterIds) : null;
  return Object.keys(p.questions)
    .map(Number)
    .filter((id) => p.questions[id].lastCorrect === false && (!allowed || allowed.has(id)))
    .sort((a, b) => a - b);
}

function groupStats(p, list) {
  const stat = { total: list.length, seen: 0, mastered: 0, wrong: 0 };
  for (const q of list) {
    const rec = p.questions[q.id];
    if (!rec || rec.attempts < 1) continue;
    stat.seen++;
    if (rec.lastCorrect) stat.mastered++;
    else stat.wrong++;
  }
  return stat;
}

export function computeStats(p, questions) {
  const topics = {};
  for (const t of TOPICS) topics[t.key] = groupStats(p, questions.filter((q) => q.topic === t.key));
  const exams = p.exams;
  return {
    topics,
    critical: groupStats(p, questions.filter((q) => q.critical)),
    overall: groupStats(p, questions),
    exams: {
      count: exams.length,
      passed: exams.filter((e) => e.passed).length,
      lastScores: exams.slice(-10).map((e) => e.score),
    },
  };
}
