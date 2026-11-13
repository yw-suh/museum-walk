/**
 * 조각 3D 모델 준비 — .cache/models/<id>-source.glb → public/models/<id>.glb
 *
 *   npm run prepare-models
 *
 * 하는 일 (모두 npm 패키지만 사용 · 외부 프로그램 없음):
 *   1. STL 이 들어오면 GLB 로 변환  (three.js STLLoader + glTF Transform)
 *   2. 쓰지 않는 노드·재질 정리 (dedup → prune → weld)
 *   3. 삼각형 수가 상한을 넘으면 simplify 로 감량 (meshoptimizer)
 *   4. 대리석 재질로 통일 (밝은 회백색 · 약한 광택)
 *   5. 실제 높이에 맞춰 크기를 정규화하고 바닥 중앙을 원점으로
 *   6. meshopt 로 압축해 저장  (Draco 와 달리 디코더가 three 에 포함되어 있다)
 *
 * 결과 용량·삼각형 수는 public/models/MODELS.md 에 기록한다.
 */
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, resample, flatten, join } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = resolve(ROOT, '.cache/models');
const OUT_DIR = resolve(ROOT, 'public/models');

const MAX_TRIANGLES = 100_000; // 작품 하나당
const MAX_MB = 5; // 작품 하나당

/** 실제 높이(m)와 재질. heightM 은 루브르 공식 기록값에서 가져온다. */
const TARGETS = [
  {
    id: 'victoire-de-samothrace',
    label: '사모트라케의 니케',
    heightM: 3.28, // 공식 기록의 조각상 높이 (뱃머리 받침 제외)
    marble: { color: 0xdedacf, roughness: 0.62, metalness: 0.0 },
  },
  {
    id: 'venus-de-milo',
    label: '밀로의 비너스',
    heightM: 2.04, // 공식 기록
    marble: { color: 0xe4ded0, roughness: 0.58, metalness: 0.0 },
  },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});
const mb = (bytes) => bytes / 1024 / 1024;

/** STL(바이너리/ASCII) → glTF Transform Document */
async function documentFromStl(path) {
  const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
  const buffer = await readFile(path);
  const geometry = new STLLoader().parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );

  const doc = new Document();
  const buf = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(geometry.attributes.position.array))
    .setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute('POSITION', position);
  if (geometry.attributes.normal) {
    prim.setAttribute(
      'NORMAL',
      doc
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(geometry.attributes.normal.array))
        .setBuffer(buf),
    );
  }
  if (geometry.index) {
    prim.setIndices(
      doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(geometry.index.array)).setBuffer(buf),
    );
  }
  const mesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(mesh);
  doc.createScene().addChild(node);
  return doc;
}

function countVertices(doc) {
  let total = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) total += prim.getAttribute('POSITION')?.getCount() ?? 0;
  }
  return total;
}

/** 법선을 떼어 내 위치만 남긴다 (weld 가 위치 기준으로 병합하도록) */
function dropNormals(doc) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of prim.listSemantics()) {
        if (semantic !== 'POSITION') prim.setAttribute(semantic, null);
      }
    }
  }
}

/** 면적 가중 평균으로 매끄러운 정점 법선을 다시 만든다 */
function computeVertexNormals(doc) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION');
      const indices = prim.getIndices();
      if (!position || !indices) continue;

      const count = position.getCount();
      const normals = new Float32Array(count * 3);
      const a = [0, 0, 0];
      const b = [0, 0, 0];
      const c = [0, 0, 0];

      for (let i = 0; i < indices.getCount(); i += 3) {
        const ia = indices.getScalar(i);
        const ib = indices.getScalar(i + 1);
        const ic = indices.getScalar(i + 2);
        position.getElement(ia, a);
        position.getElement(ib, b);
        position.getElement(ic, c);

        // 외적의 크기가 곧 삼각형 면적의 두 배라 자연스럽게 면적 가중이 된다
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const nx = e1[1] * e2[2] - e1[2] * e2[1];
        const ny = e1[2] * e2[0] - e1[0] * e2[2];
        const nz = e1[0] * e2[1] - e1[1] * e2[0];

        for (const index of [ia, ib, ic]) {
          normals[index * 3] += nx;
          normals[index * 3 + 1] += ny;
          normals[index * 3 + 2] += nz;
        }
      }

      for (let i = 0; i < count; i++) {
        const x = normals[i * 3];
        const y = normals[i * 3 + 1];
        const z = normals[i * 3 + 2];
        const length = Math.hypot(x, y, z) || 1;
        normals[i * 3] = x / length;
        normals[i * 3 + 1] = y / length;
        normals[i * 3 + 2] = z / length;
      }

      prim.setAttribute(
        'NORMAL',
        doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(doc.getRoot().listBuffers()[0]),
      );
    }
  }
}

function countTriangles(doc) {
  let total = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const position = prim.getAttribute('POSITION');
      total += Math.floor((indices ? indices.getCount() : (position?.getCount() ?? 0)) / 3);
    }
  }
  return total;
}

/** 모든 정점을 훑어 월드 기준 바운딩 박스를 구한다 (노드 변환 포함) */
function bounds(doc) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (node, parent) => {
    const matrix = multiply(parent, node.getMatrix());
    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const position = prim.getAttribute('POSITION');
        if (!position) continue;
        const v = [0, 0, 0];
        for (let i = 0; i < position.getCount(); i++) {
          position.getElement(i, v);
          const p = transform(matrix, v);
          for (let a = 0; a < 3; a++) {
            if (p[a] < min[a]) min[a] = p[a];
            if (p[a] > max[a]) max[a] = p[a];
          }
        }
      }
    }
    for (const child of node.listChildren()) visit(child, matrix);
  };
  for (const scene of doc.getRoot().listScenes()) {
    for (const node of scene.listChildren()) visit(node, IDENTITY);
  }
  return { min, max };
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

function transform(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
  ];
}

async function processOne(target, sourcePath) {
  const srcBytes = (await stat(sourcePath)).size;
  const doc = sourcePath.toLowerCase().endsWith('.stl')
    ? await documentFromStl(sourcePath)
    : await io.read(sourcePath);

  const before = countTriangles(doc);

  // 정리 — 중복 제거, 안 쓰는 것 버리기, 노드 구조 평탄화
  await doc.transform(dedup(), flatten(), join(), prune(), resample());

  // 사진측량 스캔은 삼각형마다 법선이 달라 정점이 전부 쪼개져 있다.
  // 그대로 두면 이웃 삼각형이 이어져 있지 않아 감량이 거의 되지 않으므로,
  // 법선을 떼고 **위치 기준으로 병합**한 뒤 감량하고 법선을 다시 계산한다.
  const splitVertices = countVertices(doc);
  dropNormals(doc);
  await doc.transform(weld(), prune());
  const weldedVertices = countVertices(doc);

  // 감량 — 상한을 넘을 때만
  const welded = countTriangles(doc);
  if (welded > MAX_TRIANGLES) {
    await MeshoptSimplifier.ready;
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio: MAX_TRIANGLES / welded, error: 0.01 }),
      prune(),
    );
  }
  computeVertexNormals(doc);
  const after = countTriangles(doc);

  // 대리석 재질로 통일 (스캔 원본의 사진 텍스처는 실내 조명과 섞이면 탁해진다)
  const marble = doc
    .createMaterial(`${target.id}-marble`)
    .setBaseColorFactor([
      ((target.marble.color >> 16) & 255) / 255,
      ((target.marble.color >> 8) & 255) / 255,
      (target.marble.color & 255) / 255,
      1,
    ])
    .setRoughnessFactor(target.marble.roughness)
    .setMetallicFactor(target.marble.metalness);
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) prim.setMaterial(marble);
  }
  await doc.transform(prune());

  // 실제 높이에 맞춰 크기 조정 + 바닥 중앙을 원점으로
  const { min, max } = bounds(doc);
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const scale = target.heightM / size[1];
  const root = doc.createNode(`${target.id}-root`);
  for (const scene of doc.getRoot().listScenes()) {
    for (const node of [...scene.listChildren()]) {
      scene.removeChild(node);
      root.addChild(node);
    }
    scene.addChild(root);
  }
  root.setScale([scale, scale, scale]);
  root.setTranslation([
    -((min[0] + max[0]) / 2) * scale,
    -min[1] * scale,
    -((min[2] + max[2]) / 2) * scale,
  ]);

  // meshopt 압축 — 디코더가 three 에 들어 있어 추가 파일이 필요 없다
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });

  const outPath = resolve(OUT_DIR, `${target.id}.glb`);
  await writeFile(outPath, await io.writeBinary(doc));
  const outBytes = (await stat(outPath)).size;

  return {
    id: target.id,
    label: target.label,
    source: basename(sourcePath),
    srcMB: mb(srcBytes),
    outMB: mb(outBytes),
    before,
    after,
    heightM: target.heightM,
    splitVertices, weldedVertices,
    footprint: [size[0] * scale, size[1] * scale, size[2] * scale],
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let files;
  try {
    files = await readdir(SRC_DIR);
  } catch {
    console.error(`원본 폴더가 없습니다: ${SRC_DIR}\nREADME 의 "3D 모델 내려받기" 절차를 따르세요.`);
    process.exit(1);
  }

  const rows = [];
  let failed = false;
  for (const target of TARGETS) {
    const file = files.find((f) => f.startsWith(`${target.id}-source.`) || f.startsWith(`${shortId(target.id)}-source.`));
    if (!file) {
      console.error(`✗ ${target.id}: .cache/models/${target.id}-source.glb 를 찾을 수 없습니다.`);
      failed = true;
      continue;
    }
    const row = await processOne(target, resolve(SRC_DIR, file));
    rows.push(row);
    const okTri = row.after <= MAX_TRIANGLES;
    const okSize = row.outMB <= MAX_MB;
    console.log(
      `${okTri && okSize ? '✓' : '✗'} ${row.id.padEnd(24)} ` +
        `삼각형 ${row.before.toLocaleString()} → ${row.after.toLocaleString()} (상한 ${MAX_TRIANGLES.toLocaleString()})  ` +
        `용량 ${row.srcMB.toFixed(2)} → ${row.outMB.toFixed(2)} MB (상한 ${MAX_MB})  ` +
        `높이 ${row.heightM} m`,
    );
    if (!okTri || !okSize) failed = true;
  }

  await writeFile(
    resolve(OUT_DIR, 'MODELS.md'),
    [
      '# 3D 모델 변환 결과',
      '',
      '`npm run prepare-models` 가 자동 생성합니다. 출처·라이선스는 [CREDITS.md](../images/CREDITS.md) 참고.',
      '',
      `| 작품 | 원본 파일 | 삼각형(전/후) | 용량(전/후) | 실제 높이 | 화면 크기(가로×높이×깊이) |`,
      '| --- | --- | --- | --- | --- | --- |',
      ...rows.map(
        (r) =>
          `| ${r.label} | ${r.source} | ${r.before.toLocaleString()} → **${r.after.toLocaleString()}** | ` +
          `${r.srcMB.toFixed(2)} → **${r.outMB.toFixed(2)} MB** | ${r.heightM} m | ` +
          `${r.footprint.map((n) => n.toFixed(2)).join(' × ')} m |`,
      ),
      '',
      `- 상한: 작품당 삼각형 ${MAX_TRIANGLES.toLocaleString()}개 이하, 파일 ${MAX_MB} MB 이하`,
      '- 압축: EXT_meshopt_compression (디코더가 three.js 에 포함되어 추가 파일이 필요 없음)',
      '- 원본 파일은 `.cache/models/` 에 두며 저장소에는 포함하지 않습니다.',
      '',
    ].join('\n'),
    'utf8',
  );

  console.log('\n→ public/models/MODELS.md 갱신.');
  if (failed) process.exit(1);
}

const shortId = (id) => id.split('-')[0];

main().catch((err) => {
  console.error('실패:', err);
  process.exit(1);
});
