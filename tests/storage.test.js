import { describe, it, expect } from 'vitest';
import { STORAGE_KEY, loadProgress, saveProgress, clearProgress } from '../src/core/storage.js';
import { emptyProgress, recordAnswer } from '../src/core/progress.js';

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
  };
}

describe('storage', () => {
  it('key có version', () => {
    expect(STORAGE_KEY).toBe('gplxb.progress.v1');
  });
  it('key không tồn tại -> rỗng', () => {
    expect(loadProgress(memStorage())).toEqual(emptyProgress());
  });
  it('ghi rồi đọc lại', () => {
    const s = memStorage();
    const p = recordAnswer(emptyProgress(), 7, true, 123);
    expect(saveProgress(s, p)).toBe(true);
    expect(loadProgress(s)).toEqual(p);
  });
  it('JSON hỏng, sai version, sai cấu trúc -> rỗng, không ném', () => {
    const bad = [
      '{not json',
      '{"version":2,"questions":{},"exams":[]}',
      'null',
      '123',
      '[]',
      '{"version":1,"questions":[],"exams":[]}',
      '{"version":1,"questions":{},"exams":{}}',
      '{"version":1}',
    ];
    for (const raw of bad) {
      expect(loadProgress(memStorage({ [STORAGE_KEY]: raw }))).toEqual(emptyProgress());
    }
  });
  it('storage ném lỗi -> không ném ra ngoài', () => {
    const boom = {
      getItem() { throw new Error('x'); },
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('x'); },
    };
    expect(loadProgress(boom)).toEqual(emptyProgress());
    expect(saveProgress(boom, emptyProgress())).toBe(false);
    expect(() => clearProgress(boom)).not.toThrow();
  });
  it('bỏ từng mục hỏng nhưng giữ mục hợp lệ', () => {
    const raw = JSON.stringify({
      version: 1,
      questions: { 1: null, 2: { attempts: 1, correct: 1, lastCorrect: true, lastAt: 5 }, 3: { attempts: 'x' } },
      exams: [null, { at: 1, score: 28, total: 30, passed: true }, { score: 1 }],
    });
    const p = loadProgress(memStorage({ [STORAGE_KEY]: raw }));
    expect(Object.keys(p.questions)).toEqual(['2']);
    expect(p.exams).toEqual([{ at: 1, score: 28, total: 30, passed: true, failedCritical: false, durationSec: 0, wrongIds: [] }]);
  });
  it('bỏ khóa id không phải số nguyên dương', () => {
    const rec = { attempts: 1, correct: 0, lastCorrect: false, lastAt: 1 };
    const raw = JSON.stringify({ version: 1, questions: { abc: rec, '01': rec, 0: rec, 5: rec }, exams: [] });
    expect(Object.keys(loadProgress(memStorage({ [STORAGE_KEY]: raw })).questions)).toEqual(['5']);
  });
  it('clearProgress xóa tiến độ', () => {
    const s = memStorage();
    saveProgress(s, recordAnswer(emptyProgress(), 1, true, 1));
    clearProgress(s);
    expect(loadProgress(s)).toEqual(emptyProgress());
  });
});
