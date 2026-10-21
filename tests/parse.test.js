import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { parseQuestionPage, parseListPage } from '../scripts/lib/parse.mjs';

const sample = (f) => fs.readFileSync(new URL(`../scripts/samples/${f}`, import.meta.url), 'utf8');

describe('parseQuestionPage', () => {
  it('câu thường (q1), không ảnh, không điểm liệt', () => {
    const r = parseQuestionPage(sample('q1.html'), 1);
    expect(r.id).toBe(1);
    expect(r.critical).toBe(false);
    expect(r.options.length).toBe(3);
    expect(r.answerIndex).toBe(1);
    expect(r.imageUrl).toBeNull();
    expect(r.topicLabel).toContain('Khái niệm');
  });
  it('câu điểm liệt (q19)', () => {
    const r = parseQuestionPage(sample('q19.html'), 19);
    expect(r.critical).toBe(true);
    expect(r.options[r.answerIndex]).toBe('Rải vật sắc nhọn, đổ chất gây trơn trượt trên đường bộ.');
  });
  it('câu biển báo có ảnh (q301)', () => {
    const r = parseQuestionPage(sample('q301.html'), 301);
    expect(r.options.length).toBe(4);
    expect(r.answerIndex).toBe(0);
    expect(r.imageUrl).toContain('/images/301.jpg');
    expect(r.topicLabel).toContain('Biển báo');
  });
  it('câu sa hình (q520)', () => {
    const r = parseQuestionPage(sample('q520.html'), 520);
    expect(r.answerIndex).toBe(3);
    expect(r.imageUrl).toContain('/images/520.jpg');
    expect(r.topicLabel).toContain('Sa hình');
  });
  it('phương án không chứa chữ "Đáp án chính xác"', () => {
    for (const [f, n] of [['q1.html', 1], ['q19.html', 19], ['q301.html', 301], ['q520.html', 520]]) {
      const r = parseQuestionPage(sample(f), n);
      for (const o of r.options) expect(o).not.toMatch(/Đáp án chính xác/i);
      expect(r.text).toBe(r.text.trim());
    }
  });
  it('HTML rỗng/lạ hoặc sai số câu -> ném lỗi', () => {
    expect(() => parseQuestionPage('', 1)).toThrow();
    expect(() => parseQuestionPage('<html><body>Just a moment...</body></html>', 5)).toThrow(/5/);
    expect(() => parseQuestionPage(sample('q1.html'), 2)).toThrow();
  });
});

describe('parseListPage', () => {
  it('trang danh sách 1: 24 câu, đúng id và đáp án', () => {
    const l = parseListPage(sample('list-p1.html'));
    expect(l.length).toBe(24);
    expect(l.map((x) => x.id)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(l[0].answerText).toBe('Phần đường xe chạy.');
    expect(l.filter((x) => x.critical).length).toBe(6);
    expect(l.find((x) => x.id === 19).critical).toBe(true);
    expect(l.find((x) => x.id === 1).critical).toBe(false);
  });
  it('khớp với parseQuestionPage cho câu 1 và 19', () => {
    const l = parseListPage(sample('list-p1.html'));
    for (const [f, n] of [['q1.html', 1], ['q19.html', 19]]) {
      const q = parseQuestionPage(sample(f), n);
      const item = l.find((x) => x.id === n);
      expect(item.answerText).toBe(q.options[q.answerIndex]);
      expect(item.critical).toBe(q.critical);
    }
  });
  it('HTML rỗng -> ném lỗi', () => {
    expect(() => parseListPage('<html></html>')).toThrow();
  });
});
