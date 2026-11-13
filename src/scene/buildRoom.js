import * as THREE from 'three';

/**
 * rooms.json 의 한 공간을 3D 지오메트리로 만든다.
 * @returns {{ group: THREE.Group, colliders: THREE.Box3[], wallIndex: Map<string, object>, portalTargets: THREE.Mesh[] }}
 */
export function buildRoom(room) {
  const group = new THREE.Group();
  const colliders = [];
  const { width, depth, height } = room.dimensions;
  const c = room.materials;

  // ── 바닥 (쪽모이 마루 느낌의 절차적 텍스처) ───────────────────────────────
  const floorTexture = makeParquetTexture(c.floor);
  floorTexture.repeat.set(Math.max(2, width / 3), Math.max(2, depth / 3));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.72, metalness: 0.04 }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // ── 천장 (바깥 공간은 하늘) ───────────────────────────────────────────────
  const vault = (room.features ?? []).find((f) => f.type === 'vault');
  if (room.sky) {
    group.add(makeSky(room.sky));
  } else if (vault) {
    group.add(makeVault(vault, depth));
  } else {
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({
        color: c.ceiling,
        emissive: new THREE.Color(c.ceiling),
        emissiveIntensity: 0.55,
        roughness: 1,
      }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    group.add(ceiling);
  }

  // ── 벽 ────────────────────────────────────────────────────────────────────
  const wallMaterial = new THREE.MeshStandardMaterial({ color: c.wall, roughness: 0.94 });
  const wainscotMaterial = new THREE.MeshStandardMaterial({ color: c.wainscot, roughness: 0.9 });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: c.trim,
    roughness: 0.42,
    metalness: 0.55,
  });

  const wallIndex = new Map();

  for (const wall of room.walls) {
    wallIndex.set(wall.id, wall);
    const size = wallSize(wall);
    const [cx, cz] = wall.center;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMaterial);
    mesh.position.set(cx, wall.height / 2, cz);
    group.add(mesh);

    const wainscotHeight = 0.6;
    const wainscot = new THREE.Mesh(
      new THREE.BoxGeometry(
        size[0] + (wall.axis === 'x' ? 0 : 0.06),
        wainscotHeight,
        size[2] + (wall.axis === 'x' ? 0.06 : 0),
      ),
      wainscotMaterial,
    );
    wainscot.position.set(cx, wainscotHeight / 2, cz);
    group.add(wainscot);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(
        size[0] + (wall.axis === 'x' ? 0 : 0.09),
        0.07,
        size[2] + (wall.axis === 'x' ? 0.09 : 0),
      ),
      trimMaterial,
    );
    trim.position.set(cx, wainscotHeight + 0.04, cz);
    group.add(trim);

    colliders.push(new THREE.Box3().setFromObject(mesh));
  }

  // ── 집기 ──────────────────────────────────────────────────────────────────
  for (const item of room.furniture ?? []) {
    const [sx, sy, sz] = item.size;
    const [px, pz] = item.position;
    group.add(item.type === 'barrier' ? makeBarrier(item) : makeBench(item));
    colliders.push(
      new THREE.Box3(
        new THREE.Vector3(px - sx / 2, 0, pz - sz / 2),
        new THREE.Vector3(px + sx / 2, sy, pz + sz / 2),
      ),
    );
  }

  // ── 데이터로 직접 적은 충돌 박스 (바깥 공간의 건물·피라미드·수반 등) ─────
  for (const box of room.colliders ?? []) {
    colliders.push(new THREE.Box3(new THREE.Vector3(...box.min), new THREE.Vector3(...box.max)));
  }

  // ── 공간별 장식 ───────────────────────────────────────────────────────────
  for (const feature of room.features ?? []) {
    if (feature.type === 'pyramid') group.add(makePyramid(feature, height));
    if (feature.type === 'medallion') group.add(makeMedallion(feature));
    if (feature.type === 'glassPyramid') group.add(makeGlassPyramid(feature));
    if (feature.type === 'basin') group.add(makeBasin(feature));
    if (feature.type === 'palaceWing') group.add(makePalaceWing(feature));
    if (feature.type === 'stairs') group.add(makeStairs(feature));
  }

  // ── 포털(문 + 안내판) ─────────────────────────────────────────────────────
  const portalTargets = [];
  for (const portal of room.portals ?? []) {
    // 벽에 붙은 문이거나(wall), 바깥처럼 벽이 없는 곳에서는 좌표를 직접 적는다(position)
    let anchor;
    if (portal.wall) {
      const wall = wallIndex.get(portal.wall);
      if (!wall) {
        console.warn(`[room] 포털 '${portal.id}' 의 벽 '${portal.wall}' 을 찾을 수 없습니다.`);
        continue;
      }
      anchor = anchorOnWall(wall, { ...portal, centerHeight: PORTAL.height / 2 });
    } else if (portal.position) {
      anchor = {
        position: new THREE.Vector3(
          portal.position[0],
          portal.position[1] + PORTAL.height / 2,
          portal.position[2],
        ),
        rotationY: portal.rotationY ?? 0,
      };
    } else {
      console.warn(`[room] 포털 '${portal.id}' 에 wall 도 position 도 없습니다.`);
      continue;
    }
    const built = makePortal(portal, anchor, trimMaterial.color);
    group.add(built.group);
    portalTargets.push(built.target);
  }

  return { group, colliders, wallIndex, portalTargets };
}

/** 벽 박스의 [x, y, z] 크기 */
export function wallSize(wall) {
  return wall.axis === 'x'
    ? [wall.length, wall.height, wall.thickness]
    : [wall.thickness, wall.height, wall.length];
}

/** 벽 위 한 점의 월드 좌표·법선·회전 (작품과 포털이 함께 쓴다) */
export function anchorOnWall(wall, placement) {
  const sign = placement.face === '-' ? -1 : 1;
  const [cx, cz] = wall.center;
  const half = wall.thickness / 2;
  const height = placement.centerHeight ?? 0;

  if (wall.axis === 'x') {
    return {
      position: new THREE.Vector3(cx + placement.offset, height, cz + sign * half),
      rotationY: sign > 0 ? 0 : Math.PI,
      normal: new THREE.Vector3(0, 0, sign),
    };
  }
  return {
    position: new THREE.Vector3(cx + sign * half, height, cz + placement.offset),
    rotationY: sign > 0 ? Math.PI / 2 : -Math.PI / 2,
    normal: new THREE.Vector3(sign, 0, 0),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 구성 요소
// ────────────────────────────────────────────────────────────────────────────

const PORTAL = { width: 3.0, height: 3.6, signHeight: 1.05 };

/** 포털: 어두운 문 구멍 + 금색 문틀 + 안내판. 안내판 면이 Raycaster 판정 대상이다. */
function makePortal(portal, anchor, trimColor) {
  const group = new THREE.Group();
  group.position.copy(anchor.position);
  group.rotation.y = anchor.rotationY;

  // 문 구멍 (들어가는 느낌을 주는 어두운 면)
  const opening = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTAL.width, PORTAL.height),
    new THREE.MeshStandardMaterial({ color: '#0a1018', roughness: 1 }),
  );
  opening.position.z = 0.015;
  group.add(opening);

  // 문틀
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.35,
    metalness: 0.75,
  });
  const t = 0.16;
  const bars = [
    { size: [PORTAL.width + t * 2, t, 0.18], pos: [0, PORTAL.height / 2 + t / 2, 0.09] },
    { size: [t, PORTAL.height, 0.18], pos: [-PORTAL.width / 2 - t / 2, 0, 0.09] },
    { size: [t, PORTAL.height, 0.18], pos: [PORTAL.width / 2 + t / 2, 0, 0.09] },
  ];
  for (const bar of bars) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...bar.size), frameMaterial);
    mesh.position.set(...bar.pos);
    group.add(mesh);
  }

  // 안내판
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTAL.width + t * 2, PORTAL.signHeight),
    new THREE.MeshBasicMaterial({ map: makeSignTexture(portal), transparent: true, toneMapped: false }),
  );
  sign.position.set(0, PORTAL.height / 2 + t + PORTAL.signHeight / 2 + 0.06, 0.1);
  group.add(sign);

  // 판정 대상: 문 구멍 전체 + 안내판을 덮는 보이지 않는 판
  const target = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTAL.width + t * 2, PORTAL.height + PORTAL.signHeight + 0.2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  target.position.set(0, PORTAL.signHeight / 2, 0.12);
  target.userData.portal = portal;
  group.add(target);

  return { group, target };
}

function makeSignTexture(portal) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const fontKo = "700 86px 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif";
  const fontSm = "500 40px 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif";

  ctx.fillStyle = 'rgba(12, 20, 32, 0.9)';
  roundRect(ctx, 6, 6, canvas.width - 12, canvas.height - 12, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 169, 97, 0.8)';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontKo;
  ctx.fillStyle = '#f3eee4';
  ctx.fillText(portal.titleKo, canvas.width / 2, 108);

  ctx.font = fontSm;
  ctx.fillStyle = '#c9a961';
  ctx.fillText(portal.titleFr ?? '', canvas.width / 2, 184);
  ctx.fillStyle = '#9aa7b8';
  ctx.fillText(portal.note ?? '', canvas.width / 2, 244);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** 하늘 — 위에서 아래로 색이 바뀌는 반구 */
function makeSky(sky) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, sky.top);
  gradient.addColorStop(0.55, sky.middle);
  gradient.addColorStop(1, sky.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(sky.radius ?? 200, 32, 20),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * 바깥의 유리 피라미드 — 금속 격자 + 반투명 유리.
 * 밑변·높이는 데이터에 적은 실제 비율을 그대로 쓴다.
 */
function makeGlassPyramid(feature) {
  const group = new THREE.Group();
  const [px, pz] = feature.position;
  const half = feature.base / 2;

  // 유리면 — 사각뿔을 ConeGeometry(세그먼트 4)로 만든다
  const geometry = new THREE.ConeGeometry(half * Math.SQRT2, feature.height, 4, 1, true);
  geometry.rotateY(Math.PI / 4);

  const glass = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: feature.color,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    }),
  );
  glass.position.set(px, feature.height / 2, pz);
  group.add(glass);

  // 금속 격자 — 네 모서리 + 가로줄
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: feature.frame,
    roughness: 0.35,
    metalness: 0.85,
  });
  const barWidth = Math.max(0.05, feature.base * 0.008);
  const corners = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  for (const [cx, cz] of corners) {
    const length = Math.hypot(Math.hypot(cx, cz), feature.height);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(barWidth, length, barWidth), frameMaterial);
    bar.position.set(px + cx / 2, feature.height / 2, pz + cz / 2);
    bar.lookAt(px, feature.height, pz);
    bar.rotateX(Math.PI / 2);
    group.add(bar);
  }

  // 수평 격자 — 높이에 따라 줄어드는 사각 테두리
  const rows = Math.max(3, Math.round(feature.base / 4));
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    const size = feature.base * (1 - t);
    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size, 0.001, size)),
      new THREE.LineBasicMaterial({ color: feature.frame, transparent: true, opacity: 0.75 }),
    );
    ring.position.set(px, feature.height * t, pz);
    group.add(ring);
  }

  return group;
}

/** 얕은 수반 — 테두리 돌 + 물 면 */
function makeBasin(feature) {
  const group = new THREE.Group();
  const [px, pz] = feature.position;
  const [sx, sz] = feature.size;
  const depth = feature.depth ?? 0.35;

  const stone = new THREE.MeshStandardMaterial({ color: '#b9ad96', roughness: 0.85 });
  const rim = new THREE.Mesh(new THREE.BoxGeometry(sx, depth, sz), stone);
  rim.position.set(px, depth / 2, pz);
  group.add(rim);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(sx - 0.7, sz - 0.7),
    new THREE.MeshStandardMaterial({
      color: feature.water,
      roughness: 0.08,
      metalness: 0.45,
      transparent: true,
      opacity: 0.85,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(px, depth + 0.01, pz);
  group.add(water);
  return group;
}

/**
 * 궁전 외관 — 석조 매스 하나에 창·기둥 패턴 텍스처를 입힌 단순화 버전.
 * 사진 수준 재현이 아니라 "줄지어 선 창과 기둥"이라는 인상만 옮긴다.
 */
function makePalaceWing(feature) {
  const [cx, cz] = feature.center;
  const [sx, sz] = feature.size;
  const facade = makeFacadeTexture(feature);

  const long = sx >= sz;
  const repeatLong = Math.max(1, Math.round((long ? sx : sz) / 24));

  const side = (repeatX) => {
    const texture = facade.clone();
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, 1);
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92 });
  };

  const plain = new THREE.MeshStandardMaterial({ color: '#c6bca6', roughness: 0.95 });
  const longFace = side(repeatLong);
  const short = side(1);

  // BoxGeometry 재질 순서: +X, -X, +Y, -Y, +Z, -Z
  const materials = long
    ? [short, short, plain, plain, longFace, longFace]
    : [longFace, longFace, plain, plain, short, short];

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, feature.height, sz), materials);
  mesh.position.set(cx, feature.height / 2, cz);

  const group = new THREE.Group();
  group.add(mesh);

  // 지붕 — 살짝 튀어나온 처마
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(sx + 1.2, 1.1, sz + 1.2),
    new THREE.MeshStandardMaterial({ color: '#6e6a63', roughness: 0.8 }),
  );
  roof.position.set(cx, feature.height + 0.55, cz);
  group.add(roof);
  return group;
}

/** 창과 기둥이 반복되는 외벽 텍스처 */
function makeFacadeTexture(feature) {
  const bays = Math.max(4, Math.min(28, feature.bays ?? 20));
  const floors = Math.max(2, feature.floors ?? 4);
  const cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = bays * cell;
  canvas.height = floors * cell;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#cfc5ae';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 층 사이 띠
  ctx.fillStyle = '#b8ad95';
  for (let f = 1; f < floors; f++) {
    ctx.fillRect(0, canvas.height - f * cell - 4, canvas.width, 8);
  }
  // 1층 기단
  ctx.fillStyle = '#ab9f87';
  ctx.fillRect(0, canvas.height - cell, canvas.width, cell);

  for (let b = 0; b < bays; b++) {
    const x = b * cell;
    // 기둥(필라스터)
    ctx.fillStyle = '#d8cfba';
    ctx.fillRect(x + 2, 0, 7, canvas.height);

    for (let f = 0; f < floors; f++) {
      const y = canvas.height - (f + 1) * cell;
      const isGround = f === 0;
      const w = isGround ? 22 : 26;
      const h = isGround ? 30 : 38;
      ctx.fillStyle = '#3c4654';
      ctx.fillRect(x + (cell - w) / 2, y + (cell - h) / 2 + 4, w, h);
      // 창 위 돌림장식
      ctx.fillStyle = '#e0d7c2';
      ctx.fillRect(x + (cell - w) / 2 - 3, y + (cell - h) / 2, w + 6, 5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** 계단 — ground 의 ramp 와 같은 구간에 단을 쌓아 눈에 보이게 한다 */
function makeStairs(feature) {
  const group = new THREE.Group();
  const [minX, minZ] = feature.min;
  const [maxX, maxZ] = feature.max;
  const steps = feature.steps ?? 20;
  const width = maxX - minX;
  const run = (maxZ - minZ) / steps;
  const material = new THREE.MeshStandardMaterial({ color: feature.color ?? '#9c8f78', roughness: 0.9 });

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const y = feature.y0 + (feature.y1 - feature.y0) * t;
    const step = new THREE.Mesh(new THREE.BoxGeometry(width, Math.max(0.08, y), run), material);
    step.position.set((minX + maxX) / 2, Math.max(0.04, y / 2), minZ + run * (i + 0.5));
    group.add(step);
  }
  return group;
}

/** 유리 피라미드 (로비) */
function makePyramid(feature, roomHeight) {
  const group = new THREE.Group();
  const half = feature.base / 2;
  const geometry = new THREE.ConeGeometry(half * Math.SQRT2, feature.height, 4, 1, true);
  geometry.rotateY(Math.PI / 4);

  const glass = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: feature.color,
      emissive: new THREE.Color(feature.color),
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }),
  );
  glass.position.set(feature.position[0], roomHeight - feature.height / 2 + 0.2, feature.position[1]);
  group.add(glass);

  // 창살
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.ConeGeometry(half * Math.SQRT2, feature.height, 4, 6, true).rotateY(Math.PI / 4)),
    new THREE.LineBasicMaterial({ color: '#8e9bad', transparent: true, opacity: 0.6 }),
  );
  frame.position.copy(glass.position);
  group.add(frame);
  return group;
}

/** 바닥 원형 문양 (로비) */
function makeMedallion(feature) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(feature.radius - 0.35, feature.radius, 64),
    new THREE.MeshBasicMaterial({
      color: feature.color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(feature.position[0], 0.01, feature.position[1]);
  return mesh;
}

/** 반원통 볼트 천장 (그랑드 갤러리) */
function makeVault(feature, depth) {
  const geometry = new THREE.CylinderGeometry(
    feature.radius,
    feature.radius,
    feature.length ?? depth,
    28,
    1,
    true,
    0,
    Math.PI,
  );
  geometry.rotateZ(Math.PI / 2);
  geometry.rotateY(Math.PI / 2);

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: feature.color,
      emissive: new THREE.Color(feature.color),
      emissiveIntensity: 0.38,
      roughness: 1,
      side: THREE.BackSide,
    }),
  );
  mesh.position.y = feature.height;
  return mesh;
}

/** 관람 차단봉: 황동 기둥 + 가로봉 */
function makeBarrier(item) {
  const [sx, sy, sz] = item.size;
  const [px, pz] = item.position;
  const material = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.3, metalness: 0.85 });
  const group = new THREE.Group();

  const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.05, 0.05), material);
  rail.position.set(px, sy - 0.06, pz);
  group.add(rail);

  const postCount = Math.max(2, Math.round(sx / 1.6) + 1);
  for (let i = 0; i < postCount; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, sy - 0.06, 12), material);
    post.position.set(px - sx / 2 + (sx * i) / (postCount - 1), (sy - 0.06) / 2, pz);
    group.add(post);
  }
  return group;
}

/** 관람용 벤치 */
function makeBench(item) {
  const [sx, sy, sz] = item.size;
  const [px, pz] = item.position;
  const material = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.8 });
  const group = new THREE.Group();

  const seat = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.12, sz), material);
  seat.position.set(px, sy - 0.06, pz);
  group.add(seat);

  const long = sx >= sz;
  const legOffsets = long ? [-sx / 2 + 0.25, sx / 2 - 0.25] : [-sz / 2 + 0.25, sz / 2 - 0.25];
  for (const offset of legOffsets) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(long ? 0.16 : sx - 0.3, sy - 0.12, long ? sz - 0.3 : 0.16),
      material,
    );
    leg.position.set(px + (long ? offset : 0), (sy - 0.12) / 2, pz + (long ? 0 : offset));
    group.add(leg);
  }
  return group;
}

/** 캔버스로 만든 간단한 쪽모이 마루 텍스처 */
function makeParquetTexture(baseColor) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const base = new THREE.Color(baseColor);
  const plank = size / 4;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const shade = base.clone().multiplyScalar(0.84 + ((row * 7 + col * 3) % 5) * 0.07);
      ctx.fillStyle = `#${shade.getHexString()}`;
      const offset = row % 2 ? plank / 2 : 0;
      ctx.fillRect(col * plank + offset - plank, row * plank, plank - 2, plank - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
