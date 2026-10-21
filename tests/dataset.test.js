import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from '../scripts/lib/validate.mjs';
import { generateExam, gradeExam, createRng } from '../src/core/exam.js';
import { CRITICAL_IDS, topicOf } from '../src/core/topics.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/questions.json'), 'utf8'));
const questions = data.questions;
const imageExists = (p) => fs.existsSync(path.join(root, 'public', p));

describe('dữ liệu thật', () => {
  it('validateDataset không lỗi', () => {
    const r = validateDataset(questions, { imageExists });
    expect(r.errors).toEqual([]);
    expect(r.counts).toMatchObject({
      total: 600, critical: 60, 'quy-dinh': 180, 'van-hoa': 25, 'ky-thuat': 58, 'cau-tao': 37, 'bien-bao': 185, 'sa-hinh': 115,
    });
  });
  it('id 1..600, chủ đề khớp khoảng số câu, tập điểm liệt = CRITICAL_IDS', () => {
    expect(questions.map((q) => q.id)).toEqual(Array.from({ length: 600 }, (_, i) => i + 1));
    for (const q of questions) expect(q.topic).toBe(topicOf(q.id));
    expect(questions.filter((q) => q.critical).map((q) => q.id)).toEqual([...CRITICAL_IDS].sort((a, b) => a - b));
  });
  it('không phương án nào chứa "Đáp án chính xác", answerIndex hợp lệ', () => {
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      for (const o of q.options) expect(o).not.toMatch(/Đáp án chính xác/i);
    }
  });
  it('generateExam + gradeExam trên dữ liệu thật', () => {
    const byId = new Map(questions.map((q) => [q.id, q]));
    for (let seed = 1; seed <= 50; seed++) {
      const ids = generateExam(questions, createRng(seed));
      expect(ids.length).toBe(30);
      expect(ids.filter((i) => byId.get(i).critical).length).toBe(1);
      const answers = Object.fromEntries(ids.map((i) => [i, byId.get(i).answerIndex]));
      expect(gradeExam(byId, ids, answers).passed).toBe(true);
    }
  });
});

describe('dist (nếu đã build)', () => {
  const html = path.join(root, 'dist/index.html');
  const run = fs.existsSync(html) ? it : it.skip;
  run('không có script src / link stylesheet ngoài, số ảnh khớp', () => {
    const s = fs.readFileSync(html, 'utf8');
    expect(s).not.toMatch(/<script[^>]*\ssrc=/i);
    expect(s).not.toMatch(/<link[^>]*rel=["']?stylesheet/i);
    const n = fs.readdirSync(path.join(root, 'dist/images')).length;
    expect(n).toBe(questions.filter((q) => q.image).length);
  });
});
