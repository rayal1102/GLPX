import * as cheerio from 'cheerio';

export const CORRECT_MARK = 'Đáp án chính xác';

export function cleanText(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function badgeInfo($, scope) {
  const labels = scope
    .find('span.rounded-full')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean);
  const critical = labels.includes('Điểm liệt');
  const topicLabel = labels.find((l) => !/^Câu hỏi \d+$/.test(l) && l !== 'Điểm liệt') ?? '';
  return { critical, topicLabel };
}

export function parseQuestionPage(html, n) {
  const $ = cheerio.load(html);
  const article = $(`article#question-detail-${n}`);
  if (article.length === 0) {
    throw new Error(`Câu ${n}: không tìm thấy khối câu hỏi (article#question-detail-${n})`);
  }
  const text = cleanText(article.find('h1').first().text());
  if (!text) throw new Error(`Câu ${n}: nội dung câu hỏi rỗng`);

  const { critical, topicLabel } = badgeInfo($, article.children('div').first());

  const options = [];
  const correct = [];
  article.find('#question-answers > div[id^="question-answer-"]').each((i, el) => {
    const node = $(el);
    const body = node.find('div.flex-1').first();
    const optionText = cleanText(body.children('span.block').first().text());
    options.push(optionText);
    if (cleanText(body.text()).includes(CORRECT_MARK)) correct.push(i);
  });
  if (options.length < 2) throw new Error(`Câu ${n}: chỉ có ${options.length} phương án`);
  if (options.some((o) => !o)) throw new Error(`Câu ${n}: có phương án rỗng`);
  if (correct.length !== 1) {
    throw new Error(`Câu ${n}: tìm thấy ${correct.length} đáp án đúng (cần đúng 1)`);
  }

  const img = article.find('img[src*="/images/"]').first();
  const imageUrl = img.length ? img.attr('src') : null;

  return { id: n, topicLabel, critical, text, options, answerIndex: correct[0], imageUrl };
}

export function parseListPage(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('article[id^="question-card-"]').each((_, el) => {
    const card = $(el);
    const id = Number(card.attr('id').replace('question-card-', ''));
    const { critical } = badgeInfo($, card);
    const answerEl = card.find('strong').filter((_, s) => cleanText($(s).text()) === 'Đáp án:').first();
    if (answerEl.length === 0) throw new Error(`Danh sách: câu ${id} không có dòng "Đáp án:"`);
    const answerText = cleanText(answerEl.parent().text().replace('Đáp án:', ''));
    items.push({ id, answerText, critical });
  });
  if (items.length === 0) throw new Error('Danh sách: không tìm thấy câu hỏi nào');
  return items;
}
