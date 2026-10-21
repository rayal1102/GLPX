// Tạo phần tử an toàn: mọi text đều đi qua textContent, không dùng innerHTML.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  for (const c of children.flat(Infinity)) if (c) node.append(c);
  return node;
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

export function percent(part, total) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function bar(part, total) {
  const fill = el('span', { class: 'bar-fill' });
  fill.style.width = `${percent(part, total)}%`;
  return el('span', { class: 'bar' }, fill);
}

// Thanh chồng: đã thuộc (xanh) + đang sai (đỏ) + chưa làm (nền).
export function stackBar(s) {
  const seg = (cls, n) => {
    const node = el('span', { class: `stack-seg ${cls}` });
    node.style.width = `${(n / (s.total || 1)) * 100}%`;
    return n > 0 ? node : null;
  };
  return el('span', { class: 'stack', title: `Đã thuộc ${s.mastered}, đang sai ${s.wrong}, chưa làm ${s.total - s.seen}` },
    seg('ok', s.mastered), seg('bad', s.wrong));
}

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  book: 'M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14M8 7h8',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  chart: 'M3 3v18h18M8 16v-4M13 16V8M18 16v-7',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  law: 'M12 3v18M7 21h10M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  car: 'M3 17v-4l2-6h14l2 6v4zM3 13h18M7 17v2M17 17v2',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  sign: 'M12 2l10 10-10 10L2 12zM12 8v5M12 16h.01',
  cross: 'M9 2v7H2M15 2v7h7M9 22v-7H2M15 22v-7h7',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  play: 'M7 4v16l13-8z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
};

export function icon(name, cls = '') {
  return svg(
    'svg',
    { class: `icon ${cls}`.trim(), viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor',
      'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    svg('path', { d: ICONS[name] ?? '' }),
  );
}

// Vòng tiến độ: value/total, nhãn giữa vòng là label (mặc định phần trăm).
export function ring(value, total, { size = 120, stroke = 10, label, sub, tone = 'primary' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = total ? Math.min(1, value / total) : 0;
  return el(
    'div',
    { class: `ring ring-${tone}`, style: `width:${size}px;height:${size}px` },
    svg(
      'svg',
      { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' },
      svg('circle', { class: 'ring-track', cx: size / 2, cy: size / 2, r, 'stroke-width': stroke, fill: 'none' }),
      svg('circle', {
        class: 'ring-value', cx: size / 2, cy: size / 2, r, 'stroke-width': stroke, fill: 'none',
        'stroke-linecap': 'round', 'stroke-dasharray': `${c * frac} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})`,
      }),
    ),
    el('div', { class: 'ring-label' },
      el('strong', { text: label ?? `${percent(value, total)}%` }),
      sub ? el('span', { text: sub }) : null),
  );
}

export function formatDuration(sec) {
  return `${Math.floor(sec / 60)} phút ${sec % 60} giây`;
}
