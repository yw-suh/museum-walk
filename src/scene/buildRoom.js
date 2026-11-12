import * as THREE from 'three';

/**
 * rooms.json 의 한 방을 3D 지오메트리로 만든다.
 * @returns {{ group: THREE.Group, colliders: THREE.Box3[], wallIndex: Map<string, object> }}
 */
export function buildRoom(room) {
  const group = new THREE.Group();
  const colliders = [];
  const { width, depth, height } = room.dimensions;
  const c = room.materials;

  // ── 바닥 (쪽모이 마루 느낌의 절차적 텍스처) ───────────────────────────────
  const floorTexture = makeParquetTexture(c.floor);
  floorTexture.repeat.set(width / 3, depth / 3);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.72, metalness: 0.04 }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // ── 천장 (유리 천창을 흉내 낸 밝은 면) ────────────────────────────────────
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

    // 걸레받이(wainscot): 벽 아래쪽을 살짝 두껍게 둘러 깊이감을 준다
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

    // 금색 몰딩 한 줄
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

  // ── 집기 (관람 차단봉, 벤치) ──────────────────────────────────────────────
  for (const item of room.furniture ?? []) {
    const [sx, sy, sz] = item.size;
    const [px, pz] = item.position;

    group.add(item.type === 'barrier' ? makeBarrier(item) : makeBench(item));

    // 충돌 박스는 보이는 모양과 상관없이 데이터의 크기를 그대로 쓴다
    colliders.push(
      new THREE.Box3(
        new THREE.Vector3(px - sx / 2, 0, pz - sz / 2),
        new THREE.Vector3(px + sx / 2, sy, pz + sz / 2),
      ),
    );
  }

  return { group, colliders, wallIndex };
}

/** 관람 차단봉: 황동 기둥 + 가로봉 (실제 전시실의 스탠션을 흉내 냄) */
function makeBarrier(item) {
  const [sx, sy, sz] = item.size;
  const [px, pz] = item.position;
  const material = new THREE.MeshStandardMaterial({
    color: item.color,
    roughness: 0.3,
    metalness: 0.85,
  });

  const group = new THREE.Group();

  const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.05, 0.05), material);
  rail.position.set(px, sy - 0.06, pz);
  group.add(rail);

  const postCount = Math.max(2, Math.round(sx / 1.6) + 1);
  for (let i = 0; i < postCount; i++) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, sy - 0.06, 12),
      material,
    );
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

  for (const dx of [-sx / 2 + 0.25, sx / 2 - 0.25]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, sy - 0.12, sz - 0.3), material);
    leg.position.set(px + dx, (sy - 0.12) / 2, pz);
    group.add(leg);
  }
  return group;
}

/** 벽 박스의 [x, y, z] 크기 */
export function wallSize(wall) {
  return wall.axis === 'x'
    ? [wall.length, wall.height, wall.thickness]
    : [wall.thickness, wall.height, wall.length];
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
