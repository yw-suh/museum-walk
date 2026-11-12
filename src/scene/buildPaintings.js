import * as THREE from 'three';
import { anchorOnWall } from './buildRoom.js';

const CANVAS_GAP = 0.02; // 벽면과 캔버스 사이 간격(z-fighting 방지)
const ASPECT_WARN = 0.08; // 이미지 비율이 공식 치수와 8% 넘게 다르면 알린다

/**
 * paintings.json 의 작품들을 실제 치수(cm) 비율 그대로 벽에 건다.
 *
 * 걸이 높이(placement.centerHeight)와 감상 위치 거리(placement.viewFrom)는
 * src/data/catalog.js 가 rooms.json 의 규칙으로 미리 계산해 넘겨준다.
 *
 * @param {object[]} paintings 작품 데이터 (catalog.getPaintings 결과)
 * @param {Map<string, object>} wallIndex rooms.json 의 벽 정의
 * @param {object} room 방 데이터(조명·감상 위치 설정 사용)
 * @param {THREE.LoadingManager} [manager] 로딩 진행률을 받을 매니저
 * @returns {Promise<{ group: THREE.Group, targets: THREE.Mesh[] }>}
 *          targets 는 Raycaster 로 클릭 판정할 캔버스 메시 배열
 */
export async function buildPaintings(paintings, wallIndex, room, manager) {
  const group = new THREE.Group();
  const targets = [];
  const loader = new THREE.TextureLoader(manager);
  const spotConf = room.lighting.spot;
  const spotTexture = makeSpotTexture();

  const textures = await Promise.all(
    paintings.map((p) =>
      loader.loadAsync(p.image).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        return texture;
      }),
    ),
  );

  paintings.forEach((painting, i) => {
    const wall = wallIndex.get(painting.placement.wall);
    if (!wall) {
      console.warn(`[paintings] '${painting.placement.wall}' 벽을 rooms.json 에서 찾을 수 없습니다: ${painting.id}`);
      return;
    }

    const w = painting.size.widthCm / 100; // cm → m, 실제 비율 그대로
    const h = painting.size.heightCm / 100;
    const { position, rotationY, normal } = anchorOnWall(wall, painting.placement);

    const piece = new THREE.Group();
    piece.position.copy(position);
    piece.rotation.y = rotationY;

    // 캔버스: 조명에 좌우되지 않도록 Basic + 톤매핑 off (작품 색을 그대로 보여준다)
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: textures[i], toneMapped: false }),
    );
    canvas.position.z = CANVAS_GAP;
    canvas.userData.painting = painting;
    canvas.userData.normal = normal.clone();
    piece.add(canvas);
    targets.push(canvas);

    warnOnAspectMismatch(painting, textures[i]);

    piece.add(buildFrame(painting.frame, w, h));
    group.add(piece);

    group.add(buildViewingSpot(position, normal, painting.placement.viewFrom, room.viewingSpot, spotTexture));

    // 작품을 비추는 스포트 조명 (캔버스는 Basic 재질이라 벽·액자에만 영향을 준다)
    const standoff = THREE.MathUtils.clamp(h * 0.7, 1.4, 3.5); // 벽에서 띄우는 거리
    const spot = new THREE.SpotLight(
      spotConf.color,
      1,
      0,
      spotConf.angle,
      spotConf.penumbra,
      spotConf.decay,
    );
    spot.position.copy(position).addScaledVector(normal, standoff);
    spot.position.y = Math.min(room.dimensions.height - 0.5, position.y + h * 0.35 + 0.6);
    spot.target.position.copy(position);

    // decay=2 환경에서 작품 크기와 무관하게 비슷한 밝기가 되도록 거리²로 보정
    spot.intensity = spotConf.intensity * spot.position.distanceToSquared(position);
    group.add(spot, spot.target);
  });

  return { group, targets };
}

/**
 * 캔버스는 공식 치수대로 그린다. 이미지 비율이 공식 치수와 많이 다르면
 * 가로세로가 늘어나 보이므로 개발 중에만 알려 준다 (데이터 점검용).
 */
function warnOnAspectMismatch(painting, texture) {
  if (!import.meta.env.DEV) return;
  const image = texture.image;
  if (!image?.width) return;
  const official = painting.size.heightCm / painting.size.widthCm;
  const actual = image.height / image.width;
  const diff = Math.abs(actual - official) / official;
  if (diff > ASPECT_WARN) {
    console.warn(
      `[paintings] ${painting.id}: 이미지 비율(${actual.toFixed(3)})이 ` +
        `공식 치수 비율(${official.toFixed(3)})과 ${(diff * 100).toFixed(0)}% 다릅니다.`,
    );
  }
}

/** 캔버스를 두르는 네 개의 막대로 액자를 만든다. */
function buildFrame(frame, w, h) {
  const t = frame?.width ?? 0.1;
  const d = frame?.depth ?? 0.08;
  const material = new THREE.MeshStandardMaterial({
    color: frame?.color ?? '#4a3317',
    roughness: 0.38,
    metalness: 0.62,
  });

  const group = new THREE.Group();
  const bars = [
    { size: [w + t * 2, t, d], pos: [0, h / 2 + t / 2, d / 2] }, // 위
    { size: [w + t * 2, t, d], pos: [0, -h / 2 - t / 2, d / 2] }, // 아래
    { size: [t, h, d], pos: [-w / 2 - t / 2, 0, d / 2] }, // 왼쪽
    { size: [t, h, d], pos: [w / 2 + t / 2, 0, d / 2] }, // 오른쪽
  ];
  for (const bar of bars) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...bar.size), material);
    mesh.position.set(...bar.pos);
    group.add(mesh);
  }
  return group;
}

/** 작품 앞 바닥의 옅은 원 — "여기에 서면 알맞게 보입니다" 표시 */
function buildViewingSpot(position, normal, distance, conf, texture) {
  const marker = new THREE.Mesh(
    new THREE.PlaneGeometry(conf.radius * 2, conf.radius * 2),
    new THREE.MeshBasicMaterial({
      map: texture,
      color: conf.color,
      transparent: true,
      opacity: conf.opacity,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  marker.userData.kind = 'viewing-spot';
  marker.rotation.x = -Math.PI / 2;
  marker.position.copy(position).addScaledVector(normal, distance);
  marker.position.y = 0.012; // 바닥 바로 위
  marker.renderOrder = 1;
  return marker;
}

/** 가장자리가 부드럽게 사라지는 원형 텍스처 (모든 표시가 공유) */
function makeSpotTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 가운데는 비우고 테두리 쪽만 밝은 고리 — 발밑 표시처럼 보이게
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.26, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.9, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
