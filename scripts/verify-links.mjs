/**
 * paintings.json 의 모든 외부 링크(루브르 공식 소장품 페이지, 한국어 위키백과)와
 * 이미지 출처 URL이 실제로 열리는지 확인합니다.
 *
 *   npm run verify-links
 *
 * 하나라도 실패하면 종료 코드 1 로 끝납니다.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (compatible; louvre-salle-des-etats/0.1; link check)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 한글이 그대로 들어간 위키백과 주소는 인코딩해서 요청한다.
 * 이미 퍼센트 인코딩된 주소를 다시 인코딩하면 % 가 %25 가 되어 404 가 나므로,
 * %XX 패턴이 보이면 그대로 쓴다.
 */
function toRequestUrl(url) {
  return /%[0-9A-Fa-f]{2}/.test(url) ? url : encodeURI(url);
}

async function check(url) {
  const target = toRequestUrl(url);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(target, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (res.status !== 429) return { ok: res.ok, status: res.status, final: res.url };
    } catch (err) {
      if (attempt === 3) return { ok: false, status: err.message, final: target };
    }
    await sleep(2000 * attempt);
  }
  return { ok: false, status: 429, final: target };
}

const data = JSON.parse(await readFile(resolve(ROOT, 'src/data/paintings.json'), 'utf8'));

const jobs = [];
for (const p of data.paintings) {
  for (const link of p.links) jobs.push({ who: `${p.id} · ${link.type}`, url: link.url });
  jobs.push({ who: `${p.id} · image`, url: p.credit.fileUrl });
}

let failed = 0;
for (const job of jobs) {
  const { ok, status, final } = await check(job.url);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${String(status).padEnd(4)} ${job.who}\n    ${final}`);
  await sleep(400);
}

console.log(`\n${jobs.length - failed}/${jobs.length} 링크 정상.`);
process.exit(failed ? 1 : 0);
