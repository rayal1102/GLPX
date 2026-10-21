// Thu thập một lần 600 câu hạng B từ hoclaixehcm.vn.
// Dùng: npm run scrape [-- --only=1-30]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseQuestionPage, parseListPage, cleanText } from './lib/parse.mjs';
import { TOPICS, topicOf } from '../src/core/topics.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://hoclaixehcm.vn';
const CACHE = path.join(ROOT, '.cache', 'scrape');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const OUT = path.join(ROOT, 'src', 'data', 'questions.json');
// Chạy thử với --only ghi ra đây để không ghi đè bộ 600 câu
const PARTIAL_OUT = path.join(ROOT, '.cache', 'questions.partial.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const DELAY_MS = 400;
const CONCURRENCY = 2;
const LIST_PAGES = 25;

class BlockedError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseOnly() {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  if (!arg) return [1, 600];
  const m = /^--only=(\d+)-(\d+)$/.exec(arg);
  if (!m) throw new Error('--only phải có dạng --only=a-b');
  const from = Number(m[1]);
  const to = Number(m[2]);
  if (!(from >= 1 && from <= to && to <= 600)) throw new Error('--only phải thỏa 1 <= a <= b <= 600');
  return [from, to];
}

async function request(url, binary) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'vi,en;q=0.8' } });
      if (res.status === 403 || res.status === 503) {
        const body = await res.text();
        if (/Just a moment|cf-chl|challenge-platform/i.test(body) || res.status === 403) {
          throw new BlockedError(`Bị chặn (HTTP ${res.status}) khi tải ${url}`);
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
      if (binary) {
        const type = res.headers.get('content-type') ?? '';
        if (!type.startsWith('image/')) throw new Error(`Không phải ảnh (Content-Type "${type}") khi tải ${url}`);
        return Buffer.from(await res.arrayBuffer());
      }
      const text = await res.text();
      if (/<title>\s*Just a moment/i.test(text)) throw new BlockedError(`Trang challenge Cloudflare: ${url}`);
      return text;
    } catch (e) {
      if (e instanceof BlockedError) throw e;
      lastErr = e;
      await sleep(DELAY_MS * 2 ** attempt);
    }
  }
  throw lastErr;
}

async function cachedHtml(file, url) {
  const p = path.join(CACHE, file);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  const html = await request(url, false);
  fs.writeFileSync(p, html);
  await sleep(DELAY_MS);
  return html;
}

async function pool(items, worker) {
  let next = 0;
  const results = new Array(items.length);
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

const norm = (s) => cleanText(s).toLowerCase();

async function main() {
  const [from, to] = parseOnly();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  let done = 0;
  const parsed = await pool(ids, async (n) => {
    const html = await cachedHtml(`q${n}.html`, `${BASE}/cau-hoi/b/${n}/`);
    const q = parseQuestionPage(html, n);
    if (++done % 50 === 0) console.log(`Đã xử lý ${done}/${ids.length} câu`);
    return q;
  });

  // Đối chiếu đáp án và cờ điểm liệt với các trang danh sách
  const listItems = new Map();
  const firstPage = Math.ceil(from / 24);
  const lastPage = Math.min(LIST_PAGES, Math.ceil(to / 24));
  for (let p = firstPage; p <= lastPage; p++) {
    const html = await cachedHtml(`list${p}.html`, `${BASE}/tra-cuu-cau-hoi/b/?page=${p}`);
    for (const it of parseListPage(html)) listItems.set(it.id, it);
  }
  const mismatches = [];
  const warnings = [];
  for (const q of parsed) {
    const it = listItems.get(q.id);
    if (!it) {
      mismatches.push(`Câu ${q.id}: không có trong trang danh sách`);
      continue;
    }
    if (norm(it.answerText) !== norm(q.options[q.answerIndex])) {
      mismatches.push(`Câu ${q.id}: danh sách "${it.answerText}" != chi tiết "${q.options[q.answerIndex]}"`);
    }
    if (it.critical !== q.critical) {
      mismatches.push(`Câu ${q.id}: cờ điểm liệt lệch (danh sách ${it.critical}, chi tiết ${q.critical})`);
    }
    const topic = TOPICS.find((t) => t.key === topicOf(q.id));
    if (!q.topicLabel.toLowerCase().startsWith(topic.label.toLowerCase())) {
      warnings.push(`Câu ${q.id}: nhãn "${q.topicLabel}" không khớp chủ đề ${topic.key}`);
    }
  }
  warnings.forEach((w) => console.warn(`CẢNH BÁO: ${w}`));
  if (mismatches.length) {
    console.error(`Đối chiếu thất bại (${mismatches.length} lỗi):`);
    mismatches.forEach((m) => console.error(`  ${m}`));
    process.exit(1);
  }

  // Ảnh
  const withImage = parsed.filter((q) => q.imageUrl);
  await pool(withImage, async (q) => {
    const file = path.join(IMG_DIR, `${q.id}.jpg`);
    if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
    const url = new URL(q.imageUrl.split('?')[0], BASE).href;
    fs.writeFileSync(file, await request(url, true));
    await sleep(DELAY_MS);
  });

  const questions = parsed
    .map((q) => ({
      id: q.id,
      topic: topicOf(q.id),
      critical: q.critical,
      text: q.text,
      options: q.options,
      answerIndex: q.answerIndex,
      image: q.imageUrl ? `images/${q.id}.jpg` : null,
    }))
    .sort((a, b) => a.id - b.id);

  const data = {
    source: `${BASE}/tra-cuu-cau-hoi/b/`,
    scrapedAt: new Date().toISOString(),
    questions,
  };
  const partial = from !== 1 || to !== 600;
  const out = partial ? PARTIAL_OUT : OUT;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  console.log(`Đã ghi ${questions.length} câu, ${withImage.length} ảnh -> ${path.relative(ROOT, out)}`);
  if (partial) console.log(`(Chạy thử --only: không ghi đè ${path.relative(ROOT, OUT)})`);
}

main().catch((e) => {
  console.error(e instanceof BlockedError ? `BLOCKED: ${e.message}` : e.message);
  process.exit(e instanceof BlockedError ? 2 : 1);
});
