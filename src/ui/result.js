import { PASS_SCORE } from '../core/topics.js';
import { el, icon, ring, formatDuration } from './dom.js';
import { questionCard } from './question.js';

export function renderResult(ctx) {
  const last = ctx.getLastResult();
  if (!last) {
    return {
      node: el('section', { class: 'page' },
        el('div', { class: 'card empty' },
          el('h1', { text: 'Chưa có kết quả' }),
          el('p', { class: 'muted', text: 'Hãy làm một đề thi thử để xem kết quả tại đây.' }),
          el('a', { class: 'btn btn-primary', href: '#/exam' }, icon('play'), 'Thi thử'))),
    };
  }
  const { ids, answers, result, durationSec } = last;

  const reasons = [];
  if (result.score < PASS_SCORE) reasons.push(`Dưới ${PASS_SCORE} câu đúng`);
  if (result.failedCritical) reasons.push('Sai câu điểm liệt');

  const blank = ids.filter((id) => answers[id] === undefined).length;
  const wrong = result.total - result.score - blank;
  const criticalId = ids.find((id) => ctx.byId.get(id).critical);

  const items = ids.map((id, i) => {
    const q = ctx.byId.get(id);
    const chosen = answers[id];
    const correct = chosen === q.answerIndex;
    const status = chosen === undefined ? 'Bỏ trống' : correct ? 'Đúng' : 'Sai';
    const node = el(
      'div',
      { class: 'review-item' },
      el('div', { class: `review-status ${correct ? 'is-ok' : 'is-bad'}` },
        icon(correct ? 'check' : 'x'),
        el('span', { text: `Câu ${i + 1}: ${status}` }),
        correct ? null : el('span', { class: 'muted small', text: `· Đáp án đúng: ${q.answerIndex + 1}` })),
      questionCard(q, `${i + 1}/${ids.length}`, { chosen, reveal: true }, () => {}),
    );
    return { node, correct };
  });

  const list = el('div', { class: 'review-list' });
  let filter = 'all';
  const tabs = el('div', { class: 'segmented', role: 'tablist' });
  function drawList() {
    list.replaceChildren(...items.filter((it) => filter === 'all' || !it.correct).map((it) => it.node));
    if (!list.childElementCount) list.append(el('p', { class: 'muted', text: 'Không có câu sai nào. Tuyệt vời!' }));
    tabs.replaceChildren(
      ...[['all', `Tất cả (${ids.length})`], ['wrong', `Sai & bỏ trống (${ids.length - result.score})`]].map(([key, label]) =>
        el('button', {
          type: 'button', role: 'tab', class: filter === key ? 'active' : '', 'aria-selected': filter === key ? 'true' : 'false', text: label,
          onClick: () => { filter = key; drawList(); },
        })),
    );
  }
  drawList();

  const tone = result.passed ? 'ok' : 'bad';
  const node = el(
    'section',
    { class: 'page' },
    el('div', { class: `card result-hero result-${tone}` },
      ring(result.score, result.total, { size: 140, stroke: 12, label: `${result.score}/${result.total}`, sub: 'câu đúng', tone }),
      el('div', { class: 'result-text' },
        el('span', { class: `verdict-badge verdict-${tone}` }, icon(result.passed ? 'check' : 'x'), result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'),
        el('h1', { text: result.passed ? 'Chúc mừng, bạn đã vượt qua!' : 'Chưa đạt, thử lại nhé!' }),
        reasons.length ? el('p', { class: 'text-bad', text: `Lý do: ${reasons.join('; ')}` }) : null,
        el('p', { class: 'muted', text: `Thời gian làm bài: ${formatDuration(durationSec)}` }))),
    el('div', { class: 'stat-row compact' },
      el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Đúng' }), el('strong', { class: 'text-ok', text: String(result.score) })),
      el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Sai' }), el('strong', { class: 'text-bad', text: String(wrong) })),
      el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Bỏ trống' }), el('strong', { text: String(blank) })),
      el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Câu điểm liệt' }),
        el('strong', { class: result.failedCritical ? 'text-bad' : 'text-ok', text: criticalId === undefined ? '-' : result.failedCritical ? 'Sai' : 'Đúng' }))),
    el('div', { class: 'actions' },
      el('a', { class: 'btn btn-primary', href: '#/exam' }, icon('refresh'), 'Thi đề khác'),
      el('a', { class: 'btn', href: '#/study/wrong' }, icon('book'), 'Ôn câu đang sai'),
      el('a', { class: 'btn', href: '#/report' }, icon('chart'), 'Xem báo cáo')),
    el('div', { class: 'section-head' }, el('h2', { text: 'Xem lại bài làm' }), tabs),
    list,
  );
  return { node };
}
