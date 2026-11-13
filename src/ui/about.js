import { SITE, DEPENDENCIES } from '../config.js';
import { listAllWorks, listRooms } from '../data/catalog.js';

/**
 * "소개·출처" 화면 — 프로젝트 설명, 제작자, 작품 이미지·3D 모델 출처 전체,
 * 폰트·라이브러리 라이선스, 의견 보내기 링크.
 *
 * 목록은 데이터에서 그대로 만들기 때문에 작품을 추가하면 여기도 자동으로 늘어난다.
 */
export function createAbout() {
  const root = document.querySelector('#about');
  const body = root.querySelector('#about-body');
  const closeButton = root.querySelector('#about-close');

  let built = false;

  function build() {
    const { paintings, sculptures } = listAllWorks();
    const rooms = listRooms();
    const roomName = new Map(rooms.map((r) => [r.id, r.nameKo]));

    body.replaceChildren(
      section('이 프로젝트는', [
        p(
          `${SITE.NAME} 는 루브르 박물관에서 영감을 받아 만든 교육용 가상 전시입니다. ` +
            `유리 피라미드 앞뜰에서 출발해 로비와 다섯 공간을 걸어 다니며 회화 ${paintings.length}점과 조각 ${sculptures.length}점을 봅니다.`,
        ),
        p(
          '모든 작품은 루브르 공식 소장품 데이터베이스(collections.louvre.fr)에서 "현재 전시 중"과 전시실 위치를 확인한 것만 골랐고, ' +
            '크기도 공식 기록의 실제 치수를 그대로 환산해 배치했습니다.',
        ),
        p(SITE.DISCLAIMER, 'about-disclaimer'),
        ...(SITE.CREDIT_NAME ? [p(`만든 사람: ${SITE.CREDIT_NAME}`)] : []),
      ]),

      section(
        '공간',
        [
          list(
            rooms.map((r) => {
              const counts = [
                r.paintingCount ? `회화 ${r.paintingCount}점` : null,
                r.sculptureCount ? `조각 ${r.sculptureCount}점` : null,
              ].filter(Boolean);
              return `${r.nameKo} — ${r.subtitle}${counts.length ? ` (${counts.join(' · ')})` : ''}`;
            }),
          ),
        ],
      ),

      section('작품 이미지 출처', [
        p('모두 Wikimedia Commons 의 퍼블릭 도메인 파일이며, 원작은 저작권 보호기간이 만료된 회화입니다.'),
        table(
          ['작품', '공간', '파일', '라이선스'],
          paintings.map((work) => [
            work.titleKo,
            roomName.get(work.room) ?? work.room,
            link(work.credit.file, work.credit.fileUrl),
            work.credit.license,
          ]),
        ),
      ]),

      section('3D 모델 출처', [
        p('조각은 공개 라이선스로 배포된 3D 스캔을 웹용으로 감량해 사용했습니다. 원본 대리석 스캔인지 석고 복제본 스캔인지도 함께 밝힙니다.'),
        ...sculptures.flatMap((work) => [
          p(`${work.titleKo} — ${work.modelCredit.subject}`, 'about-strong'),
          table(
            ['제공', '제작자', '라이선스', '원본 링크'],
            [
              [
                work.modelCredit.source,
                work.modelCredit.author,
                link(work.modelCredit.license, work.modelCredit.licenseUrl),
                link('원본 데이터', work.modelCredit.url),
              ],
            ],
          ),
        ]),
      ]),

      section('폰트·라이브러리', [
        table(
          ['이름', '버전', '라이선스'],
          DEPENDENCIES.map((d) => [link(d.name, d.url), d.version, d.license]),
        ),
      ]),

      section('작품 정보 출처', [
        p(
          '제목·작가·연도·재질·치수·전시실 위치는 루브르 공식 소장품 데이터베이스에서 가져왔습니다. ' +
            '설명문은 모두 한국어로 새로 작성한 것이며, 공식 사이트의 문장을 옮긴 것이 아닙니다.',
        ),
        p(link('collections.louvre.fr', 'https://collections.louvre.fr/')),
      ]),

      ...(SITE.FEEDBACK_URL
        ? [
            section('의견 보내기', [
              p('잘못된 정보나 고쳤으면 하는 점을 알려 주세요.'),
              (() => {
                const a = link('의견 보내기', SITE.FEEDBACK_URL);
                a.className = 'about-feedback';
                return a;
              })(),
            ]),
          ]
        : []),
    );
    built = true;
  }

  function open() {
    if (!built) build();
    root.classList.remove('hidden');
    body.scrollTop = 0;
  }

  function close() {
    root.classList.add('hidden');
  }

  closeButton.addEventListener('click', close);
  root.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    if (e.target === root) close();
  });

  return {
    open,
    close,
    toggle() {
      if (this.isOpen) close();
      else open();
    },
    get isOpen() {
      return !root.classList.contains('hidden');
    },
  };
}

// ── 작은 DOM 도우미 ─────────────────────────────────────────────────────────

function section(title, children) {
  const wrap = document.createElement('section');
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.append(h, ...children);
  return wrap;
}

function p(text, className) {
  const el = document.createElement('p');
  if (typeof text === 'string') el.textContent = text;
  else el.append(text);
  if (className) el.className = className;
  return el;
}

function list(items) {
  const ul = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.append(li);
  }
  return ul;
}

function table(headers, rows) {
  const wrap = document.createElement('div');
  wrap.className = 'about-table';
  const t = document.createElement('table');

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const header of headers) {
    const th = document.createElement('th');
    th.textContent = header;
    hr.append(th);
  }
  thead.append(hr);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      if (cell instanceof Node) td.append(cell);
      else td.textContent = cell;
      tr.append(td);
    }
    tbody.append(tr);
  }

  t.append(thead, tbody);
  wrap.append(t);
  return wrap;
}

function link(text, href) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}
