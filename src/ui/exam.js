import { EXAM_DURATION_SEC, EXAM_SIZE, EXAM_BLUEPRINT, PASS_SCORE, topicName } from '../core/topics.js';
import { generateExam, gradeExam, remainingSeconds, formatMMSS } from '../core/exam.js';
import { recordAnswer, recordExam } from '../core/progress.js';
import { el, icon, bar } from './dom.js';
import { questionCard } from './question.js';

const LEAVE_MSG = 'Bài thi đang làm sẽ bị mất. Bạn có chắc muốn rời khỏi?';

export function renderExam(ctx) {
  const root = el('section', { class: 'page' });
  let timerId = null;
  let running = false;
  let removeKeys = () => {};

  const onBeforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = '';
  };
  const stopAll = () => {
    if (timerId !== null) clearInterval(timerId);
    timerId = null;
    running = false;
    window.removeEventListener('beforeunload', onBeforeUnload);
    removeKeys();
  };

  function rule(iconName, title, text) {
    return el('li', {}, el('span', { class: 'rule-icon' }, icon(iconName)),
      el('div', {}, el('strong', { text: title }), el('span', { class: 'muted small', text })));
  }

  function drawStart(errorMessage) {
    root.replaceChildren(
      el('div', { class: 'card exam-intro' },
        el('span', { class: 'eyebrow eyebrow-dark', text: 'Thi thử sát hạch' }),
        el('h1', { text: 'Đề thi lý thuyết hạng B' }),
        el('ul', { class: 'rules' },
          rule('grid', `${EXAM_SIZE} câu hỏi`, 'Rút ngẫu nhiên từ bộ 600 câu theo đúng cấu trúc đề.'),
          rule('clock', `${EXAM_DURATION_SEC / 60} phút`, 'Hết giờ sẽ tự động nộp bài.'),
          rule('target', `Đạt từ ${PASS_SCORE}/${EXAM_SIZE} câu`, 'Câu bỏ trống được tính là sai.'),
          rule('alert', 'Có 1 câu điểm liệt', 'Trả lời sai câu điểm liệt là trượt ngay.')),
        el('div', { class: 'chips' },
          EXAM_BLUEPRINT.map((b) => el('span', { class: `chip${b.pool === 'critical' ? ' chip-critical' : ''}` },
            el('strong', { text: String(b.count) }), b.pool === 'critical' ? 'Điểm liệt' : topicName(b.pool)))),
        el('p', { class: 'muted small', text: 'Phím tắt: 1–4 chọn đáp án, ← → chuyển câu. Rời khỏi màn hình hoặc tải lại trang sẽ mất bài đang làm.' }),
        errorMessage ? el('p', { class: 'text-bad', text: errorMessage }) : null,
        el('button', { class: 'btn btn-primary btn-lg', type: 'button', onClick: start }, icon('play'), 'Bắt đầu làm bài')),
    );
  }

  function start() {
    let ids;
    try {
      ids = generateExam(ctx.questions);
    } catch (e) {
      drawStart(`Không tạo được đề: ${e.message}`);
      return;
    }
    runExam(ids);
  }

  function runExam(ids) {
    const startedAt = Date.now();
    const answers = {};
    const flags = new Set();
    let index = 0;
    let finished = false;
    running = true;
    window.addEventListener('beforeunload', onBeforeUnload);
    const timerEl = el('span', { class: 'timer' }, icon('clock'), el('span', { class: 'timer-text', text: formatMMSS(EXAM_DURATION_SEC) }));

    function submit() {
      if (finished) return;
      finished = true;
      stopAll();
      const now = Date.now();
      const result = gradeExam(ctx.byId, ids, answers);
      const durationSec = Math.min(EXAM_DURATION_SEC, Math.round((now - startedAt) / 1000));
      ctx.update((p) => {
        let next = p;
        for (const id of ids) {
          if (answers[id] === undefined) continue;
          next = recordAnswer(next, id, ctx.byId.get(id).answerIndex === answers[id], now);
        }
        return recordExam(next, { ...result, durationSec }, now);
      });
      ctx.setLastResult({ ids, answers: { ...answers }, result, durationSec });
      ctx.go('/result');
    }

    function onSubmitClick() {
      const blank = ids.filter((id) => answers[id] === undefined).length;
      const msg = blank > 0 ? `Còn ${blank} câu chưa trả lời. Vẫn nộp bài?` : 'Nộp bài?';
      if (window.confirm(msg)) submit();
    }

    function tick() {
      const left = remainingSeconds(startedAt, Date.now(), EXAM_DURATION_SEC);
      timerEl.lastChild.textContent = formatMMSS(left);
      timerEl.classList.toggle('low', left <= 60);
      if (left <= 0) submit();
    }

    const goTo = (i) => {
      index = Math.min(ids.length - 1, Math.max(0, i));
      draw();
      // Trên mobile câu mới nằm phía trên: đưa về đầu trang
      if (window.scrollY > 0) window.scrollTo({ top: 0 });
    };
    const choose = (i) => {
      answers[ids[index]] = i;
      draw();
    };

    function draw() {
      const id = ids[index];
      const q = ctx.byId.get(id);
      const answeredCount = ids.filter((x) => answers[x] !== undefined).length;
      const grid = el(
        'div',
        { class: 'grid-cells grid-exam' },
        ids.map((qid, i) =>
          el('button', {
            class: `cell${answers[qid] !== undefined ? ' done' : ''}${flags.has(qid) ? ' flagged' : ''}${i === index ? ' current' : ''}`,
            type: 'button',
            text: String(i + 1),
            onClick: () => goTo(i),
          }),
        ),
      );
      root.replaceChildren(
        el('div', { class: 'exam-bar card' },
          el('div', { class: 'exam-bar-info' },
            el('strong', { text: `Câu ${index + 1}/${ids.length}` }),
            el('span', { class: 'muted small', text: `Đã trả lời ${answeredCount}/${ids.length}` }),
            bar(answeredCount, ids.length)),
          timerEl,
          el('button', { class: 'btn btn-primary', type: 'button', onClick: onSubmitClick }, icon('check'), 'Nộp bài')),
        el('div', { class: 'workspace' },
          el('div', { class: 'workspace-main' },
            questionCard(q, null, { chosen: answers[id], reveal: false, flagged: flags.has(id) }, choose),
            el('div', { class: 'nav-row' },
              el('button', { class: 'btn', type: 'button', disabled: index === 0, onClick: () => goTo(index - 1) }, icon('left'), 'Câu trước'),
              el('button', {
                class: `btn btn-ghost${flags.has(id) ? ' active' : ''}`, type: 'button',
                'aria-label': flags.has(id) ? 'Bỏ đánh dấu' : 'Đánh dấu', 'aria-pressed': flags.has(id) ? 'true' : 'false',
                onClick: () => {
                  if (flags.has(id)) flags.delete(id);
                  else flags.add(id);
                  draw();
                },
              }, icon('flag'), el('span', { class: 'btn-label', text: flags.has(id) ? 'Bỏ đánh dấu' : 'Đánh dấu' })),
              el('button', { class: 'btn', type: 'button', disabled: index === ids.length - 1, onClick: () => goTo(index + 1) }, 'Câu sau', icon('right')))),
          el('aside', { class: 'card panel' },
            el('div', { class: 'panel-head' },
              el('strong', { text: 'Bảng câu hỏi' }),
              el('div', { class: 'legend' },
                el('span', { class: 'dot dot-done' }), 'Đã làm',
                el('span', { class: 'dot dot-flag' }), 'Đánh dấu',
                el('span', { class: 'dot' }), 'Chưa làm')),
            grid)),
      );
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const q = ctx.byId.get(ids[index]);
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) choose(n - 1);
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else return;
      e.preventDefault();
    }
    document.addEventListener('keydown', onKey);
    removeKeys = () => document.removeEventListener('keydown', onKey);

    draw();
    tick();
    timerId = setInterval(tick, 500);
  }

  drawStart();
  return {
    node: root,
    cleanup: stopAll,
    // Hỏi lại trước khi rời màn hình khi bài thi đang làm dở.
    canLeave: () => !running || window.confirm(LEAVE_MSG),
  };
}
