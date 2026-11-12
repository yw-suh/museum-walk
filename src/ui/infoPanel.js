/**
 * 우측 작품 정보 패널.
 * 제목 · 작가 · 연도 · 재료 · 실제 크기 · 크기 비교 · 설명 · 크게 보기 · 외부 링크 · 이미지 출처.
 */
export function createInfoPanel({ onClose, onZoom } = {}) {
  const panel = document.querySelector('#info-panel');
  const els = {
    eyebrow: panel.querySelector('#info-eyebrow'),
    title: panel.querySelector('#info-title'),
    titleOriginal: panel.querySelector('#info-title-original'),
    meta: panel.querySelector('#info-meta'),
    scale: panel.querySelector('#info-scale'),
    description: panel.querySelector('#info-description'),
    zoom: panel.querySelector('#info-zoom'),
    links: panel.querySelector('#info-links'),
    credit: panel.querySelector('#info-credit'),
    close: panel.querySelector('#info-close'),
  };

  let current = null;

  function close() {
    if (!current) return;
    current = null;
    panel.classList.add('hidden');
    onClose?.();
  }

  function show(painting) {
    current = painting;

    els.eyebrow.textContent = painting.inventory
      ? `Musée du Louvre · ${painting.inventory}`
      : 'Musée du Louvre';
    els.title.textContent = painting.titleKo;
    els.titleOriginal.textContent = painting.titleOriginal;

    els.meta.replaceChildren(
      ...row('작가', painting.artistKo),
      ...row('연도', painting.yearLabel),
      ...row('재료', painting.mediumKo),
      ...row('실제 크기', `${fmt(painting.size.heightCm)} × ${fmt(painting.size.widthCm)} cm`),
    );

    els.scale.textContent = painting.scaleNote ?? '';
    els.scale.classList.toggle('hidden', !painting.scaleNote);

    els.description.textContent = painting.description;

    els.links.replaceChildren(
      ...painting.links.map((link) => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = link.label;
        return a;
      }),
    );

    els.credit.replaceChildren(
      document.createTextNode('이미지: '),
      anchor(painting.credit.file, painting.credit.fileUrl),
      document.createTextNode(` — ${painting.credit.source}, ${painting.credit.license}`),
    );

    panel.classList.remove('hidden');
    panel.scrollTop = 0;
  }

  els.close.addEventListener('click', close);
  els.zoom.addEventListener('click', () => current && onZoom?.(current));
  panel.addEventListener('mousedown', (e) => e.stopPropagation());

  return {
    show,
    close,
    get isOpen() {
      return current !== null;
    },
    get current() {
      return current;
    },
  };
}

function row(label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  return [dt, dd];
}

function anchor(text, href) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

/** 79.4 → '79.4', 677 → '677' */
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
