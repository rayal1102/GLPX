import { el, icon, stackBar, percent } from './dom.js';

// Icon và tông màu cho từng chủ đề (chỉ để nhận diện, không mang nghĩa đúng/sai).
export const TOPIC_META = {
  'quy-dinh': { icon: 'law', tone: 'blue' },
  'van-hoa': { icon: 'heart', tone: 'pink' },
  'ky-thuat': { icon: 'car', tone: 'teal' },
  'cau-tao': { icon: 'wrench', tone: 'amber' },
  'bien-bao': { icon: 'sign', tone: 'violet' },
  'sa-hinh': { icon: 'cross', tone: 'indigo' },
  critical: { icon: 'alert', tone: 'red' },
  wrong: { icon: 'refresh', tone: 'orange' },
};

export function topicBadge(key, cls = '') {
  const m = TOPIC_META[key] ?? { icon: 'book', tone: 'blue' };
  return el('span', { class: `topic-badge tone-${m.tone} ${cls}`.trim() }, icon(m.icon));
}

// Thẻ chủ đề có tiến độ; s = { total, seen, mastered, wrong } hoặc null.
export function topicCard({ key, href, title, s, sub }) {
  return el(
    'a',
    { class: 'card topic-card', href },
    el('div', { class: 'topic-card-head' },
      topicBadge(key),
      s ? el('span', { class: 'topic-pct', text: `${percent(s.mastered, s.total)}%` }) : null),
    el('div', { class: 'topic-title', text: title }),
    el('div', { class: 'muted small', text: sub ?? `Đã thuộc ${s.mastered}/${s.total} · đang sai ${s.wrong}` }),
    s ? stackBar(s) : null,
  );
}
