import { el, icon } from './dom.js';
import { topicName } from '../core/topics.js';

// Vẽ phần nội dung một câu hỏi: nhãn, câu hỏi, ảnh và danh sách phương án.
// state: { chosen?: number, reveal?: boolean, feedback?: boolean, flagged?: boolean }
// onChoose(index) được gọi khi bấm phương án.
export function questionCard(q, number, state, onChoose) {
  const locked = Boolean(state.reveal);
  const options = q.options.map((text, i) => {
    let cls = 'option';
    if (state.chosen === i) cls += ' chosen';
    if (locked && i === q.answerIndex) cls += ' correct';
    if (locked && state.chosen === i && i !== q.answerIndex) cls += ' wrong';
    const mark = locked && i === q.answerIndex ? icon('check', 'option-mark') : locked && state.chosen === i ? icon('x', 'option-mark') : null;
    return el(
      'button',
      { class: cls, type: 'button', disabled: locked, onClick: () => onChoose(i), 'aria-pressed': state.chosen === i ? 'true' : 'false' },
      el('span', { class: 'option-no', text: String(i + 1) }),
      el('span', { class: 'option-text', text }),
      mark,
    );
  });

  let feedback = null;
  if (locked && state.feedback && state.chosen !== undefined) {
    const ok = state.chosen === q.answerIndex;
    feedback = el(
      'div',
      { class: `feedback ${ok ? 'feedback-ok' : 'feedback-bad'}`, role: 'status' },
      icon(ok ? 'check' : 'x'),
      el('span', { text: ok ? 'Chính xác!' : `Chưa đúng. Đáp án đúng là số ${q.answerIndex + 1}.` }),
    );
  }

  return el(
    'article',
    { class: 'card question' },
    el(
      'div',
      { class: 'tags' },
      el('span', { class: 'tag', text: `Câu ${q.id}` }),
      number ? el('span', { class: 'tag tag-muted', text: number }) : null,
      el('span', { class: 'tag tag-muted', text: topicName(q.topic) }),
      q.critical ? el('span', { class: 'tag tag-critical' }, icon('alert'), 'Điểm liệt') : null,
      state.flagged ? el('span', { class: 'tag tag-flag' }, icon('flag'), 'Đã đánh dấu') : null,
    ),
    el('p', { class: 'q-text', text: q.text }),
    q.image ? el('div', { class: 'q-img-wrap' }, el('img', { class: 'q-img', src: q.image, alt: `Hình ảnh câu hỏi ${q.id}`, loading: 'lazy' })) : null,
    el('div', { class: 'options' }, options),
    feedback,
  );
}
