import './styles.css';
import data from './data/questions.json';
import { loadProgress, saveProgress, clearProgress } from './core/storage.js';
import { emptyProgress } from './core/progress.js';
import { clear, el, icon } from './ui/dom.js';
import { renderHome } from './ui/home.js';
import { renderStudyMenu, renderStudy } from './ui/study.js';
import { renderExam } from './ui/exam.js';
import { renderResult } from './ui/result.js';
import { renderReport } from './ui/report.js';

const questions = data.questions;
const byId = new Map(questions.map((q) => [q.id, q]));

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
}
const storage = safeStorage();
let progress = loadProgress(storage);
// Bỏ tiến độ của id không có trong bộ đề (dữ liệu cũ hoặc bị sửa tay)
progress = {
  ...progress,
  questions: Object.fromEntries(Object.entries(progress.questions).filter(([id]) => byId.has(Number(id)))),
};
let lastResult = null;

const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 6000);
}

let warnedSaveFail = false;
const ctx = {
  questions,
  byId,
  scrapedAt: data.scrapedAt,
  getProgress: () => progress,
  update(fn) {
    progress = fn(progress);
    const ok = saveProgress(storage, progress);
    if (!ok && !warnedSaveFail) {
      warnedSaveFail = true;
      toast('Không lưu được tiến độ (trình duyệt chặn hoặc hết dung lượng). Kết quả chỉ giữ đến khi đóng trang.');
    }
  },
  reset() {
    clearProgress(storage);
    progress = emptyProgress();
    lastResult = null;
  },
  setLastResult(r) {
    lastResult = r;
  },
  getLastResult: () => lastResult,
  go(path) {
    location.hash = `#${path}`;
  },
  refresh: () => route(),
};

const app = document.getElementById('app');
const navLinks = [...document.querySelectorAll('.nav a[data-route]')];
let view = null;

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

function notFound() {
  return {
    node: el('section', { class: 'page' },
      el('div', { class: 'card empty' },
        el('h1', { text: 'Không tìm thấy trang' }),
        el('p', { class: 'muted', text: 'Đường dẫn không hợp lệ.' }),
        el('a', { class: 'btn btn-primary', href: '#/' }, icon('home'), 'Về trang chủ'))),
  };
}

function route() {
  if (view?.cleanup) view.cleanup();
  clear(app);
  const path = location.hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const section = parts[0] ?? 'home';
  if (parts.length === 0) view = renderHome(ctx);
  else if (parts[0] === 'study' && parts[1]) {
    const mode = safeDecode(parts[1]);
    view = mode === null ? notFound() : renderStudy(ctx, mode);
  } else if (parts[0] === 'study') view = renderStudyMenu(ctx);
  else if (parts[0] === 'exam') view = renderExam(ctx);
  else if (parts[0] === 'result') view = renderResult(ctx);
  else if (parts[0] === 'report') view = renderReport(ctx);
  else view = notFound();
  app.append(view.node);
  const active = section === 'result' ? 'exam' : section;
  for (const a of navLinks) a.classList.toggle('active', a.dataset.route === active);
  window.scrollTo(0, 0);
}

// Chặn rời màn hình khi view hiện tại không cho phép (bài thi đang làm dở).
let currentHash = location.hash;
window.addEventListener('hashchange', () => {
  if (view?.canLeave && !view.canLeave()) {
    // replaceState không phát hashchange và không làm dài lịch sử
    history.replaceState(null, '', currentHash || '#/');
    return;
  }
  currentHash = location.hash;
  route();
});
route();
