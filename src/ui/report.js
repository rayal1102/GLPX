import { TOPICS, PASS_SCORE, EXAM_SIZE } from '../core/topics.js';
import { computeStats, wrongIds } from '../core/progress.js';
import { el, svg, icon, ring, stackBar, percent, formatDuration } from './dom.js';
import { topicBadge } from './meta.js';

function topicRow(key, name, s, href) {
  return el(
    'a',
    { class: 'topic-row', href },
    topicBadge(key, 'sm'),
    el('div', { class: 'topic-row-main' },
      el('div', { class: 'topic-row-head' },
        el('strong', { text: name }),
        el('span', { class: 'muted small', text: `${s.mastered}/${s.total} thuộc · ${s.wrong} sai · ${s.total - s.seen} chưa làm` })),
      stackBar(s)),
    el('span', { class: 'topic-row-pct', text: `${percent(s.mastered, s.total)}%` }),
  );
}

function examResultText(e) {
  if (e.passed) return 'Đạt';
  return e.failedCritical ? 'Không đạt (sai điểm liệt)' : 'Không đạt';
}

// Biểu đồ cột điểm các bài thi gần nhất; màu theo trạng thái đạt/không đạt, có đường mốc 27.
function scoreChart(exams) {
  const W = 640, H = 220, L = 34, R = 12, T = 14, B = 26;
  const plotW = W - L - R, plotH = H - T - B;
  const y = (v) => T + plotH - (v / EXAM_SIZE) * plotH;
  const slot = plotW / Math.max(exams.length, 10);
  const bw = Math.min(26, slot * 0.62);

  const grid = [0, 10, 20, 30].map((v) => [
    svg('line', { class: 'chart-grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }),
    svg('text', { class: 'chart-axis', x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, document.createTextNode(String(v))),
  ]);

  const bars = exams.map((e, i) => {
    const x = L + slot * i + (slot - bw) / 2;
    const top = y(e.score);
    const base = y(0);
    const r = Math.min(4, (base - top) / 2, bw / 2);
    const d = base - top < 0.5
      ? `M${x},${base}h${bw}`
      : `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${base}Z`;
    const label = `Bài ${i + 1} · ${new Date(e.at).toLocaleString('vi-VN')}: ${e.score}/${e.total} – ${examResultText(e)}`;
    return svg('g', { class: 'chart-bar' },
      svg('title', {}, document.createTextNode(label)),
      svg('rect', { class: 'chart-hit', x: L + slot * i, y: T, width: slot, height: plotH }),
      svg('path', { class: e.passed ? 'bar-pass' : 'bar-fail', d }),
      exams.length <= 20 ? svg('text', { class: 'chart-axis', x: x + bw / 2, y: H - 8, 'text-anchor': 'middle' }, document.createTextNode(String(i + 1))) : null);
  });

  const threshold = [
    svg('line', { class: 'chart-threshold', x1: L, x2: W - R, y1: y(PASS_SCORE), y2: y(PASS_SCORE) }),
    svg('text', { class: 'chart-threshold-label', x: W - R, y: y(PASS_SCORE) - 5, 'text-anchor': 'end' }, document.createTextNode(`Mốc đạt ${PASS_SCORE}`)),
  ];

  return el('figure', { class: 'chart' },
    svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Điểm ${exams.length} bài thi thử gần nhất` }, grid, threshold, bars),
    el('figcaption', { class: 'legend' },
      el('span', { class: 'dot dot-ok' }), 'Đạt',
      el('span', { class: 'dot dot-bad' }), 'Không đạt',
      el('span', { class: 'dash' }), `Mốc đạt ${PASS_SCORE}/${EXAM_SIZE}`,
      el('span', { class: 'muted small', text: ' · Rê chuột lên cột để xem chi tiết' })));
}

export function renderReport(ctx) {
  const progress = ctx.getProgress();
  const stats = computeStats(progress, ctx.questions);
  const wrongCount = wrongIds(progress).length;
  const exams = progress.exams;
  const recent = exams.slice(-20);
  const avg = exams.length ? (exams.reduce((a, e) => a + e.score, 0) / exams.length).toFixed(1) : '-';
  const best = exams.length ? Math.max(...exams.map((e) => e.score)) : '-';

  const history = exams.length
    ? el('div', { class: 'table-wrap' }, el(
        'table',
        {},
        el('thead', {}, el('tr', {}, ['Thời điểm', 'Điểm', 'Kết quả', 'Thời gian làm'].map((t) => el('th', { text: t })))),
        el('tbody', {},
          exams.slice(-10).reverse().map((e) =>
            el('tr', {},
              el('td', { text: new Date(e.at).toLocaleString('vi-VN') }),
              el('td', {}, el('strong', { text: `${e.score}/${e.total}` })),
              el('td', {}, el('span', { class: `pill ${e.passed ? 'pill-ok' : 'pill-bad'}` }, icon(e.passed ? 'check' : 'x'), examResultText(e))),
              el('td', { text: formatDuration(e.durationSec) })))),
      ))
    : el('p', { class: 'muted', text: 'Chưa có bài thi thử nào.' });

  const onReset = () => {
    if (window.confirm('Xóa toàn bộ tiến độ và lịch sử thi? Không thể hoàn tác.')) {
      ctx.reset();
      ctx.refresh();
    }
  };

  const node = el(
    'section',
    { class: 'page' },
    el('div', { class: 'page-head' },
      el('h1', { text: 'Báo cáo tiến độ' }),
      el('p', { class: 'muted', text: 'Một câu được tính là "đã thuộc" khi lần trả lời gần nhất là đúng.' })),
    el('div', { class: 'report-top' },
      el('div', { class: 'card report-ring' },
        ring(stats.overall.mastered, stats.overall.total, { size: 132, stroke: 12, sub: 'đã thuộc' }),
        el('div', {},
          el('div', { class: 'stat-value', text: `${stats.overall.mastered}/${stats.overall.total}` }),
          el('div', { class: 'muted small', text: `Đã làm ${stats.overall.seen} · đang sai ${stats.overall.wrong}` }),
          wrongCount > 0
            ? el('a', { class: 'btn btn-primary btn-sm', href: '#/study/wrong' }, icon('refresh'), `Ôn lại ${wrongCount} câu sai`)
            : null)),
      el('div', { class: 'stat-row compact' },
        el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Số lần thi' }), el('strong', { text: String(exams.length) })),
        el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Tỉ lệ đạt' }), el('strong', { text: exams.length ? `${percent(stats.exams.passed, exams.length)}%` : '-' })),
        el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Điểm TB' }), el('strong', { text: String(avg) })),
        el('div', { class: 'card mini-stat' }, el('span', { class: 'mini-label', text: 'Cao nhất' }), el('strong', { text: String(best) })))),
    el('h2', { text: 'Theo chủ đề' }),
    el('div', { class: 'card topic-rows' },
      TOPICS.map((t) => topicRow(t.key, t.name, stats.topics[t.key], `#/study/${t.key}`)),
      topicRow('critical', 'Câu điểm liệt', stats.critical, '#/study/critical')),
    el('h2', { text: `Điểm thi thử${recent.length ? ` (${recent.length} bài gần nhất)` : ''}` }),
    el('div', { class: 'card' }, recent.length ? scoreChart(recent) : el('p', { class: 'muted', text: 'Làm bài thi thử để thấy biểu đồ điểm.' })),
    el('h2', { text: 'Lịch sử thi thử (10 bài gần nhất)' }),
    el('div', { class: 'card flush' }, history),
    el('div', { class: 'card danger-zone' },
      el('div', {},
        el('strong', { text: 'Xóa tiến độ' }),
        el('p', { class: 'muted small', text: 'Xóa toàn bộ kết quả ôn tập và lịch sử thi trên trình duyệt này.' })),
      el('button', { class: 'btn btn-danger', type: 'button', onClick: onReset }, icon('trash'), 'Xóa tiến độ')),
  );
  return { node };
}
