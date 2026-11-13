import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * sculptures.json 의 조각을 실제 높이 그대로 세운다.
 *
 * GLB 는 `npm run prepare-models` 가 만든 것으로, 이미
 *   · 실제 높이로 정규화되어 있고 (바닥 중앙이 원점)
 *   · meshopt 로 압축되어 있다 (디코더가 three 에 포함)
 * 모델은 **해당 공간에 들어올 때만** 내려받고, 나갈 때 RoomSession 이 해제한다.
 *
 * @returns {Promise<{ group: THREE.Group, targets: THREE.Mesh[] }>}
 */
export async function buildSculptures(sculptures, room, manager) {
  const group = new THREE.Group();
  const targets = [];
  if (!sculptures.length) return { group, targets };

  const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const spotConf = room.lighting.spot;

  const loaded = await Promise.all(sculptures.map((s) => loader.loadAsync(s.model)));

  sculptures.forEach((sculpture, i) => {
    const { position, rotationY = 0, pedestal, viewFrom } = sculpture.placement;
    const base = new THREE.Vector3(...position);

    const piece = new THREE.Group();
    piece.position.copy(base);
    piece.rotation.y = rotationY;

    const model = loaded[i].scene;
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.userData.sculpture = sculpture;
      targets.push(object);
    });
    piece.add(model);
    group.add(piece);

    if (pedestal) group.add(makePedestal(pedestal, base));

    // 측면 조명 두 개 — 한쪽은 세게, 반대쪽은 약하게 넣어 입체감을 만든다
    const heightM = sculpture.size.heightCm / 100;
    const front = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
    const right = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));
    const aim = base.clone().addScaledVector(new THREE.Vector3(0, 1, 0), heightM * 0.55);

    for (const [side, strength] of [
      [1, 1.0],
      [-1, 0.4],
    ]) {
      const spot = new THREE.SpotLight(
        spotConf.color,
        1,
        0,
        spotConf.angle,
        spotConf.penumbra,
        spotConf.decay,
      );
      spot.position
        .copy(base)
        .addScaledVector(front, 2.6)
        .addScaledVector(right, 2.8 * side)
        .setY(base.y + heightM * 1.05);
      spot.target.position.copy(aim);
      spot.intensity = spotConf.intensity * strength * spot.position.distanceToSquared(aim);
      group.add(spot, spot.target);
    }

    const floorY = base.y - (pedestal ? pedestal.size[1] : 0);
    group.add(makeViewingRing(base, floorY, viewFrom ?? 4, room.viewingSpot));
  });

  return { group, targets };
}

/** 받침대 — 조각 밑면이 position 높이에 오도록 그 아래에 놓는다 */
function makePedestal(pedestal, base) {
  const [sx, sy, sz] = pedestal.size;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshStandardMaterial({ color: pedestal.color ?? '#6f6a60', roughness: 0.88 }),
  );
  mesh.position.set(base.x, base.y - sy / 2, base.z);
  return mesh;
}

/** 조각 둘레를 한 바퀴 도는 옅은 원 — "이 거리에서 돌아보세요" 표시 */
function makeViewingRing(base, floorY, radius, conf) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.12, radius, 64),
    new THREE.MeshBasicMaterial({
      color: conf.color,
      transparent: true,
      opacity: conf.opacity * 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  ring.userData.kind = 'viewing-spot';
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(base.x, floorY + 0.015, base.z);
  ring.renderOrder = 1;
  return ring;
}
