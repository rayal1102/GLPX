import { describe, it, expect } from 'vitest';
import { createRng, buildPools, generateExam, gradeExam, remainingSeconds, formatMMSS } from '../src/core/exam.js';
import { TOPICS, CRITICAL_IDS, EXAM_BLUEPRINT, topicOf } from '../src/core/topics.js';

const critSet = new Set(CRITICAL_IDS);
function fakeQuestions() {
  const qs = [];
  for (let id = 1; id <= 600; id++) {
    qs.push({ id, topic: topicOf(id), critical: critSet.has(id), text: 't' + id, options: ['a', 'b', 'c'], answerIndex: id % 3, image: null });
  }
  return qs;
}
const questions = fakeQuestions();
const byId = new Map(questions.map((q) => [q.id, q]));

describe('topics constants', () => {
  it('có 60 câu điểm liệt khác nhau và blueprint tổng 30', () => {
    expect(CRITICAL_IDS.length).toBe(60);
    expect(new Set(CRITICAL_IDS).size).toBe(60);
    expect(EXAM_BLUEPRINT.reduce((s, b) => s + b.count, 0)).toBe(30);
  });
  it('topicOf theo khoảng số câu', () => {
    expect(topicOf(1)).toBe('quy-dinh');
    expect(topicOf(180)).toBe('quy-dinh');
    expect(topicOf(181)).toBe('van-hoa');
    expect(topicOf(300)).toBe('cau-tao');
    expect(topicOf(301)).toBe('bien-bao');
    expect(topicOf(600)).toBe('sa-hinh');
    expect(topicOf(601)).toBeNull();
    expect(TOPICS.length).toBe(6);
  });
});

describe('generateExam', () => {
  it('đúng phân bổ, không trùng, tăng dần với 250 seed', () => {
    for (let seed = 1; seed <= 250; seed++) {
      const ids = generateExam(questions, createRng(seed));
      expect(ids.length).toBe(30);
      expect(new Set(ids).size).toBe(30);
      expect([...ids].sort((a, b) => a - b)).toEqual(ids);
      expect(ids.filter((i) => critSet.has(i)).length).toBe(1);
      const cnt = {};
      for (const i of ids.filter((x) => !critSet.has(x))) cnt[topicOf(i)] = (cnt[topicOf(i)] ?? 0) + 1;
      expect(cnt['quy-dinh']).toBe(8);
      expect(cnt['van-hoa']).toBe(1);
      expect(cnt['ky-thuat']).toBe(1);
      expect(cnt['cau-tao']).toBe(1);
      expect(cnt['bien-bao']).toBe(9);
      expect(cnt['sa-hinh']).toBe(9);
    }
  });
  it('cùng seed cùng đề, khác seed thường khác đề', () => {
    expect(generateExam(questions, createRng(42))).toEqual(generateExam(questions, createRng(42)));
    expect(generateExam(questions, createRng(1))).not.toEqual(generateExam(questions, createRng(2)));
  });
  it('dùng Math.random mặc định vẫn hợp lệ', () => {
    expect(generateExam(questions).length).toBe(30);
  });
  it('ném lỗi khi pool thiếu câu', () => {
    const few = questions.filter((q) => q.topic !== 'cau-tao');
    expect(() => generateExam(few, createRng(1))).toThrow();
    const noCrit = questions.map((q) => ({ ...q, critical: false }));
    expect(() => generateExam(noCrit, createRng(1))).toThrow();
  });
  it('buildPools tách rời, câu điểm liệt chỉ nằm trong pool critical', () => {
    const pools = buildPools(questions);
    expect(pools.critical.length).toBe(60);
    const all = Object.values(pools).flat();
    expect(all.length).toBe(600);
    expect(new Set(all).size).toBe(600);
    for (const k of Object.keys(pools)) {
      if (k !== 'critical') for (const id of pools[k]) expect(critSet.has(id)).toBe(false);
    }
  });
});

describe('createRng', () => {
  it('trả về số trong [0,1) và lặp lại được', () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      expect(x).toBe(b());
    }
  });
});

describe('gradeExam', () => {
  const examIds = generateExam(questions, createRng(5));
  const critId = examIds.find((i) => critSet.has(i));
  const correctAll = () => Object.fromEntries(examIds.map((i) => [i, byId.get(i).answerIndex]));
  const wrongOf = (i) => (byId.get(i).answerIndex + 1) % 3;

  it('30 đúng -> đạt', () => {
    const r = gradeExam(byId, examIds, correctAll());
    expect(r).toMatchObject({ score: 30, total: 30, failedCritical: false, passed: true });
    expect(r.wrongIds).toEqual([]);
    expect(r.unansweredIds).toEqual([]);
  });
  it('27 đúng, điểm liệt đúng -> đạt', () => {
    const a = correctAll();
    for (const i of examIds.filter((x) => x !== critId).slice(0, 3)) a[i] = wrongOf(i);
    const r = gradeExam(byId, examIds, a);
    expect(r.score).toBe(27);
    expect(r.passed).toBe(true);
  });
  it('26 đúng -> không đạt', () => {
    const a = correctAll();
    for (const i of examIds.filter((x) => x !== critId).slice(0, 4)) a[i] = wrongOf(i);
    const r = gradeExam(byId, examIds, a);
    expect(r.score).toBe(26);
    expect(r.passed).toBe(false);
    expect(r.failedCritical).toBe(false);
  });
  it('29 đúng nhưng sai điểm liệt -> không đạt, failedCritical', () => {
    const a = correctAll();
    a[critId] = wrongOf(critId);
    const r = gradeExam(byId, examIds, a);
    expect(r.score).toBe(29);
    expect(r.failedCritical).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.wrongIds).toEqual([critId]);
  });
  it('bỏ trống điểm liệt tính là sai điểm liệt', () => {
    const a = correctAll();
    delete a[critId];
    const r = gradeExam(byId, examIds, a);
    expect(r.failedCritical).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.unansweredIds).toEqual([critId]);
    expect(r.wrongIds).toContain(critId);
  });
  it('bỏ trống tính sai; đề trống = 0 điểm; chấp nhận object thường', () => {
    const obj = Object.fromEntries(byId);
    const r = gradeExam(obj, examIds, {});
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
    expect(r.unansweredIds.length).toBe(30);
    expect(r.wrongIds.length).toBe(30);
  });
  it('đáp án index 0 được tính là đã trả lời', () => {
    const q = examIds.find((i) => byId.get(i).answerIndex === 0 && !critSet.has(i));
    const r = gradeExam(byId, examIds, { [q]: 0 });
    expect(r.score).toBe(1);
    expect(r.unansweredIds).not.toContain(q);
  });
});

describe('remainingSeconds / formatMMSS', () => {
  it('1200 khi vừa bắt đầu, giảm dần, 0 khi quá giờ, không âm', () => {
    expect(remainingSeconds(1000, 1000)).toBe(1200);
    expect(remainingSeconds(1000, 1000 + 60000)).toBe(1140);
    expect(remainingSeconds(1000, 1000 + 1200000)).toBe(0);
    expect(remainingSeconds(1000, 1000 + 5000000)).toBe(0);
  });
  it('now trước startedAt không vượt quá thời lượng', () => {
    expect(remainingSeconds(5000, 1000)).toBe(1200);
  });
  it('formatMMSS', () => {
    expect(formatMMSS(1200)).toBe('20:00');
    expect(formatMMSS(65)).toBe('01:05');
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(-5)).toBe('00:00');
  });
});
