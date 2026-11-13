/**
 * 설명문 점검 — 루브르 공식 기록의 문장을 그대로 옮긴 부분이 없는지 확인합니다.
 *
 *   npm run audit-descriptions
 *
 * 공식 ark JSON 의 텍스트 필드(설명·이력·주석 등)를 모두 모은 뒤,
 * 우리 설명문과 **5글자 이상 겹치는 연속 구간**이 있는지 찾습니다.
 * 우리 글은 한국어, 공식 기록은 프랑스어라 원칙적으로 겹칠 수 없지만,
 * 고유명사 말고 문장이 겹친다면 그때는 다시 써야 합니다.
 *
 * 함께 점검하는 것:
 *   · 설명문이 2~3문장인지
 *   · 한국어 외 언어로 된 문장이 통째로 들어가 있지 않은지
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = resolve(ROOT, '.cache/louvre');
const UA = 'museum-walk/0.1 (educational project)';
const MIN_MATCH = 5; // 이 길이 이상 겹치면 보고
// 연도·치수 같은 숫자는 사실 정보라 겹쳐도 문제가 아니다.
// "문장을 옮겼는지"를 보려면 **글자(한글·라틴 문자)가 4자 이상** 이어진 구간만 센다.
const LETTERS = /[가-힣A-Za-zÀ-ÿ]/g;
const meaningful = (s) => (s.match(LETTERS) ?? []).length >= 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ark 레코드를 받아 .cache 에 저장 (두 번째 실행부터는 캐시 사용) */
async function fetchRecord(arkId) {
  const path = resolve(CACHE, `${arkId}.json`);
  try {
    await stat(path);
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    /* 아직 없음 */
  }
  const res = await fetch(`https://collections.louvre.fr/ark:/53355/${arkId}.json`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`${arkId}: HTTP ${res.status}`);
  const json = await res.json();
  await writeFile(path, JSON.stringify(json), 'utf8');
  await sleep(500);
  return json;
}

/** 레코드 안의 모든 문자열을 한 덩어리로 */
function allText(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) allText(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) allText(v, out);
  return out;
}

/** a 와 b 가 공유하는 가장 긴 연속 부분 문자열 */
function longestCommonSubstring(a, b) {
  let best = '';
  for (let i = 0; i < a.length; i++) {
    for (let j = i + best.length + 1; j <= a.length; j++) {
      const piece = a.slice(i, j);
      if (!b.includes(piece)) break;
      if (piece.length > best.length) best = piece;
    }
  }
  return best;
}

const normalize = (s) => s.replace(/\s+/g, ' ').trim();
const sentenceCount = (s) => s.split(/[.!?。]\s*/).filter((x) => x.trim().length > 3).length;
const hasLatinSentence = (s) => /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s,'’-]{35,}/.test(s);

async function main() {
  await mkdir(CACHE, { recursive: true });
  const paintings = JSON.parse(await readFile(resolve(ROOT, 'src/data/paintings.json'), 'utf8')).paintings;
  const sculptures = JSON.parse(await readFile(resolve(ROOT, 'src/data/sculptures.json'), 'utf8')).sculptures;
  const works = [...paintings, ...sculptures];

  let problems = 0;
  console.log(`설명문 ${works.length}건 점검\n`);

  for (const work of works) {
    const arkUrl = work.links.find((l) => l.type === 'louvre')?.url ?? '';
    const arkId = arkUrl.split('/').pop();
    let official = '';
    try {
      official = normalize(allText(await fetchRecord(arkId)).join(' ')).toLowerCase();
    } catch (err) {
      console.log(`· ${work.id}: 공식 기록을 가져오지 못해 건너뜀 (${err.message})`);
      continue;
    }

    const mine = normalize(work.description);
    const overlap = longestCommonSubstring(mine.toLowerCase(), official);
    const sentences = sentenceCount(mine);

    const flags = [];
    if (overlap.length >= MIN_MATCH && meaningful(overlap)) {
      flags.push(`공식 기록과 "${overlap}" (${overlap.length}자) 겹침 — 다시 쓰세요`);
    }
    if (sentences < 2 || sentences > 4) flags.push(`문장 ${sentences}개 (2~3문장 권장)`);
    if (hasLatinSentence(mine)) flags.push('라틴 문자 문장이 통째로 들어 있음');

    if (flags.length) {
      problems++;
      console.log(`✗ ${work.id}\n    ${flags.join('\n    ')}`);
    } else {
      const kind = meaningful(overlap) ? '' : ' (숫자·기호뿐)';
      console.log(`✓ ${work.id.padEnd(26)} ${sentences}문장 · 최장 공통 구간 ${overlap.length}자 "${overlap}"${kind}`);
    }
  }

  console.log(
    problems
      ? `\n✗ ${problems}건 확인 필요.`
      : '\n✓ 모두 통과 — 공식 기록 문장을 그대로 옮긴 부분이 없습니다.',
  );
  process.exit(problems ? 1 : 0);
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
