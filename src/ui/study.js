import { TOPICS } from '../core/topics.js';
import { computeStats, recordAnswer, wrongIds } from '../core/progress.js';
import { el, icon, stackBar } from './dom.js';
import { questionCard } from './question.js';
import { topicCard, topicBadge } from './meta.js';

export function renderStudyMenu(ctx) {
  const progress = ctx.getProgress();
  const stats = computeStats(progress, ctx.questions);
  const wrongCount = wrongIds(progress).length;

  const node = el(
    'section',
    { class: 'page' },
    el('div', { class: 'page-head' },
      el('h1', { text: 'Ôn tập theo chủ đề' }),
      el('p', { class: 'muted', text: 'Chọn đáp án là biết đúng sai ngay. Phím tắt: 1–4 chọn đáp án, ← → chuyển câu.' })),
    el('div', { class: 'topic-grid' },
      TOPICS.map((t) => topicCard({ key: t.key, href: `#/study/${t.key}`, title: t.name, s: stats.topics[t.key] }))),
    el('h2', { text: 'Ôn tập đặc biệt' }),
    el('div', { class: 'topic-grid' },
      topicCard({ key: 'critical', href: '#/study/critical', title: '60 câu điểm liệt', s: stats.critical }),
      topicCard({ key: 'wrong', href: '#/study/wrong', title: 'Câu đang sai', s: null,
        sub: wrongCount ? `${wrongCount} câu cần ôn lại` : 'Chưa có câu nào sai' })),
  );
  return { node };
}

function pickIds(ctx, mode) {
  if (mode === 'critical') return ctx.questions.filter((q) => q.critical).map((q) => q.id);
  if (mode === 'wrong') return wrongIds(ctx.getProgress());
  if (TOPICS.some((t) => t.key === mode)) return ctx.questions.filter((q) => q.topic === mode).map((q) => q.id);
  return null;
}

function titleOf(mode) {
  if (mode === 'critical') return '60 câu điểm liệt';
  if (mode === 'wrong') return 'Câu đang sai';
  return TOPICS.find((t) => t.key === mode)?.name ?? '';
}

function emptyView(title, message) {
  return {
    node: el('section', { class: 'page' },
      el('div', { class: 'card empty' },
        el('h1', { text: title }),
        el('p', { class: 'muted', text: message }),
        el('a', { class: 'btn btn-primary', href: '#/study' }, icon('left'), 'Về danh sách chủ đề'))),
  };
}

export function renderStudy(ctx, mode) {
  const ids = pickIds(ctx, mode);
  if (ids === null) return emptyView('Không tìm thấy', 'Chủ đề không tồn tại.');
  if (ids.length === 0) return emptyView(titleOf(mode), 'Chưa có câu nào trong nhóm này.');

  const session = new Map(); // id -> lựa chọn đã khóa trong phiên này
  let index = 0;
  const root = el('section', { class: 'page' });

  function gridClass(id) {
    const rec = ctx.getProgress().questions[id];
    if (!rec) return 'cell';
    return rec.lastCorrect ? 'cell ok' : 'cell bad';
  }

  function choose(id, i) {
    if (session.has(id)) return;
    session.set(id, i);
    const isCorrect = ctx.byId.get(id).answerIndex === i;
    ctx.update((p) => recordAnswer(p, id, isCorrect, Date.now()));
    draw();
  }

  const goTo = (i) => {
    index = Math.min(ids.length - 1, Math.max(0, i));
    draw();
  };

  function draw() {
    const id = ids[index];
    const q = ctx.byId.get(id);
    const answered = session.has(id);
    const groupStats = computeStats(ctx.getProgress(), ids.map((x) => ctx.byId.get(x)));

    const grid = el(
      'div',
      { class: 'grid-cells' },
      ids.map((qid, i) =>
        el('button', {
          class: `${gridClass(qid)}${i === index ? ' current' : ''}`,
          type: 'button',
          title: `Câu ${qid}`,
          text: String(qid),
          onClick: () => goTo(i),
        }),
      ),
    );

    root.replaceChildren(
      el('div', { class: 'page-head study-head' },
        el('a', { class: 'back', href: '#/study' }, icon('left'), 'Chủ đề'),
        el('div', { class: 'study-title' },
          topicBadge(mode, 'sm'),
          el('h1', { text: titleOf(mode) })),
        el('div', { class: 'study-meta' },
          el('span', { class: 'muted small', text: `Câu ${index + 1}/${ids.length} · đã thuộc ${groupStats.overall.mastered}/${ids.length}` }),
          stackBar(groupStats.overall))),
      el('div', { class: 'workspace' },
        el('div', { class: 'workspace-main' },
          questionCard(q, null, { chosen: session.get(id), reveal: answered, feedback: true }, (i) => choose(id, i)),
          el('div', { class: 'nav-row' },
            el('button', { class: 'btn', type: 'button', disabled: index === 0, onClick: () => goTo(index - 1) }, icon('left'), 'Câu trước'),
            el('button', { class: `btn ${answered ? 'btn-primary' : ''}`, type: 'button', disabled: index === ids.length - 1, onClick: () => goTo(index + 1) }, 'Câu sau', icon('right')))),
        el('aside', { class: 'card panel' },
          el('div', { class: 'panel-head' },
            el('strong', { text: 'Danh sách câu' }),
            el('div', { class: 'legend' },
              el('span', { class: 'dot dot-ok' }), 'Đúng',
              el('span', { class: 'dot dot-bad' }), 'Sai',
              el('span', { class: 'dot' }), 'Chưa làm')),
          grid)),
    );
    // Cuộn riêng khung lưới tới câu hiện tại (không cuộn cả trang).
    const cur = grid.querySelector('.current');
    if (cur) grid.scrollTop = cur.offsetTop - grid.clientHeight / 2;
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const id = ids[index];
    const q = ctx.byId.get(id);
    const n = Number(e.key);
    if (n >= 1 && n <= q.options.length) choose(id, n - 1);
    else if (e.key === 'ArrowRight') goTo(index + 1);
    else if (e.key === 'ArrowLeft') goTo(index - 1);
    else return;
    e.preventDefault();
  }

  document.addEventListener('keydown', onKey);
  draw();
  return { node: root, cleanup: () => document.removeEventListener('keydown', onKey) };
}
