/**
 * 1단계 — Wikimedia Commons에서 퍼블릭 도메인 작품 원본을 내려받습니다.
 *
 *   npm run fetch-images        (또는 npm run images 로 변환까지 한 번에)
 *
 * - 받은 파일은 .cache/originals/ 에 둡니다. 이 폴더는 git 에 올라가지 않습니다.
 *   실제로 배포되는 이미지는 2단계(scripts/optimize-images.mjs)가 만드는 WebP 입니다.
 * - 뷰어용 4096px WebP 를 만들 수 있도록 긴 변 4096px 기준 썸네일을 받아옵니다.
 *   (원본이 그보다 작으면 원본 그대로 — 업스케일하지 않습니다.)
 * - 출처·작성자·라이선스는 public/images/CREDITS.md 에 기록합니다.
 *
 * 작품을 추가할 때는 아래 TARGETS 에 { id, commonsFile } 한 줄만 더하면 됩니다.
 */
import { writeFile, readFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = resolve(ROOT, '.cache/originals');
const CREDITS_DIR = resolve(ROOT, 'public/images');
const MAX_LONG_SIDE = 4096; // 뷰어용 해상도. 3D 텍스처용 2048px 은 2단계에서 줄인다.
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'louvre-salle-des-etats/0.1 (educational Three.js demo)';

/** <id>.jpg <- Commons 원본 파일명 */
const TARGETS = [
  // ── 전시실 1 · Salle des États (711) ──────────────────────────────────────
  { id: 'mona-lisa', commonsFile: 'Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg' },
  { id: 'noces-de-cana', commonsFile: 'Les Noces de Cana - Paolo Veronese - Musée du Louvre Peintures INV 142 ; MR 384.jpg' },
  { id: 'homme-au-gant', commonsFile: 'Tizian 079.jpg' },
  { id: 'femme-au-miroir', commonsFile: "Portrait d'une Femme à sa Toilette, by Titian, from C2RMF retouched.jpg" },
  { id: 'pelerins-emmaus', commonsFile: "Les Pèlerins d'Emmaüs - Paolo Veronese - Musée du Louvre Peintures INV 146 ; MR 385.jpg" },
  { id: 'suzanne-au-bain', commonsFile: 'Suzanne au bain - Le Tintoret - Musée du Louvre Peintures INV 568 ; MR 498.jpg' },

  // ── 전시실 2 · 프랑스 대형 회화실 (700 Mollien · 702 Daru) ────────────────
  { id: 'radeau-de-la-meduse', commonsFile: 'JEAN LOUIS THÉODORE GÉRICAULT - La Balsa de la Medusa (Museo del Louvre, 1818-19).jpg' },
  { id: 'liberte-guidant-le-peuple', commonsFile: 'La Liberté guidant le peuple - Eugène Delacroix - Musée du Louvre Peintures RF 129 - après restauration 2024.jpg' },
  { id: 'sacre-de-napoleon', commonsFile: 'Jacques-Louis David - The Coronation of Napoleon (1805-1807).jpg' },
  { id: 'mort-de-sardanapale', commonsFile: 'Mort de Sardanapale - Eugène Delacroix - Musée du Louvre Peintures RF 2346.jpg' },
  { id: 'pestiferes-de-jaffa', commonsFile: 'Antoine-Jean Gros - Bonaparte Visiting the Plague Victims of Jaffa.jpeg' },
  { id: 'les-sabines', commonsFile: 'The Intervention of the Sabine Women - David (Louvre INV 3691).jpg' },

  // ── 전시실 3 · 그랑드 갤러리 (710) ────────────────────────────────────────
  { id: 'vierge-aux-rochers', commonsFile: 'Leonardo Da Vinci - Vergine delle Rocce (Louvre).jpg' },
  { id: 'sainte-anne', commonsFile: 'Leonardo da Vinci - Virgin and Child with St Anne C2RMF retouched.jpg' },
  { id: 'saint-jean-baptiste', commonsFile: 'Leonardo da Vinci - Saint John the Baptist C2RMF retouched.jpg' },
  { id: 'la-belle-jardiniere', commonsFile: "La Vierge à l'Enfant avec le petit saint Jean Baptiste - Raphaël - Musée du Louvre Peintures INV 602 ; MR 433.jpg" },
  { id: 'le-condottiere', commonsFile: 'Antonello da Messina - Portrait of a Man (Il Condottiere) cleaned version.jpg' },
  { id: 'saint-sebastien', commonsFile: 'Saint Sebastian by Mantegna (Louvre).jpg' },
];

/** HTML 태그를 벗겨 평문으로 (Commons 메타데이터는 HTML 조각으로 옵니다) */
const stripHtml = (s) =>
  (s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Commons는 연속 요청에 429를 돌려주므로 지수 백오프로 재시도합니다. */
async function withRetry(label, fn, attempts = 7) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      const wait = Math.min(60000, 4000 * 2 ** (i - 1));
      console.log(`  … ${label} 재시도 ${i}/${attempts - 1} (${wait}ms): ${err.message}`);
      await sleep(wait);
    }
  }
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  return withRetry('API', async () => {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Commons API ${res.status} ${res.statusText}`);
    return res.json();
  });
}

/** 긴 변이 MAX_LONG_SIDE 이하가 되도록 요청할 썸네일 폭을 계산 */
function thumbWidthFor(width, height) {
  if (Math.max(width, height) <= MAX_LONG_SIDE) return null; // 원본이 이미 작으면 그대로
  return height > width ? Math.round((MAX_LONG_SIDE * width) / height) : MAX_LONG_SIDE;
}

async function fetchOne({ id, commonsFile }) {
  const title = `File:${commonsFile}`;

  // 이미 받아 둔 파일은 건너뛴다 (Commons 요청 제한에 걸려도 이어받을 수 있도록).
  // 다시 받으려면 FORCE=1 npm run fetch-images 또는 .cache/originals 를 비운다.
  if (!process.env.FORCE) {
    const cached = await readCachedMeta(id);
    if (cached) {
      console.log(`· ${id}.jpg 이미 있음 — 건너뜀 (${cached.pixels})`);
      return cached;
    }
  }

  // 1) 원본 크기 + 라이선스 메타데이터
  const probe = await api({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiextmetadatafilter: 'LicenseShortName|Artist|Credit|LicenseUrl|UsageTerms',
  });
  const page = probe.query.pages[0];
  if (page.missing) throw new Error(`Commons에 없는 파일: ${title}`);
  const info = page.imageinfo[0];
  const meta = info.extmetadata ?? {};

  // 2) 긴 변 4096px 이하 썸네일 URL 확보
  const width = thumbWidthFor(info.width, info.height);
  let downloadUrl = info.url;
  let finalW = info.width;
  let finalH = info.height;
  if (width) {
    const thumb = await api({
      action: 'query',
      titles: title,
      prop: 'imageinfo',
      iiprop: 'url|size',
      iiurlwidth: String(width),
    });
    const ti = thumb.query.pages[0].imageinfo[0];
    downloadUrl = ti.thumburl;
    finalW = ti.thumbwidth;
    finalH = ti.thumbheight;
  }

  // 3) 저장
  const bytes = await withRetry(`${id} 다운로드`, async () => {
    const res = await fetch(downloadUrl, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`다운로드 실패 ${res.status}: ${downloadUrl}`);
    return Buffer.from(await res.arrayBuffer());
  });
  await writeFile(resolve(CACHE_DIR, `${id}.jpg`), bytes);

  const credit = {
    id,
    commonsFile,
    descriptionPage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    author: stripHtml(meta.Artist?.value) || '알 수 없음',
    license: stripHtml(meta.LicenseShortName?.value) || stripHtml(meta.UsageTerms?.value) || '알 수 없음',
    licenseUrl: stripHtml(meta.LicenseUrl?.value) || '',
    pixels: `${finalW}x${finalH}`,
    originalPixels: `${info.width}x${info.height}`,
    sizeKb: Math.round(bytes.length / 1024),
  };
  await writeFile(resolve(CACHE_DIR, `${id}.meta.json`), JSON.stringify(credit, null, 2), 'utf8');
  console.log(
    `✓ .cache/originals/${id}.jpg  ${credit.originalPixels} → ${credit.pixels}  ${credit.sizeKb} KB  [${credit.license}]`,
  );
  return credit;
}

/** 이전 실행에서 받아 둔 원본 + 메타데이터가 있으면 돌려준다 */
async function readCachedMeta(id) {
  try {
    await stat(resolve(CACHE_DIR, `${id}.jpg`));
    return JSON.parse(await readFile(resolve(CACHE_DIR, `${id}.meta.json`), 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(CREDITS_DIR, { recursive: true });
  const credits = [];
  for (const target of TARGETS) {
    credits.push(await fetchOne(target)); // Commons 예절상 순차 요청
    await sleep(3500); // Commons 요청 제한(429)을 피하기 위한 간격
  }

  const md = [
    '# 이미지 출처 및 라이선스',
    '',
    '`public/images/` 의 모든 작품 이미지는 Wikimedia Commons의 **퍼블릭 도메인** 파일에서 변환한 것입니다.',
    '원작은 모두 저작권 보호기간이 만료된 16세기 회화입니다.',
    '',
    '파이프라인: `npm run fetch-images` 가 Commons에서 긴 변 4096px 이하 원본을 `.cache/originals/` 로 받고,',
    '`npm run optimize-images` 가 이를 WebP 두 벌로 변환합니다.',
    '',
    '| 용도 | 경로 | 긴 변 | 품질 |',
    '| --- | --- | --- | --- |',
    '| 3D 텍스처 | `public/images/<id>.webp` | 2048px | 80 |',
    '| 크게 보기 뷰어 (지연 로딩) | `public/images/large/<id>.webp` | 4096px | 82 |',
    '',
    '아래 해상도는 Commons에서 받은 원본 기준입니다.',
    '',
    ...credits.flatMap((c) => [
      `## ${c.id}`,
      '',
      `- **Commons 파일**: [${c.commonsFile}](${c.descriptionPage})`,
      `- **Commons \`Artist\` 필드**: ${c.author}`,
      `- **라이선스**: ${c.license}${c.licenseUrl ? ` (${c.licenseUrl})` : ''}`,
      `- **내려받은 해상도**: ${c.pixels} (Commons 원본 ${c.originalPixels}) · ${c.sizeKb} KB`,
      '',
    ]),
  ].join('\n');
  await writeFile(resolve(CREDITS_DIR, 'CREDITS.md'), md, 'utf8');
  console.log(`\n→ ${credits.length}개 저장 완료. public/images/CREDITS.md 갱신.`);
  console.log('→ 이어서 `npm run optimize-images` 를 실행하세요.');
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
