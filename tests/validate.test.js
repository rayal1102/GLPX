import { describe, it, expect } from 'vitest';
import { validateDataset } from '../scripts/lib/validate.mjs';
import { CRITICAL_IDS, topicOf } from '../src/core/topics.js';

const crit = new Set(CRITICAL_IDS);
function valid() {
  return Array.from({ length: 600 }, (_, i) => {
    const id = i + 1;
    return {
      id,
      topic: topicOf(id),
      critical: crit.has(id),
      text: 'Câu ' + id,
      options: ['a', 'b', 'c'],
      answerIndex: 1,
      image: id >= 301 ? `images/${id}.jpg` : null,
    };
  });
}

describe('validateDataset', () => {
  it('dataset hợp lệ -> không lỗi, không cảnh báo, đếm đúng', () => {
    const r = validateDataset(valid(), { imageExists: () => true });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.counts).toMatchObject({
      'quy-dinh': 180, 'van-hoa': 25, 'ky-thuat': 58, 'cau-tao': 37, 'bien-bao': 185, 'sa-hinh': 115,
      total: 600, critical: 60, withImage: 300,
    });
  });
  it('mặc định imageExists luôn true', () => {
    expect(validateDataset(valid()).errors).toEqual([]);
  });
  it('thiếu câu', () => {
    const r = validateDataset(valid().slice(0, 599));
    expect(r.errors.join('\n')).toMatch(/599/);
  });
  it('trùng id', () => {
    const q = valid();
    q[5] = { ...q[5], id: 1 };
    expect(validateDataset(q).errors.join('\n')).toMatch(/Trùng id 1/);
  });
  it('sai số câu theo chủ đề', () => {
    const q = valid();
    q[10] = { ...q[10], topic: 'van-hoa' };
    expect(validateDataset(q).errors.join('\n')).toMatch(/quy-dinh|van-hoa/);
  });
  it('sai tập điểm liệt', () => {
    const q = valid();
    q[18] = { ...q[18], critical: false };
    q[99] = { ...q[99], critical: true };
    const e = validateDataset(q).errors.join('\n');
    expect(e).toMatch(/điểm liệt/);
    expect(e).toMatch(/19/);
    expect(e).toMatch(/100/);
  });
  it('thiếu file ảnh', () => {
    const r = validateDataset(valid(), { imageExists: (p) => p !== 'images/400.jpg' });
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toMatch(/400/);
  });
  it('phương án/answerIndex/text không hợp lệ', () => {
    const bad = [{ options: ['a'] }, { options: ['a', 'b', 'c', 'd', 'e'] }, { answerIndex: 3 }, { text: '  ' }];
    for (const patch of bad) {
      const q = valid();
      q[0] = { ...q[0], ...patch };
      expect(validateDataset(q).errors.length).toBeGreaterThan(0);
    }
  });
  it('câu 301-600 thiếu ảnh chỉ cảnh báo', () => {
    const q = valid();
    q[400] = { ...q[400], image: null };
    const r = validateDataset(q);
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });
});
