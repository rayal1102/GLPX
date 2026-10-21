import { describe, it, expect } from 'vitest';
import { emptyProgress, recordAnswer, recordExam, computeStats, wrongIds } from '../src/core/progress.js';

const qs = [
  { id: 1, topic: 'quy-dinh', critical: false },
  { id: 19, topic: 'quy-dinh', critical: true },
  { id: 200, topic: 'van-hoa', critical: false },
  { id: 301, topic: 'bien-bao', critical: false },
];
const result = (score = 28, extra = {}) => ({ score, total: 30, passed: score >= 27, failedCritical: false, durationSec: 900, wrongIds: [3, 4], ...extra });

describe('recordAnswer', () => {
  it('đếm attempts/correct và lastCorrect', () => {
    let p = emptyProgress();
    p = recordAnswer(p, 5, true, 100);
    p = recordAnswer(p, 5, false, 200);
    p = recordAnswer(p, 5, true, 300);
    expect(p.questions[5]).toEqual({ attempts: 3, correct: 2, lastCorrect: true, lastAt: 300 });
    p = recordAnswer(p, 5, false, 400);
    expect(p.questions[5].lastCorrect).toBe(false);
    expect(p.questions[5].attempts).toBe(4);
  });
  it('không mutate đầu vào', () => {
    const p = emptyProgress();
    const snap = JSON.stringify(p);
    const p2 = recordAnswer(p, 1, true, 1);
    expect(JSON.stringify(p)).toBe(snap);
    expect(p2).not.toBe(p);
    const before = JSON.stringify(p2);
    recordAnswer(p2, 1, false, 2);
    expect(JSON.stringify(p2)).toBe(before);
  });
});

describe('recordExam', () => {
  it('thêm bài thi với đầy đủ trường, không mutate', () => {
    const p = emptyProgress();
    const r = result();
    const p2 = recordExam(p, r, 999);
    expect(p.exams.length).toBe(0);
    expect(p2.exams[0]).toEqual({ at: 999, score: 28, total: 30, passed: true, failedCritical: false, durationSec: 900, wrongIds: [3, 4] });
    r.wrongIds.push(99);
    expect(p2.exams[0].wrongIds).toEqual([3, 4]);
  });
  it('giữ tối đa 50 bài gần nhất', () => {
    let p = emptyProgress();
    for (let i = 0; i < 60; i++) p = recordExam(p, result(i % 31), i);
    expect(p.exams.length).toBe(50);
    expect(p.exams[0].at).toBe(10);
    expect(p.exams[49].at).toBe(59);
  });
});

describe('wrongIds', () => {
  it('chỉ lấy câu lần gần nhất sai, tăng dần, có thể lọc', () => {
    let p = emptyProgress();
    p = recordAnswer(p, 301, false, 1);
    p = recordAnswer(p, 1, false, 2);
    p = recordAnswer(p, 1, true, 3);
    p = recordAnswer(p, 19, false, 4);
    p = recordAnswer(p, 200, false, 5);
    expect(wrongIds(p)).toEqual([19, 200, 301]);
    expect(wrongIds(p, [19, 301, 1])).toEqual([19, 301]);
    expect(wrongIds(emptyProgress())).toEqual([]);
  });
});

describe('computeStats', () => {
  it('đếm seen/mastered/wrong theo chủ đề, điểm liệt, tổng', () => {
    let p = emptyProgress();
    p = recordAnswer(p, 1, true, 1);
    p = recordAnswer(p, 19, false, 2);
    p = recordAnswer(p, 19, true, 3);
    p = recordAnswer(p, 200, false, 4);
    p = recordExam(p, result(28), 5);
    p = recordExam(p, result(10), 6);
    const s = computeStats(p, qs);
    expect(s.topics['quy-dinh']).toEqual({ total: 2, seen: 2, mastered: 2, wrong: 0 });
    expect(s.topics['van-hoa']).toEqual({ total: 1, seen: 1, mastered: 0, wrong: 1 });
    expect(s.topics['bien-bao']).toEqual({ total: 1, seen: 0, mastered: 0, wrong: 0 });
    expect(s.topics['sa-hinh'].total).toBe(0);
    expect(s.critical).toEqual({ total: 1, seen: 1, mastered: 1, wrong: 0 });
    expect(s.overall).toEqual({ total: 4, seen: 3, mastered: 2, wrong: 1 });
    expect(s.exams).toEqual({ count: 2, passed: 1, lastScores: [28, 10] });
  });
  it('tiến độ rỗng ra toàn 0; lastScores tối đa 10', () => {
    const s = computeStats(emptyProgress(), qs);
    expect(s.overall).toEqual({ total: 4, seen: 0, mastered: 0, wrong: 0 });
    let p = emptyProgress();
    for (let i = 0; i < 15; i++) p = recordExam(p, result(i), i);
    expect(computeStats(p, qs).exams.lastScores).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });
});
