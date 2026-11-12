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

  // ── 천장 ──────────────────────────────────────────────────────────────────
  const vault = (room.features ?? []).find((f) => f.type === 'vault');
  if (vault) {
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

  // ── 로비 전용 장식 ────────────────────────────────────────────────────────
  for (const feature of room.features ?? []) {
    if (feature.type === 'pyramid') group.add(makePyramid(feature, height));
    if (feature.type === 'medallion') group.add(makeMedallion(feature));
  }

  // ── 포털(문 + 안내판) ─────────────────────────────────────────────────────
  const portalTargets = [];
  for (const portal of room.portals ?? []) {
    const wall = wallIndex.get(portal.wall);
    if (!wall) {
      console.warn(`[room] 포털 '${portal.id}' 의 벽 '${portal.wall}' 을 찾을 수 없습니다.`);
      continue;
    }
    const built = makePortal(portal, wall, trimMaterial.color);
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
function makePortal(portal, wall, trimColor) {
  const group = new THREE.Group();
  const anchor = anchorOnWall(wall, { ...portal, centerHeight: PORTAL.height / 2 });
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
