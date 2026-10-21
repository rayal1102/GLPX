import { TOPICS, EXAM_BLUEPRINT, topicName } from '../core/topics.js';
import { computeStats, wrongIds } from '../core/progress.js';
import { el, icon, ring, percent } from './dom.js';
import { topicCard } from './meta.js';

function statTile(iconName, tone, label, value, sub) {
  return el(
    'div',
    { class: 'card stat-tile' },
    el('span', { class: `stat-icon tone-${tone}` }, icon(iconName)),
    el('div', {},
      el('div', { class: 'stat-label', text: label }),
      el('div', { class: 'stat-value', text: value }),
      sub ? el('div', { class: 'muted small', text: sub }) : null),
  );
}

export function renderHome(ctx) {
  const progress = ctx.getProgress();
  const stats = computeStats(progress, ctx.questions);
  const { overall, critical, exams } = stats;
  const wrongCount = wrongIds(progress).length;
  const lastExam = progress.exams[progress.exams.length - 1];

  const hero = el(
    'div',
    { class: 'hero' },
    el('div', { class: 'hero-text' },
      el('span', { class: 'eyebrow', text: 'Bộ 600 câu · Hạng B · Offline' }),
      el('h1', { text: 'Ôn thi lý thuyết GPLX hạng B' }),
      el('p', { text: overall.seen === 0
        ? 'Bắt đầu với chủ đề đầu tiên hoặc làm thử một đề để biết mình đang ở đâu.'
        : `Bạn đã thuộc ${overall.mastered} câu. Còn ${overall.total - overall.mastered} câu nữa, cố lên!` }),
      el('div', { class: 'hero-actions' },
        el('a', { class: 'btn btn-light', href: '#/study' }, icon('book'), 'Ôn tập theo chủ đề'),
        el('a', { class: 'btn btn-outline-light', href: '#/exam' }, icon('clock'), 'Thi thử 30 câu'))),
    ring(overall.mastered, overall.total, { size: 148, stroke: 12, sub: 'đã thuộc', tone: 'light' }),
  );

  const tiles = el(
    'div',
    { class: 'stat-row' },
    statTile('check', 'green', 'Đã thuộc', `${overall.mastered}/${overall.total}`, `Đã làm ${overall.seen} câu`),
    statTile('x', 'red', 'Đang sai', String(wrongCount), wrongCount ? 'Nên ôn lại sớm' : 'Không có câu sai'),
    statTile('alert', 'orange', 'Câu điểm liệt', `${critical.mastered}/${critical.total}`, `Đang sai ${critical.wrong}`),
    statTile('target', 'blue', 'Thi thử', exams.count ? `${exams.passed}/${exams.count} đạt` : 'Chưa thi',
      lastExam ? `Gần nhất: ${lastExam.score}/${lastExam.total} (${lastExam.passed ? 'đạt' : 'không đạt'})` : `Tỉ lệ đạt: ${exams.count ? percent(exams.passed, exams.count) + '%' : '-'}`),
  );

  const topics = el(
    'div',
    { class: 'topic-grid' },
    TOPICS.map((t) => topicCard({ key: t.key, href: `#/study/${t.key}`, title: t.name, s: stats.topics[t.key] })),
  );

  const blueprint = el(
    'div',
    { class: 'card info-card' },
    el('h3', {}, icon('grid'), 'Cấu trúc đề thi'),
    el('p', { class: 'muted small', text: '30 câu · 20 phút · đạt từ 27 câu và không sai câu điểm liệt.' }),
    el('div', { class: 'chips' },
      EXAM_BLUEPRINT.map((b) => el('span', { class: `chip${b.pool === 'critical' ? ' chip-critical' : ''}` },
        el('strong', { text: String(b.count) }),
        b.pool === 'critical' ? 'Điểm liệt' : topicName(b.pool)))),
  );

  const node = el(
    'section',
    { class: 'page' },
    hero,
    tiles,
    el('div', { class: 'section-head' },
      el('h2', { text: 'Chủ đề ôn tập' }),
      el('a', { class: 'link', href: '#/study' }, 'Xem tất cả', icon('right'))),
    topics,
    blueprint,
  );
  return { node };
}
