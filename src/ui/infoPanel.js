/**
 * 우측 작품 정보 패널 (모바일에서는 하단 시트).
 *
 * 회화와 조각이 같은 패널을 쓴다. 다른 점은 하나뿐 —
 * 회화는 "크게 보기"(고해상도 이미지), 조각은 "돌려 보기"(3D 회전)다.
 */
export function createInfoPanel({ onZoom, onOrbit } = {}) {
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
  let kind = 'painting';

  function close() {
    if (!current) return;
    current = null;
    panel.classList.add('hidden');
  }

  function show(work, workKind = 'painting') {
    current = work;
    kind = workKind;

    els.eyebrow.textContent = ['Musée du Louvre', work.louvreRoom, work.inventory].filter(Boolean).join(' · ');
    els.title.textContent = work.titleKo;
    els.titleOriginal.textContent = work.titleOriginal;

    els.meta.replaceChildren(
      ...row('작가', work.artistKo),
      ...row('연도', work.yearLabel),
      ...row('재질', work.mediumKo),
      ...row('실제 크기', sizeLabel(work)),
    );

    els.scale.textContent = work.scaleNote ?? '';
    els.scale.classList.toggle('hidden', !work.scaleNote);

    els.description.textContent = work.description;

    els.zoom.textContent = kind === 'sculpture' ? '돌려 보기' : '크게 보기';
    els.zoom.dataset.kind = kind;

    els.links.replaceChildren(
      ...work.links.map((link) => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = link.label;
        return a;
      }),
    );

    els.credit.replaceChildren(...creditNodes(work, kind));

    panel.classList.remove('hidden');
    panel.scrollTop = 0;
  }

  els.close.addEventListener('click', close);
  els.zoom.addEventListener('click', () => {
    if (!current) return;
    if (kind === 'sculpture') onOrbit?.(current);
    else onZoom?.(current);
  });
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
    get kind() {
      return kind;
    },
  };
}

function sizeLabel(work) {
  const { heightCm, widthCm, note } = work.size;
  const base = widthCm ? `${fmt(heightCm)} × ${fmt(widthCm)} cm` : `높이 ${fmt(heightCm)} cm`;
  return note ? `${base} — ${note}` : base;
}

/** 이미지 출처(회화) 또는 3D 모델 출처(조각) */
function creditNodes(work, kind) {
  if (kind === 'sculpture') {
    const credit = work.modelCredit;
    return [
      document.createTextNode('3D 모델: '),
      anchor(credit.source, credit.url),
      document.createTextNode(` — ${credit.author}, ${credit.license}`),
      document.createElement('br'),
      document.createTextNode(credit.subject),
    ];
  }
  return [
    document.createTextNode('이미지: '),
    anchor(work.credit.file, work.credit.fileUrl),
    document.createTextNode(` — ${work.credit.source}, ${work.credit.license}`),
  ];
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
