/**
 * 2단계 — .cache/originals/*.jpg 를 배포용 WebP 두 벌로 변환합니다.
 *
 *   npm run optimize-images
 *
 *   public/images/<id>.webp        3D 텍스처용 · 긴 변 2048px · quality 80
 *   public/images/large/<id>.webp  크게 보기 뷰어용 · 긴 변 4096px · quality 82 (지연 로딩)
 *
 * 텍스처 용량은 **전시실 단위**로 TEXTURE_BUDGET_MB 를 넘으면 실패로 끝납니다.
 * 전시실은 한 번에 하나만 로딩하므로, 입장할 때 받는 양이 곧 한 방의 합계입니다.
 * (뷰어용은 "크게 보기"를 눌러야 받으므로 상한에서 제외.)
 */
import { readdir, mkdir, stat, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = resolve(ROOT, '.cache/originals');
const TEX_DIR = resolve(ROOT, 'public/images');
const BIG_DIR = resolve(ROOT, 'public/images/large');

const TEXTURE = { maxSide: 2048, quality: 80 };
const VIEWER = { maxSide: 4096, quality: 82 };
const TEXTURE_BUDGET_MB = 4; // 전시실 한 곳 기준

/**
 * 이미지 비율이 루브르 공식 치수와 많이 다른 작품은 **가운데를 잘라** 공식 비율에 맞춘다.
 * 늘이면 그림이 찌그러지므로, 가장자리를 조금 잃더라도 비율을 지키는 쪽을 택한다.
 * (id → paintings.json 의 size 로 목표 비율을 계산)
 */
const CROP_TO_OFFICIAL = new Set([
  'sainte-anne', // 공식 168 × 113 cm, Commons 스캔은 약 10% 더 넓다
]);

const mb = (bytes) => bytes / 1024 / 1024;
const kb = (bytes) => Math.round(bytes / 1024);

/**
 * 긴 변이 maxSide 를 넘을 때만 축소(업스케일하지 않음).
 * targetAspect(가로/세로)가 주어지면 먼저 가운데를 잘라 그 비율로 맞춘다.
 */
async function convert(srcPath, outPath, { maxSide, quality }, targetAspect = null) {
  let image = sharp(srcPath, { limitInputPixels: false });
  const meta = await image.metadata();
  let width = meta.width;
  let height = meta.height;
  let cropped = null;

  if (targetAspect) {
    const current = width / height;
    if (Math.abs(current - targetAspect) / targetAspect > 0.01) {
      const cropW = current > targetAspect ? Math.round(height * targetAspect) : width;
      const cropH = current > targetAspect ? height : Math.round(width / targetAspect);
      image = image.extract({
        left: Math.round((width - cropW) / 2),
        top: Math.round((height - cropH) / 2),
        width: cropW,
        height: cropH,
      });
      cropped = `${width}x${height} → ${cropW}x${cropH}`;
      width = cropW;
      height = cropH;
    }
  }

  const needsResize = Math.max(width, height) > maxSide;
  const pipeline = needsResize
    ? image.resize({
        width: width >= height ? maxSide : undefined,
        height: height > width ? maxSide : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      })
    : image;

  const info = await pipeline.webp({ quality, effort: 5 }).toFile(outPath);
  return { from: `${meta.width}x${meta.height}`, to: `${info.width}x${info.height}`, bytes: info.size, cropped };
}

async function main() {
  let sources;
  try {
    sources = (await readdir(SRC_DIR)).filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f)).sort();
  } catch {
    console.error(`원본 폴더가 없습니다: ${SRC_DIR}\n먼저 \`npm run fetch-images\` 를 실행하세요.`);
    process.exit(1);
  }
  if (!sources.length) {
    console.error('변환할 원본이 없습니다. 먼저 `npm run fetch-images` 를 실행하세요.');
    process.exit(1);
  }

  await mkdir(TEX_DIR, { recursive: true });
  await mkdir(BIG_DIR, { recursive: true });

  // 작품 id → 전시실 id (용량을 전시실 단위로 집계하기 위해)
  const paintings = JSON.parse(await readFile(resolve(ROOT, 'src/data/paintings.json'), 'utf8')).paintings;
  const roomOf = new Map(paintings.map((p) => [p.id, p.room]));
  const sizeOf = new Map(paintings.map((p) => [p.id, p.size]));

  let texTotal = 0;
  let bigTotal = 0;
  let srcTotal = 0;
  const rows = [];

  for (const file of sources) {
    const id = basename(file).replace(/\.[^.]+$/, '');
    const src = resolve(SRC_DIR, file);
    srcTotal += (await stat(src)).size;

    const size = sizeOf.get(id);
    const targetAspect = CROP_TO_OFFICIAL.has(id) && size ? size.widthCm / size.heightCm : null;

    const tex = await convert(src, resolve(TEX_DIR, `${id}.webp`), TEXTURE, targetAspect);
    const big = await convert(src, resolve(BIG_DIR, `${id}.webp`), VIEWER, targetAspect);
    if (tex.cropped) console.log(`  · ${id}: 공식 비율에 맞춰 가운데를 잘라냄 ${tex.cropped}`);
    texTotal += tex.bytes;
    bigTotal += big.bytes;

    rows.push({ id, room: roomOf.get(id) ?? '(미배치)', tex, big });
    console.log(
      `✓ ${id.padEnd(26)} 텍스처 ${tex.to.padEnd(10)} ${String(kb(tex.bytes)).padStart(5)} KB` +
        `   뷰어 ${big.to.padEnd(10)} ${String(kb(big.bytes)).padStart(5)} KB`,
    );
  }

  // 전시실별 집계
  const byRoom = new Map();
  for (const r of rows) {
    const acc = byRoom.get(r.room) ?? { tex: 0, big: 0, count: 0 };
    acc.tex += r.tex.bytes;
    acc.big += r.big.bytes;
    acc.count++;
    byRoom.set(r.room, acc);
  }

  console.log(`\n원본(JPEG) 합계 ${mb(srcTotal).toFixed(2)} MB\n`);
  console.log(`전시실별 3D 텍스처 용량 (상한 ${TEXTURE_BUDGET_MB} MB / 전시실)`);
  const over = [];
  for (const [room, acc] of byRoom) {
    const ok = mb(acc.tex) <= TEXTURE_BUDGET_MB;
    if (!ok) over.push(room);
    console.log(`  ${ok ? '✓' : '✗'} ${room.padEnd(20)} ${acc.count}점  ${mb(acc.tex).toFixed(2)} MB`);
  }
  console.log(`\n전체 텍스처 ${mb(texTotal).toFixed(2)} MB · 뷰어 ${mb(bigTotal).toFixed(2)} MB (지연 로딩)`);

  await writeFile(
    resolve(TEX_DIR, 'SIZES.md'),
    [
      '# 이미지 변환 결과',
      '',
      '`npm run optimize-images` 가 자동 생성합니다. 출처·라이선스는 [CREDITS.md](CREDITS.md) 참고.',
      '',
      `## 전시실별 3D 텍스처 용량 (상한 ${TEXTURE_BUDGET_MB} MB / 전시실)`,
      '',
      '전시실은 한 번에 하나만 로딩하므로, 입장할 때 내려받는 양이 곧 한 방의 합계입니다.',
      '',
      '| 전시실 | 작품 수 | 텍스처 합계 | 뷰어 합계(지연 로딩) |',
      '| --- | ---: | ---: | ---: |',
      ...[...byRoom].map(
        ([room, a]) => `| ${room} | ${a.count} | **${mb(a.tex).toFixed(2)} MB** | ${mb(a.big).toFixed(2)} MB |`,
      ),
      '',
      '## 작품별',
      '',
      '| 작품 | 전시실 | 원본 | 텍스처 WebP (2048) | 뷰어 WebP (4096) |',
      '| --- | --- | --- | --- | --- |',
      ...rows.map(
        (r) =>
          `| ${r.id} | ${r.room} | ${r.tex.from} | ${r.tex.to} · ${kb(r.tex.bytes)} KB | ${r.big.to} · ${kb(r.big.bytes)} KB |`,
      ),
      '',
      `- 원본 JPEG 합계: ${mb(srcTotal).toFixed(2)} MB (저장소에 포함하지 않음)`,
      `- 전체 텍스처: ${mb(texTotal).toFixed(2)} MB · 전체 뷰어: ${mb(bigTotal).toFixed(2)} MB`,
      '',
    ].join('\n'),
    'utf8',
  );

  if (over.length) {
    console.error(
      `\n✗ 전시실 ${over.join(', ')} 의 텍스처 합계가 상한 ${TEXTURE_BUDGET_MB} MB 를 넘었습니다. ` +
        `TEXTURE.quality 를 낮추거나 maxSide 를 줄이세요.`,
    );
    process.exit(1);
  }
  console.log('\n→ 완료. public/images/SIZES.md 갱신.');
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
